package br.com.poporganize.shared

import kotlinx.coroutines.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Assert.*
import org.junit.Test

class PopStoreSyncTest {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true; explicitNulls = false }
    private val api = ApiTask(id = 1, serverId = "t1", title = "Original", dueDate = "2026-01-01", dueLabel = "2026-01-01")
    private fun initial() = PopState(currentUser = UserProfile("u1", "Ana", "ana@example.test"), apiToken = "fake-test-token",
        personalWorkspaceId = "p1", tasks = listOf(api.toPopTask(WorkspaceKind.Personal, null)), taskSyncBaselines = mapOf("p1" to listOf(api)))
    private inner class Platform(initial: PopState) : PopPlatformServices {
        override val platformName = "test"; override val supportsAppleSignIn = false; override val supportsGoogleSignIn = false
        var saved = json.encodeToString(initial)
        var tasksResponse = json.encodeToString(ApiTasksResponse(listOf(api)))
        val calls = mutableListOf<Pair<String, String?>>()
        var put: suspend (String?, String?) -> ApiResponse = { _, _ -> ApiResponse(200, "{\"ok\":true}") }
        var get: suspend () -> ApiResponse = { ApiResponse(200, tasksResponse) }
        override fun loadState() = saved
        override fun saveState(value: String) { saved = value }
        override suspend fun signInWithGoogle(): AuthResult = AuthResult.Cancelled
        override suspend fun signInWithApple(): AuthResult = AuthResult.Cancelled
        override suspend fun apiRequest(path: String, method: String, body: String?, token: String?, workspaceId: String?): ApiResponse {
            calls.add(method to workspaceId)
            return when {
                path == "workspaces" -> ApiResponse(200, "{\"workspaces\":[{\"id\":\"p1\",\"name\":\"Pessoal\",\"kind\":\"personal\",\"canCreateTasks\":true}]}")
                path == "auth/logout" -> ApiResponse(200, "{\"ok\":true}")
                method == "PUT" -> put(body, workspaceId)
                else -> get()
            }
        }
        override fun updateNotifications(tasks: List<PopTask>, firstName: String) {}
        override fun applyTheme(light: Boolean) {}
        override fun playActionSound() {}
        override fun openSupportEmail() {}
        override fun openExternalUrl(url: String) {}
    }
    @Test fun rejectedUploadStillReadsNewAssignments() = runBlocking {
        val platform = Platform(initial().copy(tasks = listOf(api.toPopTask(WorkspaceKind.Personal, null).copy(title = "Local"))))
        platform.put = { _, _ -> ApiResponse(403, "{\"error\":\"Recusado\"}") }
        platform.tasksResponse = json.encodeToString(ApiTasksResponse(listOf(api, api.copy(id = 2, serverId = "t2", title = "Nova atribuição"))))
        val store = PopStore(platform, CoroutineScope(Dispatchers.Unconfined))
        store.refreshFromServer()
        assertTrue(store.state.tasks.any { it.serverId == "t2" }); assertEquals("Local", store.state.tasks.first { it.serverId == "t1" }.title)
    }
    @Test fun malformedSuccessfulResponsePreservesLocalTasks() = runBlocking {
        val platform = Platform(initial()); platform.tasksResponse = "{}"
        val store = PopStore(platform, CoroutineScope(Dispatchers.Unconfined)); store.refreshFromServer()
        assertEquals(1, store.state.tasks.size); assertTrue(store.message.contains("inválida"))
    }
    @Test fun deletedTaskDoesNotReappearAfterServerRead() = runBlocking {
        val platform = Platform(initial().copy(tasks = emptyList(), pendingTaskDeletionsByWorkspace = mapOf("p1" to listOf("t1"))))
        platform.put = { _, _ -> platform.tasksResponse = "{\"tasks\":[]}"; ApiResponse(200,"{\"ok\":true}") }
        val store = PopStore(platform, CoroutineScope(Dispatchers.Unconfined)); store.refreshFromServer()
        assertTrue(store.state.tasks.isEmpty()); assertTrue(store.state.pendingTaskDeletionsByWorkspace["p1"].isNullOrEmpty())
    }
    @Test fun logoutDuringDownloadDoesNotRepopulatePreviousAccount() = runBlocking {
        val platform = Platform(initial()); val started = CompletableDeferred<Unit>(); val release = CompletableDeferred<Unit>()
        platform.get = { started.complete(Unit); release.await(); ApiResponse(200, platform.tasksResponse) }
        val store = PopStore(platform, CoroutineScope(Dispatchers.Unconfined))
        val refresh = launch { store.refreshFromServer() }; started.await(); store.signOut(); release.complete(Unit); refresh.join()
        assertNull(store.state.apiToken); assertTrue(store.state.tasks.isEmpty()); assertTrue(store.state.companies.isEmpty())
    }
    @Test fun editsMadeWhileDownloadIsInFlightArePreserved() = runBlocking {
        val platform = Platform(initial()); val started = CompletableDeferred<Unit>(); val release = CompletableDeferred<Unit>()
        platform.get = { started.complete(Unit); release.await(); ApiResponse(200, platform.tasksResponse) }
        val testScope = CoroutineScope(Dispatchers.Unconfined)
        val store = PopStore(platform, testScope)
        val refresh = launch { store.refreshFromServer() }; started.await()
        store.toggleTask("1"); release.complete(Unit); refresh.join()
        assertTrue(store.state.tasks.first().completed)
        testScope.cancel()
    }
    @Test fun logoutAndLoginRestoreUnsentChangesOnlyForTheirOwner() = runBlocking {
        val dirty = initial().copy(tasks = listOf(api.toPopTask(WorkspaceKind.Personal, null).copy(title = "Offline")))
        val platform = Platform(dirty); platform.get = { throw IllegalStateException("offline") }
        val store = PopStore(platform, CoroutineScope(Dispatchers.Unconfined)); store.signOut()
        assertTrue(store.state.tasks.isEmpty())
        store.signIn(UserProfile("u2", "Bia", "bia@example.test"), "other-fake-token")
        assertTrue(store.state.tasks.none { it.title == "Offline" })
        store.signOut(); store.signIn(UserProfile("u1", "Ana", "ana@example.test"), "new-fake-token")
        assertTrue(store.state.tasks.any { it.title == "Offline" })
    }
    @Test fun deletionQueuedDuringUploadIsNotAcknowledgedByThatUpload() = runBlocking {
        val second = api.copy(id = 2, serverId = "t2")
        val platform = Platform(initial().copy(tasks = listOf(second.toPopTask(WorkspaceKind.Personal, null)),
            taskSyncBaselines = mapOf("p1" to listOf(api, second)), pendingTaskDeletionsByWorkspace = mapOf("p1" to listOf("t1"))))
        platform.tasksResponse = json.encodeToString(ApiTasksResponse(listOf(second)))
        val started = CompletableDeferred<Unit>(); val release = CompletableDeferred<Unit>(); val holdNext = CompletableDeferred<Unit>()
        var count = 0
        platform.put = { _, _ ->
            count++
            if (count == 1) { started.complete(Unit); release.await() } else holdNext.await()
            ApiResponse(200, "{\"ok\":true}")
        }
        val testScope = CoroutineScope(Dispatchers.Unconfined)
        val store = PopStore(platform, testScope)
        val refresh = launch { store.refreshFromServer() }; started.await()
        store.deleteTask("2"); release.complete(Unit); refresh.join()
        assertEquals(listOf("t2"), store.state.pendingTaskDeletionsByWorkspace["p1"])
        testScope.cancel()
    }
    @Test fun malformedUploadConfirmationCannotAcknowledgeDeletion() = runBlocking {
        val platform = Platform(initial().copy(tasks = emptyList(), pendingTaskDeletionsByWorkspace = mapOf("p1" to listOf("t1"))))
        platform.put = { _, _ -> ApiResponse(200,"{}") }
        val store = PopStore(platform, CoroutineScope(Dispatchers.Unconfined)); store.refreshFromServer()
        assertEquals(listOf("t1"), store.state.pendingTaskDeletionsByWorkspace["p1"])
        assertTrue(store.state.tasks.isEmpty())
    }
    @Test fun revokedPermissionPreservesCopyForReviewAndAppliesServerVersion() = runBlocking {
        val platform = Platform(initial().copy(tasks = listOf(api.toPopTask(WorkspaceKind.Personal, null).copy(title = "Local"))))
        platform.put = { _, _ -> ApiResponse(403, "{\"error\":\"Recusado\"}") }
        platform.tasksResponse = json.encodeToString(ApiTasksResponse(listOf(api.copy(title = "Site", canEdit = false))))
        val store = PopStore(platform, CoroutineScope(Dispatchers.Unconfined)); store.refreshFromServer()
        assertEquals("Site", store.state.tasks.single().title)
        assertTrue(store.state.syncRecoveryTasks.any { it.title == "Local" })
    }
}
