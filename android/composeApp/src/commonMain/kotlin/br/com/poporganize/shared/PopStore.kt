package br.com.poporganize.shared

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.datetime.Clock
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.plus
import kotlinx.datetime.toLocalDateTime
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlin.math.absoluteValue
import kotlin.random.Random

class PopStore(private val platform: PopPlatformServices) {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    var state by mutableStateOf(
        restore(),
    )
        private set

    var message by mutableStateOf("Dados salvos neste ${platform.platformName}")
        private set

    /** Verdadeiro enquanto refreshNow() esta buscando dados; alimenta o puxar-para-atualizar. */
    var syncing by mutableStateOf(false)
        private set

    val selectedCompany: CompanyWorkspace?
        get() = state.companies.firstOrNull { it.id == state.selectedCompanyId }

    val visibleTasks: List<PopTask>
        get() = when (state.workspace) {
            WorkspaceKind.Personal -> state.tasks.filter { it.workspace == WorkspaceKind.Personal }
            WorkspaceKind.Company -> state.tasks.filter {
                it.workspace == WorkspaceKind.Company && it.companyId == state.selectedCompanyId
            }
        }

    val isCurrentUserAdmin: Boolean
        get() {
            if (state.workspace == WorkspaceKind.Personal) return true
            val email = state.currentUser?.email ?: return false
            return selectedCompany?.members
                ?.firstOrNull { it.email.equals(email, ignoreCase = true) }
                ?.role
                ?.contains("admin", ignoreCase = true) == true
        }

    /**
     * Permissoes do espaco ativo, como o servidor as resolveu. A interface deve consultar isto
     * antes de oferecer qualquer acao de escrita: sem sessao nao ha permissao nenhuma, e no modo
     * convidado so existe o espaco pessoal local.
     */
    val permissions: WorkspacePermissions
        get() = when {
            state.guestMode -> WorkspacePermissions(canCreateTasks = true)
            state.apiToken.isNullOrBlank() -> WorkspacePermissions()
            state.workspace == WorkspaceKind.Company -> selectedCompany?.permissions
                ?: WorkspacePermissions()
            else -> state.personalPermissions
        }

    init {
        publishNotifications()
    }

    fun finishOnboarding() = update { copy(onboardingComplete = true) }

    fun continueAsGuest() = update {
        copy(guestMode = true, currentUser = null, workspace = WorkspaceKind.Personal)
    }

    fun signIn(user: UserProfile, token: String) {
        update(sync = false) {
            copy(currentUser = user, guestMode = false, apiToken = token)
        }
        scope.launch { refreshFromServer() }
    }

    fun signOut() = update {
        copy(
            currentUser = null,
            guestMode = false,
            workspace = WorkspaceKind.Personal,
            selectedCompanyId = null,
            personalWorkspaceId = null,
            apiToken = null,
            companies = emptyList(),
            tasks = emptyList(),
            pendingDeletedServerIds = emptyList(),
        )
    }

    fun setTheme(theme: PopThemeMode) = update { copy(theme = theme) }

    fun selectPersonal() {
        update(sync = false) { copy(workspace = WorkspaceKind.Personal) }
        scope.launch { refreshTasks() }
    }

    fun selectCompany(companyId: String) {
        update(sync = false) { copy(workspace = WorkspaceKind.Company, selectedCompanyId = companyId) }
        scope.launch { refreshTasks() }
    }

    fun createCompany(name: String, description: String) {
        if (state.companies.size >= 3) return
        val token = state.apiToken ?: return
        scope.launch {
            val body = """{"action":"createCompany","name":${json.encodeToString(name.trim())},"description":${json.encodeToString(description.trim())}}"""
            val response = platform.apiRequest(path = "workspaces", method = "POST", body = body, token = token)
            if (response.successful) {
                refreshFromServer()
                message = "Empresa criada."
            } else {
                message = apiError(response, "Não foi possível criar a empresa.")
            }
        }
    }

    fun addTask(
        title: String,
        description: String,
        dueDate: String,
        dueTime: String,
        priority: Priority,
        assignment: AssignmentTarget,
        checklistTitles: List<String> = emptyList(),
        recurrence: RecurrenceKind = RecurrenceKind.None,
    ) {
        val taskId = newId("task")
        val task = PopTask(
            id = taskId,
            title = title.trim(),
            description = description.trim(),
            dueDate = dueDate.ifBlank { todayIso() },
            dueTime = dueTime.trim(),
            priority = priority,
            workspace = state.workspace,
            companyId = state.selectedCompanyId.takeIf { state.workspace == WorkspaceKind.Company },
            assignment = assignment,
            createdBy = state.currentUser?.name.orEmpty(),
            checklist = if (isCurrentUserAdmin) {
                checklistTitles.filter { it.isNotBlank() }.map {
                    ChecklistItem(id = newId("check"), title = it.trim())
                }
            } else {
                emptyList()
            },
            recurrence = recurrence,
            recurrenceSeriesId = taskId.takeIf { recurrence != RecurrenceKind.None },
        )
        update { copy(tasks = listOf(task) + tasks) }
        platform.playActionSound()
    }

    fun toggleTask(taskId: String) {
        update { copy(tasks = tasks.map { if (it.id == taskId) it.copy(completed = !it.completed) else it }) }
        platform.playActionSound()
    }

    fun deleteTask(taskId: String) {
        update {
            val removed = tasks.firstOrNull { it.id == taskId }
            copy(
                tasks = tasks.filterNot { it.id == taskId },
                pendingDeletedServerIds = removed?.serverId
                    ?.let { (pendingDeletedServerIds + it).distinct() }
                    ?: pendingDeletedServerIds,
            )
        }
        platform.playActionSound()
    }

    fun toggleChecklistItem(taskId: String, itemId: String) {
        if (!isCurrentUserAdmin) return
        update {
            copy(
                tasks = tasks.map { task ->
                    if (task.id != taskId) task
                    else task.copy(
                        checklist = task.checklist.map { item ->
                            if (item.id == itemId) item.copy(done = !item.done) else item
                        },
                    )
                },
            )
        }
        platform.playActionSound()
    }

    fun moveTask(taskId: String, assignment: AssignmentTarget) {
        update {
            copy(tasks = tasks.map { if (it.id == taskId) it.copy(assignment = assignment) else it })
        }
        platform.playActionSound()
    }

    fun deleteRecurringOccurrence(taskId: String) {
        update {
            copy(
                tasks = tasks.mapNotNull { task ->
                    if (task.id != taskId) return@mapNotNull task
                    val nextDate = nextRecurrenceDate(task.dueDate, task.recurrence)
                    if (nextDate == null) null else task.copy(dueDate = nextDate, completed = false)
                },
            )
        }
        platform.playActionSound()
    }

    fun deleteTaskSeries(taskId: String) {
        val task = state.tasks.firstOrNull { it.id == taskId } ?: return
        val seriesId = task.recurrenceSeriesId ?: task.id
        update {
            copy(tasks = tasks.filterNot { (it.recurrenceSeriesId ?: it.id) == seriesId })
        }
        platform.playActionSound()
    }

    fun addMember(name: String, email: String, role: String) {
        val sectorId = selectedCompany?.sectors?.firstOrNull()?.id
        if (sectorId == null) {
            message = "Cadastre um setor no painel web antes de convidar uma pessoa."
            return
        }
        mutateWorkspace(
            """{"action":"inviteEmployee","name":${json.encodeToString(name.trim())},"email":${json.encodeToString(email.trim())},"role":${json.encodeToString(role.trim())},"departmentId":${json.encodeToString(sectorId)},"groupIds":[]}""",
            "Convite enviado.",
        )
    }

    fun addSector(name: String, description: String) = mutateWorkspace(
        """{"action":"createDepartment","name":${json.encodeToString(name.trim())},"description":${json.encodeToString(description.trim())}}""",
        "Setor criado.",
    )

    fun addGroup(name: String, description: String) = mutateWorkspace(
        """{"action":"createGroup","name":${json.encodeToString(name.trim())},"description":${json.encodeToString(description.trim())}}""",
        "Grupo criado.",
    )

    fun updateMessage(value: String) {
        message = value
    }

    private fun updateSelectedCompany(transform: (CompanyWorkspace) -> CompanyWorkspace) {
        val selectedId = state.selectedCompanyId ?: return
        update { copy(companies = companies.map { if (it.id == selectedId) transform(it) else it }) }
    }

    private fun mutateWorkspace(body: String, successMessage: String) {
        val token = state.apiToken ?: return
        val workspaceId = state.selectedCompanyId ?: return
        scope.launch {
            val response = platform.apiRequest(
                path = "workspaces",
                method = "POST",
                body = body,
                token = token,
                workspaceId = workspaceId,
            )
            if (response.successful) {
                refreshFromServer()
                message = successMessage
            } else {
                message = apiError(response, "Não foi possível salvar o cadastro.")
            }
        }
    }

    private fun update(sync: Boolean = true, transform: PopState.() -> PopState) {
        state = state.transform()
        platform.saveState(json.encodeToString(state))
        publishNotifications()
        if (sync && !state.apiToken.isNullOrBlank()) scope.launch { syncTasks() }
    }

    private fun publishNotifications() {
        if (state.currentUser != null || state.guestMode) {
            platform.updateNotifications(state.tasks, state.currentUser?.firstName ?: "você")
        } else {
            platform.updateNotifications(emptyList(), "")
        }
    }

    private fun restore(): PopState {
        val saved = platform.loadState()
        if (!saved.isNullOrBlank()) {
            runCatching { json.decodeFromString<PopState>(saved) }.getOrNull()?.let { return it }
        }
        return PopState(
            tasks = listOf(
                PopTask(newId("task"), "Planejar minha semana", "Revisar prioridades e organizar os próximos dias.", todayIso(), priority = Priority.High),
                PopTask(newId("task"), "Organizar documentos", "Separar os documentos importantes.", todayIso(), priority = Priority.Medium),
            ),
        )
    }

    suspend fun requestEmailCode(email: String): String? {
        val response = platform.apiRequest(
            path = "auth/email/request-code",
            method = "POST",
            body = "{\"email\":${json.encodeToString(email.trim().lowercase())}}",
        )
        if (!response.successful) {
            return runCatching { json.decodeFromString<ApiError>(response.body).error }.getOrNull()
                ?: "Não foi possível enviar o código."
        }
        return null
    }

    suspend fun verifyEmailCode(email: String, code: String): String? {
        val response = platform.apiRequest(
            path = "auth/email/verify-code",
            method = "POST",
            body = "{\"email\":${json.encodeToString(email.trim().lowercase())},\"code\":${json.encodeToString(code)}}",
        )
        if (!response.successful) {
            return runCatching { json.decodeFromString<ApiError>(response.body).error }.getOrNull()
                ?: "Não foi possível confirmar o código."
        }
        val session = runCatching { json.decodeFromString<ApiSession>(response.body) }.getOrNull()
            ?: return "O servidor retornou uma sessão inválida."
        signIn(
            UserProfile(session.user.id, session.user.name, session.user.email, session.user.photoUrl),
            session.token,
        )
        return null
    }

    suspend fun completeSignIn(result: AuthResult): String? = when (result) {
        is AuthResult.Success -> {
            signIn(result.user, result.token)
            null
        }
        is AuthResult.Failure -> result.message
        AuthResult.Cancelled -> "Login cancelado"
    }

    suspend fun deleteAccount(): String? {
        val token = state.apiToken ?: return "Entre na conta antes de solicitar a exclusão."
        val response = platform.apiRequest(path = "account", method = "DELETE", token = token)
        if (!response.successful) {
            return runCatching { json.decodeFromString<ApiError>(response.body).error }.getOrNull()
                ?: "Não foi possível excluir a conta."
        }
        signOut()
        message = "Conta excluída."
        return null
    }

    /**
     * Recarrega espacos e tarefas sem exigir um escopo de corrotina de quem chama. Usado ao voltar
     * do segundo plano e no puxar-para-atualizar: ate agora o unico refresh acontecia no login, e
     * quem editasse pelo painel web nao via a mudanca no iPhone ate sair e entrar de novo.
     */
    fun refreshNow() {
        if (state.apiToken.isNullOrBlank() || syncing) return
        syncing = true
        scope.launch {
            try {
                refreshFromServer()
            } finally {
                syncing = false
            }
        }
    }

    suspend fun refreshFromServer() {
        val token = state.apiToken ?: return
        val response = platform.apiRequest(path = "workspaces", token = token)
        if (!response.successful) {
            message = runCatching { json.decodeFromString<ApiError>(response.body).error }.getOrNull()
                ?: "Falha ao carregar seus espaços."
            return
        }
        val remote = runCatching { json.decodeFromString<ApiWorkspaceResponse>(response.body) }.getOrNull()
            ?: return
        val personalId = remote.workspaces.firstOrNull { it.kind == "personal" }?.id
        val companies = remote.workspaces.filter { it.kind == "company" }.map { workspace ->
            CompanyWorkspace(
                id = workspace.id,
                name = workspace.name,
                description = workspace.description,
                members = workspace.employees.map { employee ->
                    CompanyMember(
                        id = employee.id,
                        name = employee.name,
                        email = employee.email,
                        role = employee.role,
                        sectorId = employee.sectorId.ifBlank { null },
                    )
                },
                sectors = workspace.sectors,
                groups = workspace.groups,
                permissions = workspace.toPermissions(),
            )
        }
        state = state.copy(
            personalWorkspaceId = personalId,
            personalPermissions = remote.workspaces.firstOrNull { it.kind == "personal" }
                ?.toPermissions()
                ?: state.personalPermissions,
            companies = companies,
            selectedCompanyId = state.selectedCompanyId?.takeIf { id -> companies.any { it.id == id } },
            workspace = if (state.workspace == WorkspaceKind.Company && companies.isEmpty()) WorkspaceKind.Personal else state.workspace,
        )
        persist()
        refreshTasks()
    }

    private suspend fun refreshTasks() {
        val token = state.apiToken ?: return
        val workspaceId = if (state.workspace == WorkspaceKind.Company) state.selectedCompanyId else state.personalWorkspaceId
        if (workspaceId.isNullOrBlank()) return
        val response = platform.apiRequest(path = "tasks", token = token, workspaceId = workspaceId)
        if (!response.successful) {
            message = runCatching { json.decodeFromString<ApiError>(response.body).error }.getOrNull()
                ?: "Falha ao sincronizar tarefas."
            return
        }
        val remote = runCatching { json.decodeFromString<ApiTasksResponse>(response.body) }.getOrNull() ?: return
        val kind = state.workspace
        val companyId = state.selectedCompanyId.takeIf { kind == WorkspaceKind.Company }
        val otherTasks = state.tasks.filterNot {
            it.workspace == kind && (kind == WorkspaceKind.Personal || it.companyId == companyId)
        }
        state = state.copy(tasks = otherTasks + remote.tasks.map { it.toPopTask(kind, companyId) })
        message = "Dados sincronizados"
        persist()
        publishNotifications()
    }

    private suspend fun syncTasks() {
        val token = state.apiToken ?: return
        val workspaceId = if (state.workspace == WorkspaceKind.Company) state.selectedCompanyId else state.personalWorkspaceId
        if (workspaceId.isNullOrBlank()) return
        val payload = ApiTasksPayload(
            tasks = visibleTasks.map { it.toApiTask() },
            deletedServerIds = state.pendingDeletedServerIds,
        )
        val response = platform.apiRequest(
            path = "tasks",
            method = "PUT",
            body = json.encodeToString(payload),
            token = token,
            workspaceId = workspaceId,
        )
        if (response.successful) {
            state = state.copy(pendingDeletedServerIds = emptyList())
            persist()
            refreshTasks()
        } else {
            message = runCatching { json.decodeFromString<ApiError>(response.body).error }.getOrNull()
                ?: "Alterações salvas no aparelho; sincronização pendente."
        }
    }

    private fun persist() = platform.saveState(json.encodeToString(state))

    private fun apiError(response: ApiResponse, fallback: String): String =
        runCatching { json.decodeFromString<ApiError>(response.body).error }.getOrNull() ?: fallback
}

private fun ApiWorkspace.toPermissions() = WorkspacePermissions(
    isOwner = isOwner,
    canCreateTasks = canCreateTasks,
    canAssignTasks = canAssignTasks,
    canManageEmployees = canManageEmployees,
    canManageDepartments = canManageDepartments,
    canManageGroups = canManageGroups,
    canManagePermissions = canManagePermissions,
)

private fun ApiTask.toPopTask(kind: WorkspaceKind, companyId: String?) = PopTask(
    id = id.toString(),
    serverId = serverId,
    title = title,
    description = description,
    dueDate = dueDate,
    dueTime = dueTime,
    priority = Priority.entries.firstOrNull { it.label.equals(priority, ignoreCase = true) } ?: Priority.Medium,
    completed = completed,
    workspace = kind,
    companyId = companyId,
    assignment = AssignmentTarget(
        kind = when (assignmentType) {
            "user" -> AssignmentKind.Person
            "department" -> AssignmentKind.Sector
            "group" -> AssignmentKind.Group
            else -> AssignmentKind.None
        },
        id = assignmentTargetId,
        label = assignmentTargetLabel ?: assignee.ifBlank { "Sem responsável" },
    ),
    createdBy = createdBy,
    checklist = checklist,
    recurrence = when (recurrenceRule) {
        "Diária" -> RecurrenceKind.Daily
        "Semanal" -> RecurrenceKind.Weekly
        "Mensal" -> RecurrenceKind.Monthly
        "Anual" -> RecurrenceKind.Yearly
        else -> RecurrenceKind.None
    },
)

private fun PopTask.toApiTask() = ApiTask(
    id = id.toIntOrNull() ?: id.hashCode().absoluteValue.coerceAtLeast(1),
    serverId = serverId,
    title = title,
    department = if (workspace == WorkspaceKind.Personal) "Pessoal" else assignment.label,
    dueLabel = dueDate,
    priority = priority.label,
    dueDate = dueDate,
    completed = completed,
    description = description,
    assignee = assignment.label,
    createdBy = createdBy,
    recurrence = recurrence.toServerRule(),
    dueTime = dueTime,
    recurrenceRule = recurrence.toServerRule(),
    assignmentType = when (assignment.kind) {
        AssignmentKind.Person -> "user"
        AssignmentKind.Sector -> "department"
        AssignmentKind.Group -> "group"
        AssignmentKind.None -> if (workspace == WorkspaceKind.Company) "company" else "user"
    },
    assignmentTargetId = assignment.id,
    assignmentTargetLabel = assignment.label,
    checklist = checklist,
)

/**
 * "Nao repetir" e a palavra que o servidor entende para ausencia de recorrencia -- "Sem
 * recorrencia", o label do enum, nao aparece em lugar nenhum do mobile-api.server.ts.
 *
 * A diferenca nao era cosmetica. Em mobileTaskRecurrence() a guarda testa exatamente
 * `item.recurrenceRule === "Nao repetir"`; recebendo "Sem recorrencia" ela nao dispara, nenhum dos
 * ramos (Diaria/Semanal/Mensal/Anual) casa, e a funcao cai no return final, que devolve uma
 * recorrencia *custom diaria*. Como o PUT de tarefas faz `existing.recurrence =
 * mobileTaskRecurrence(item)` sem condicao, toda tarefa comum sincronizada pelo iPhone viraria uma
 * tarefa que se repete todo dia -- inclusive para quem abre pelo Android ou pelo painel.
 */
private fun RecurrenceKind.toServerRule(): String = when (this) {
    RecurrenceKind.None -> "Não repetir"
    else -> label
}

internal fun todayIso(): String = Clock.System.now()
    .toLocalDateTime(TimeZone.currentSystemDefault())
    .date
    .toString()

private fun nextRecurrenceDate(value: String, recurrence: RecurrenceKind): String? {
    if (recurrence == RecurrenceKind.None) return null
    val date = runCatching { LocalDate.parse(value) }.getOrNull() ?: return null
    val period = when (recurrence) {
        RecurrenceKind.Daily -> DatePeriod(days = 1)
        RecurrenceKind.Weekly -> DatePeriod(days = 7)
        RecurrenceKind.Monthly -> DatePeriod(months = 1)
        RecurrenceKind.Yearly -> DatePeriod(years = 1)
        RecurrenceKind.None -> return null
    }
    return date.plus(period).toString()
}

internal fun greetingForCurrentTime(): String = when (
    Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).hour
) {
    in 5..11 -> "Bom dia"
    in 12..17 -> "Boa tarde"
    else -> "Boa noite"
}

internal fun newId(prefix: String): String = "$prefix-${Clock.System.now().toEpochMilliseconds()}-${Random.nextInt(1000, 9999)}"
