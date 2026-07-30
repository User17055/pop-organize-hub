package br.com.poporganize.shared

import kotlinx.serialization.Serializable

@Serializable
enum class PopThemeMode { Light, Dark }

@Serializable
enum class WorkspaceKind { Personal, Company }

@Serializable
enum class Priority(val label: String) {
    Low("Baixa"),
    Medium("Média"),
    High("Alta"),
    Urgent("Urgente"),
}

@Serializable
enum class AssignmentKind(val label: String) {
    None("Sem responsável"),
    Person("Pessoa"),
    Sector("Setor"),
    Group("Grupo"),
}

@Serializable
enum class RecurrenceKind(val label: String) {
    None("Sem recorrência"),
    Daily("Diária"),
    Weekly("Semanal"),
    Monthly("Mensal"),
}

@Serializable
data class ChecklistItem(
    val id: String,
    val title: String,
    val done: Boolean = false,
)

@Serializable
data class AssignmentTarget(
    val kind: AssignmentKind = AssignmentKind.None,
    val id: String? = null,
    val label: String = "Sem responsável",
)

@Serializable
data class UserProfile(
    val id: String,
    val name: String,
    val email: String,
    val avatarUrl: String? = null,
) {
    val firstName: String get() = name.trim().substringBefore(' ').ifBlank { "você" }
}

@Serializable
data class CompanyMember(
    val id: String,
    val name: String,
    val email: String,
    val role: String = "Colaborador",
    val sectorId: String? = null,
)

@Serializable
data class CompanySector(
    val id: String,
    val name: String,
    val description: String = "",
)

@Serializable
data class CompanyGroup(
    val id: String,
    val name: String,
    val description: String = "",
    val memberIds: List<String> = emptyList(),
)

@Serializable
data class CompanyWorkspace(
    val id: String,
    val name: String,
    val description: String = "",
    val members: List<CompanyMember> = emptyList(),
    val sectors: List<CompanySector> = emptyList(),
    val groups: List<CompanyGroup> = emptyList(),
)

@Serializable
data class PopTask(
    val id: String,
    val title: String,
    val description: String = "",
    val dueDate: String,
    val dueTime: String = "",
    val priority: Priority = Priority.Medium,
    val completed: Boolean = false,
    val workspace: WorkspaceKind = WorkspaceKind.Personal,
    val companyId: String? = null,
    val assignment: AssignmentTarget = AssignmentTarget(),
    val createdBy: String = "",
    val checklist: List<ChecklistItem> = emptyList(),
    val recurrence: RecurrenceKind = RecurrenceKind.None,
    val recurrenceSeriesId: String? = null,
)

@Serializable
data class PopState(
    val onboardingComplete: Boolean = false,
    val currentUser: UserProfile? = null,
    val guestMode: Boolean = false,
    val theme: PopThemeMode = PopThemeMode.Dark,
    val workspace: WorkspaceKind = WorkspaceKind.Personal,
    val selectedCompanyId: String? = null,
    val companies: List<CompanyWorkspace> = emptyList(),
    val tasks: List<PopTask> = emptyList(),
)

sealed interface AuthResult {
    data class Success(val user: UserProfile) : AuthResult
    data class Failure(val message: String) : AuthResult
    data object Cancelled : AuthResult
}

interface PopPlatformServices {
    val platformName: String
    val supportsAppleSignIn: Boolean

    fun loadState(): String?
    fun saveState(value: String)
    suspend fun signInWithGoogle(): AuthResult
    suspend fun signInWithApple(): AuthResult
    fun updateNotifications(tasks: List<PopTask>, firstName: String)
    fun applyTheme(light: Boolean)
    fun playActionSound()
    fun openSupportEmail()
}
