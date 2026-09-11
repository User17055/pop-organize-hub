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
    val canViewCalendar: Boolean = false,
    val canViewGroups: Boolean = false,
    val canViewDepartments: Boolean = false,
    val canViewReports: Boolean = false,
    val canViewEmployees: Boolean = false,
    val canViewCompany: Boolean = false,
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

    // So de leitura, vindos do servidor. Ver a nota no ApiTask sobre por que nao sao cofre.
    val requiresReview: Boolean = false,
    val isReviewer: Boolean = false,
    val awaitingReview: Boolean = false,
    val recurrenceExcludedDates: List<String> = emptyList(),

    // Do servidor, e usados para NAO oferecer o que ele vai recusar. Ver a nota no ApiTask sobre o
    // default `true`.
    //
    // `canEdit` existe no ApiTask e NAO foi trazido para ca de proposito: nao ha tela de editar
    // tarefa existente neste app, entao ele nao teria consumidor. Campo carregado sem uso apodrece
    // -- quando a tela existir, ele desce em uma linha.
    val canComplete: Boolean = true,
    val canDelete: Boolean = true,

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

    // Os horarios do dia, quando a serie repete mais de uma vez por dia. Entra no cofre pela mesma
    // razao dos seis acima. Ver a nota no ApiTask sobre as tres regras do schema e sobre por que
    // este NAO e nulavel, ao contrario do `assignees`.
    val recurrenceTimes: List<String> = emptyList(),

    // Segundo cofre, mesma ideia do de cima e pelo mesmo motivo: o PUT reescreve sem condicao, e o
    // que o iPhone nao carregar volta como default do construtor e apaga o que estava la -- para o
    // Android e para o painel tambem.
    //
    // A diferenca em relacao a recorrencia e que estes CINCO CAMPOS JA EXISTIAM no ApiTask. Nunca
    // faltaram no fio: faltavam aqui. O toApiTask() os reconstruia do zero a cada sincronizacao,
    // entao o app vinha mandando "Sem lembrete", "" e "Sem duracao" por cima do que o servidor
    // guardava, sem nunca ter lido o valor real.
    //
    // O iPhone nao interpreta nenhum deles. So carrega e devolve.
    val assignee: String = "",
    val assignees: List<String>? = null,
    val assignedBy: String = "",
    val reminder: String = "Sem lembrete",
    val attachmentName: String = "",
    val duration: String = "Sem duração",
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
    val canViewCalendar: Boolean = false,
    val canViewGroups: Boolean = false,
    val canViewDepartments: Boolean = false,
    val canViewReports: Boolean = false,
    val canViewEmployees: Boolean = false,
    val canViewCompany: Boolean = false,
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
    // NULO de proposito, e nunca lista vazia. O servidor faz
    // `Array.isArray(item.assignees) ? item.assignees : [item.assignee]`, e `Array.isArray([])` e
    // `true` -- mandar `[]` entraria no primeiro ramo com zero nomes e gravaria
    // `responsibleIds = []`, apagando os responsaveis de toda tarefa sincronizada. Com nulo e
    // `explicitNulls = false` a chave sai do JSON, o `.optional()` do zod aceita a ausencia, e o
    // servidor cai no ramo de tras, que e o comportamento que ja existia.
    val assignees: List<String>? = null,
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

    // Os horarios de uma tarefa que repete varias vezes ao dia, ate 12. O servidor manda em
    // `taskToMobileTask` e LE DE VOLTA em `mobileTaskRecurrence` (`times: item.recurrenceTimes`),
    // no ramo "Diaria". Sem este campo o iPhone apagava os horarios de toda tarefa diaria que
    // sincronizasse -- o quarto caso da mesma familia, depois da recorrencia, do `assignees` e dos
    // campos de lembrete, anexo e duracao.
    //
    // NAO e nulavel, ao contrario do `assignees` acima, e a assimetria convida ao erro: o zod
    // deste campo tem `.optional().default([])`, entao omitir a chave e mandar lista vazia caem no
    // MESMO lugar. Nao existe ramo de tras para cair, como havia no `assignees`. O que preserva o
    // dado aqui nao e o nulo -- e carregar o valor verdadeiro e devolve-lo intacto.
    //
    // TRES REGRAS NO SCHEMA, e a terceira ja derrubou a sincronizacao inteira uma vez:
    //
    //   1. regex ^([01]\d|2[0-3]):[0-5]\d$ -- string fora de HH:MM reprova;
    //   2. `.max(12)` -- teto rigido;
    //   3. `.refine(t => t.length === 0 || t.length >= 2)` -- "informe pelo menos dois horarios,
    //      ou nenhum". LISTA DE UM ELEMENTO E RECUSADA. E como `tasks` e um array, um item ruim
    //      reprova a CARGA TODA e nada sincroniza. Foi assim que este campo travou tudo antes
    //      (ver o comentario do toggleTask, no PopStore).
    //
    // Por isso aqui e cofre PURO: entra como veio, sai como veio. O valor do servidor ja satisfaz
    // as tres. **Nunca montar esta lista no app** -- em especial nunca `listOf(dueTime)`, que e o
    // atalho obvio e cai direto na regra 3.
    val recurrenceTimes: List<String> = emptyList(),
    val assignmentType: String? = null,
    val assignmentTargetId: String? = null,
    val assignmentTargetLabel: String? = null,
    val checklist: List<ChecklistItem> = emptyList(),

    // OS QUATRO ABAIXO SAO SO DE LEITURA, e por isso nao sao cofre. O servidor os recalcula a
    // cada resposta e os DESCARTA na volta: o mobileTaskSchema nao os declara, e um z.object sem
    // .strict() ignora campo desconhecido em vez de recusar. Nao ha dado do usuario a preservar
    // aqui -- ao contrario dos dois cofres acima, onde nao carregar o valor o apagava.
    //
    // requiresReview e isReviewer existem porque a tarefa que aguarda revisao chegava como
    // pendente: a pessoa marcava, o servidor a devolvia para "waiting_review", a leitura seguinte
    // trazia completed = false e a marcacao parecia voltar sozinha. Sem estes dois o app nao
    // consegue nem avisar antes nem explicar depois -- e o resultado ainda MUDA POR PESSOA,
    // porque quem e o revisor cai no outro ramo do servidor e para ele a conclusao funciona.
    val requiresReview: Boolean = false,
    val isReviewer: Boolean = false,

    // `requiresReview` sozinho nao basta: ele e verdadeiro tanto na tarefa que ninguem tocou
    // quanto na que ja esta esperando o revisor, e as duas chegam com `completed = false`. Este
    // diz qual das duas. Booleano, e nao o status cru, para nao trazer mais uma string de estado
    // para o fio -- palavra que so existe de um lado e a familia de bug mais cara daqui.
    val awaitingReview: Boolean = false,

    // recurrenceSeriesId e o `recurrenceParentId ?: id` do servidor. Sem ele "toda a recorrencia"
    // casava exatamente UMA tarefa e parecia ter acertado.
    //
    // recurrenceExcludedDates sao as datas que o materializeRecurringTasks nao recria. O app so
    // precisa LER: quem registra a exclusao e o proprio servidor, ao apagar a ocorrencia. Nao
    // montar esta lista aqui nem tentar devolve-la.
    val recurrenceSeriesId: String = "",
    val recurrenceExcludedDates: List<String> = emptyList(),

    // O que o SERVIDOR diz que esta pessoa pode fazer com esta tarefa. Ele ja mandava os tres desde
    // sempre e o app ignorava os tres, decidindo por conta propria -- nao era perda de dado (o
    // servidor recalcula na escrita e nunca confia no que o aparelho manda), era divergencia
    // esperando acontecer: oferecer um botao que o servidor vai recusar.
    //
    // DEFAULT `true`, e isso importa mais do que parece. Contra servidor desatualizado as chaves
    // nao vem, o kotlinx aplica o default, e o app precisa se comportar como se comportava antes --
    // nao travar todas as acoes de todo mundo. Default `false` aqui seria uma regressao silenciosa
    // em toda instalacao que falasse com um servidor antigo.
    val canEdit: Boolean = true,
    val canComplete: Boolean = true,
    val canDelete: Boolean = true,
)

@Serializable
data class ApiTasksPayload(
    val tasks: List<ApiTask>,
    val deletedServerIds: List<String> = emptyList(),
)
