package br.com.poporganize.shared

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.datetime.Clock
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlin.random.Random

class PopStore(private val platform: PopPlatformServices) {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    var state by mutableStateOf(
        restore().copy(workspace = WorkspaceKind.Personal, selectedCompanyId = null),
    )
        private set

    var message by mutableStateOf("Dados salvos neste ${platform.platformName}")
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

    init {
        publishNotifications()
    }

    fun finishOnboarding() = update { copy(onboardingComplete = true) }

    fun continueAsGuest() = update {
        copy(guestMode = true, currentUser = null, workspace = WorkspaceKind.Personal)
    }

    fun signIn(user: UserProfile) = update {
        copy(currentUser = user, guestMode = false)
    }

    fun signOut() = update {
        copy(currentUser = null, guestMode = false, workspace = WorkspaceKind.Personal, selectedCompanyId = null)
    }

    fun setTheme(theme: PopThemeMode) = update { copy(theme = theme) }

    fun selectPersonal() = update { copy(workspace = WorkspaceKind.Personal) }

    fun selectCompany(companyId: String) = update {
        copy(workspace = WorkspaceKind.Company, selectedCompanyId = companyId)
    }

    fun createCompany(name: String, description: String) {
        val company = CompanyWorkspace(
            id = newId("company"),
            name = name.trim(),
            description = description.trim(),
            members = state.currentUser?.let {
                listOf(CompanyMember(newId("member"), it.name, it.email, "Administrador"))
            }.orEmpty(),
        )
        update {
            copy(
                companies = companies + company,
                workspace = WorkspaceKind.Company,
                selectedCompanyId = company.id,
            )
        }
    }

    fun addTask(
        title: String,
        description: String,
        dueDate: String,
        dueTime: String,
        priority: Priority,
        assignment: AssignmentTarget,
    ) {
        val task = PopTask(
            id = newId("task"),
            title = title.trim(),
            description = description.trim(),
            dueDate = dueDate.ifBlank { todayIso() },
            dueTime = dueTime.trim(),
            priority = priority,
            workspace = state.workspace,
            companyId = state.selectedCompanyId.takeIf { state.workspace == WorkspaceKind.Company },
            assignment = assignment,
            createdBy = state.currentUser?.name.orEmpty(),
        )
        update { copy(tasks = listOf(task) + tasks) }
        platform.playActionSound()
    }

    fun toggleTask(taskId: String) {
        update { copy(tasks = tasks.map { if (it.id == taskId) it.copy(completed = !it.completed) else it }) }
        platform.playActionSound()
    }

    fun deleteTask(taskId: String) {
        update { copy(tasks = tasks.filterNot { it.id == taskId }) }
        platform.playActionSound()
    }

    fun addMember(name: String, email: String, role: String) = updateSelectedCompany { company ->
        company.copy(members = company.members + CompanyMember(newId("member"), name.trim(), email.trim(), role.trim()))
    }

    fun addSector(name: String, description: String) = updateSelectedCompany { company ->
        company.copy(sectors = company.sectors + CompanySector(newId("sector"), name.trim(), description.trim()))
    }

    fun addGroup(name: String, description: String) = updateSelectedCompany { company ->
        company.copy(groups = company.groups + CompanyGroup(newId("group"), name.trim(), description.trim()))
    }

    fun updateMessage(value: String) {
        message = value
    }

    private fun updateSelectedCompany(transform: (CompanyWorkspace) -> CompanyWorkspace) {
        val selectedId = state.selectedCompanyId ?: return
        update { copy(companies = companies.map { if (it.id == selectedId) transform(it) else it }) }
    }

    private fun update(transform: PopState.() -> PopState) {
        state = state.transform()
        platform.saveState(json.encodeToString(state))
        publishNotifications()
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
}

internal fun todayIso(): String = Clock.System.now()
    .toLocalDateTime(TimeZone.currentSystemDefault())
    .date
    .toString()

internal fun greetingForCurrentTime(): String = when (
    Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).hour
) {
    in 5..11 -> "Bom dia"
    in 12..17 -> "Boa tarde"
    else -> "Boa noite"
}

internal fun newId(prefix: String): String = "$prefix-${Clock.System.now().toEpochMilliseconds()}-${Random.nextInt(1000, 9999)}"
