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

    // O servidor manda "Anual" e o Android sempre soube ler. Sem esta entrada, toPopTask() caia no
    // else e uma tarefa anual virava "sem recorrência" no iPhone, calada: sumia o selo, o menu de
    // exclusão perdia a opção "toda a recorrência" e o app devolvia a tarefa ao servidor com a
    // recorrência apagada.
    Yearly("Anual"),
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

/**
 * Quem pode o que dentro de um espaco. O servidor resolve isso a partir dos grupos de permissao
 * e ja mandava os campos em /workspaces; o aplicativo e que os descartava e decidia sozinho por
 * heuristica no cargo. A fonte da verdade e o servidor.
 */
@Serializable
data class WorkspacePermissions(
    val isOwner: Boolean = false,
    val canCreateTasks: Boolean = false,
    val canAssignTasks: Boolean = false,
    val canManageEmployees: Boolean = false,
    val canManageDepartments: Boolean = false,
    val canManageGroups: Boolean = false,
    val canManagePermissions: Boolean = false,
)

@Serializable
data class CompanyWorkspace(
    val id: String,
    val name: String,
    val description: String = "",
    val members: List<CompanyMember> = emptyList(),
    val sectors: List<CompanySector> = emptyList(),
    val groups: List<CompanyGroup> = emptyList(),
    val permissions: WorkspacePermissions = WorkspacePermissions(),
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
    val serverId: String? = null,

    // Cofre da recorrencia: as palavras do servidor, guardadas cruas e devolvidas intactas.
    //
    // O RecurrenceKind acima so consegue representar quatro casos, e o servidor guarda mais: de
    // quanto em quanto tempo repete, ate quando, em que dia do mes, e um tipo "Personalizada" que
    // nao tem equivalente nenhum aqui. Como o PUT de tarefas reescreve a recorrencia a partir do
    // que o aparelho manda, tudo que nao fosse transportado voltava como default e apagava o
    // original -- "a cada 2 semanas ate 31/12" virava "toda semana, para sempre", e uma
    // "Personalizada" perdia a repeticao por completo, tambem para quem abre no Android.
    //
    // O iPhone nao interpreta nem exibe estes campos. So os carrega.
    val recurrenceRule: String = "Não repetir",
    val recurrenceDetail: String = "",
    val recurrenceInterval: Int = 1,
    val recurrenceEndMode: String = "Nunca",
    val recurrenceEndValue: String = "",
    val recurrenceOccurrence: Int = 1,
)

@Serializable
data class PopState(
    val onboardingComplete: Boolean = false,
    val currentUser: UserProfile? = null,
    val guestMode: Boolean = false,
    val theme: PopThemeMode = PopThemeMode.Dark,
    val workspace: WorkspaceKind = WorkspaceKind.Personal,
    val selectedCompanyId: String? = null,
    val personalWorkspaceId: String? = null,
    val personalPermissions: WorkspacePermissions = WorkspacePermissions(canCreateTasks = true),
    val companies: List<CompanyWorkspace> = emptyList(),
    val tasks: List<PopTask> = emptyList(),
    val apiToken: String? = null,
    val pendingDeletedServerIds: List<String> = emptyList(),
)

sealed interface AuthResult {
    data class Success(val user: UserProfile, val token: String) : AuthResult
    data class Failure(val message: String) : AuthResult
    data object Cancelled : AuthResult
}

interface PopPlatformServices {
    val platformName: String
    val supportsAppleSignIn: Boolean
    val supportsGoogleSignIn: Boolean

    fun loadState(): String?
    fun saveState(value: String)
    suspend fun signInWithGoogle(): AuthResult
    suspend fun signInWithApple(): AuthResult
    suspend fun apiRequest(
        path: String,
        method: String = "GET",
        body: String? = null,
        token: String? = null,
        workspaceId: String? = null,
    ): ApiResponse
    fun updateNotifications(tasks: List<PopTask>, firstName: String)

    /**
     * Avisa quando o aplicativo volta do segundo plano, para recarregar os dados do servidor.
     * Tem corpo vazio de proposito: o Android nao consome este modulo e nao pode ser obrigado a
     * implementar o metodo so para continuar compilando.
     */
    fun observeForeground(onForeground: () -> Unit) {}

    fun applyTheme(light: Boolean)
    fun playActionSound()
    fun openSupportEmail()
    fun openExternalUrl(url: String)
}

data class ApiResponse(val status: Int, val body: String) {
    val successful: Boolean get() = status in 200..299
}

@Serializable
data class ApiUser(
    val id: String,
    val name: String,
    val email: String,
    val photoUrl: String = "",
)

@Serializable
data class ApiSession(
    val token: String,
    val user: ApiUser,
)

@Serializable
data class ApiError(val error: String = "Não foi possível concluir a operação.")

@Serializable
data class ApiWorkspaceResponse(val workspaces: List<ApiWorkspace> = emptyList())

@Serializable
data class ApiWorkspace(
    val id: String,
    val name: String,
    val description: String = "",
    val kind: String = "company",
    val isOwner: Boolean = false,
    val canCreateTasks: Boolean = false,
    val canAssignTasks: Boolean = false,
    val canManageEmployees: Boolean = false,
    val canManageDepartments: Boolean = false,
    val canManageGroups: Boolean = false,
    val canManagePermissions: Boolean = false,
    val employees: List<ApiEmployee> = emptyList(),
    val sectors: List<CompanySector> = emptyList(),
    val groups: List<CompanyGroup> = emptyList(),
)

@Serializable
data class ApiEmployee(
    val id: String,
    val name: String,
    val email: String,
    val role: String = "Colaborador",
    val sectorId: String = "",
)

@Serializable
data class ApiTasksResponse(val tasks: List<ApiTask> = emptyList())

@Serializable
data class ApiTask(
    val id: Int,
    val serverId: String? = null,
    val title: String,
    val department: String = "Pessoal",
    val dueLabel: String = "",
    val priority: String = "Média",
    val dueDate: String,
    val completed: Boolean = false,
    val description: String = "",
    val assignee: String = "",
    val assignedBy: String = "",
    val createdBy: String = "",
    val recurrence: String = "Não repetir",
    val reminder: String = "Sem lembrete",
    val attachmentName: String = "",
    val dueTime: String = "",
    val duration: String = "Sem duração",
    val recurrenceRule: String = "Não repetir",
    val recurrenceDetail: String = "",
    val recurrenceInterval: Int = 1,
    val recurrenceEndMode: String = "Nunca",
    val recurrenceEndValue: String = "",
    val recurrenceOccurrence: Int = 1,
    val assignmentType: String? = null,
    val assignmentTargetId: String? = null,
    val assignmentTargetLabel: String? = null,
    val checklist: List<ChecklistItem> = emptyList(),
)

@Serializable
data class ApiTasksPayload(
    val tasks: List<ApiTask>,
    val deletedServerIds: List<String> = emptyList(),
)
