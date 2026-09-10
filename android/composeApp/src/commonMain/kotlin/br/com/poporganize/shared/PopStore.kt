package br.com.poporganize.shared

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.datetime.Clock
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlin.math.absoluteValue
import kotlin.random.Random

class PopStore(private val platform: PopPlatformServices) {
    // As tres bandeiras sao necessarias JUNTAS, e nenhuma delas pode sair sozinha.
    //
    // `encodeDefaults = true` precisa ficar: o mobileTaskSchema tem 18 campos estritamente
    // obrigatorios (sem .optional() e sem .default()) que no ApiTask tem valor padrao --
    // description "", completed false, dueTime "", reminder "Sem lembrete", recurrenceInterval 1,
    // e mais. Sem a bandeira, toda tarefa comum omitiria essas chaves e o zod reprovaria a carga.
    //
    // `explicitNulls = false` precisa ENTRAR, e e o conserto. O ApiTask tem quatro campos
    // nulaveis -- serverId, assignmentType, assignmentTargetId, assignmentTargetLabel -- e com
    // encodeDefaults sozinho eles saiam como `null` explicito. Do outro lado os quatro sao
    // `.optional()` no zod, que aceita a chave AUSENTE e recusa `null`. Como `tasks` e um array,
    // um unico item ruim reprova a carga inteira: nenhuma tarefa sincronizava, e
    // assignmentTargetId e nulo em toda tarefa "Sem responsavel", ou seja, quase sempre.
    //
    // E o mesmo mecanismo que quebrava o login com Apple no MainViewController.kt, mas o conserto
    // ali foi o oposto -- tirar encodeDefaults -- porque a rota da Apple nao tem campo obrigatorio
    // com default. Mesma bandeira, correcao invertida em cada arquivo: por isso ha trava no
    // validador para nao copiarem a linha de um para o outro.
    //
    // Conferido rodando os tres arranjos contra kotlinx-serialization-json 1.8.1, a versao do
    // projeto, e a saida contra o schema real extraido de tasks.ts.
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        explicitNulls = false
    }
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    /** A ultima sincronizacao disparada, para o signOut nao revogar o token por baixo dela. */
    private var syncJob: Job? = null

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

    /**
     * Quem pode mexer em checklist.
     *
     * Parece adivinhacao por texto de cargo, mas nao e: **esta e a regra que o servidor enforca**.
     * Nao existe permissao de checklist no conjunto que ele calcula -- os dois pontos que gravam
     * subtarefa em mobile-api.server.ts conferem `currentUser.role.includes("admin")` na mao.
     * Trocar isto por `permissions` faria a interface decidir por um criterio e o servidor por
     * outro, que e como nascem as recusas silenciosas.
     *
     * O `isOwner` existe porque o servidor **reescreve o cargo antes de enviar**: o proprietario
     * sai como "Proprietário" na lista de membros, enquanto o cargo cru, que ele mesmo confere na
     * escrita, continua "Administrador". Sem esta linha o dono da empresa -- o unico que nao pode
     * ter o acesso reduzido -- era justamente quem ficava sem editar checklist, e o addTask ainda
     * descartava a checklist dele localmente antes de tentar enviar.
     */
    val isCurrentUserAdmin: Boolean
        get() {
            if (state.workspace == WorkspaceKind.Personal) return true
            if (permissions.isOwner) return true
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

    fun signOut() {
        // Sair precisa encerrar a sessao no servidor tambem. Antes isto so limpava o estado local,
        // e o token seguia valido para sempre do outro lado -- quem tivesse copiado o token de um
        // aparelho perdido continuava com acesso, e nao havia como cortar sem apagar a conta.
        //
        // Melhor esforco, de proposito: o estado local e limpo mesmo se a chamada falhar. Prender
        // alguem dentro do aplicativo porque a rede caiu seria pior do que uma sessao orfa no
        // servidor, e o token local ja vai embora aqui de qualquer forma.
        val token = state.apiToken
        if (!token.isNullOrBlank()) {
            // Espera a sincronizacao que ja estava no ar antes de revogar o token.
            //
            // `update(sync = true)` dispara syncTasks() e devolve o controle na hora. Quem
            // concluia uma tarefa e tocava "Sair" no segundo seguinte tinha duas corrotinas na
            // fila: o PUT carrega a lista visivel inteira, o logout precisa de um round-trip
            // curto. Chegando primeiro, o logout apagava a sessao e o PUT voltava 401 -- e o
            // estado local ja tinha sido limpo aqui embaixo, entao a conclusao nao sobrava em
            // lugar nenhum. Antes de este PR existir o token continuava valido e o PUT completava,
            // ou seja, foi regressao introduzida junto com o logout.
            //
            // O `join` nao prende ninguem: isto ja roda fora da thread da interface, e a tela de
            // login aparece assim que o update() abaixo executa, sem esperar por nada disto.
            val pendente = syncJob
            scope.launch {
                runCatching { pendente?.join() }
                runCatching { platform.apiRequest(path = "auth/logout", method = "POST", token = token) }
            }
        }
        update {
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
            // Sem preencher a regra crua aqui, a tarefa nasceria com o default "Nao repetir" e o
            // servidor descartaria a recorrencia que o usuario acabou de escolher.
            recurrenceRule = recurrence.toServerRule(),
            recurrenceSeriesId = taskId.takeIf { recurrence != RecurrenceKind.None },
        )
        update { copy(tasks = listOf(task) + tasks) }
        platform.playActionSound()
    }

    fun toggleTask(taskId: String) {
        val alvo = state.tasks.firstOrNull { it.id == taskId } ?: return
        // Concluir ocorrencia FUTURA de serie recorrente e recusado pelo servidor com 409
        // (mobile-api.server.ts:1702) -- e a recusa derruba a carga INTEIRA, nao so o item errado.
        // O toque errado na agenda custava a sincronizacao do aparelho inteiro ate alguem perceber.
        //
        // A fonte fiel seria o flag `canComplete`, que o servidor ja manda e o app ignora. Le-lo
        // exige campo novo no ApiTask, e ISSO E PERIGOSO HOJE: o `json` daqui usa
        // `encodeDefaults = true` -- que e obrigatorio, porque o schema movel tem 18 campos
        // estritamente exigidos que no ApiTask tem valor padrao -- entao todo campo novo passa a
        // ser enviado sempre, com o proprio padrao. Foi assim que `recurrenceTimes` travou tudo do
        // lado do servidor. Quando o schema do servidor for afrouxado, trocar esta regra pelo flag.
        if (!alvo.completed && ocorrenciaFuturaDeSerie(alvo)) {
            message = "Esta ocorrência ainda não chegou. Ela pode ser concluída no dia dela."
            return
        }
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

    // `deleteRecurringOccurrence`, `deleteTaskSeries` e `nextRecurrenceDate` foram REMOVIDAS aqui.
    // Nenhuma das duas exclusoes de tarefa recorrente funcionava, e a primeira estragava dado. O
    // motivo completo, com os trechos do servidor, esta no TaskDeleteDialog, em PopOrganizeApp.kt
    // -- que e onde alguem vai procurar ao perguntar por que o aplicativo nao exclui recorrente.
    //
    // Em resumo: o servidor RECRIA a ocorrencia apagada (materializeRecurringTasks) e o app nao tem
    // como marcar data excluida nem identificar a serie, porque o contrato movel nao traz esses
    // dois campos. Enquanto isso, o PUT faz `existing.dueDate = item.dueDate` -- adota a data do
    // aparelho --, entao avancar a data localmente tirava a serie de fase de forma permanente, e
    // tambem para o Android e o painel.

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
        // A referencia fica guardada para o signOut poder esperar por ela. Ver o comentario la.
        if (sync && !state.apiToken.isNullOrBlank()) syncJob = scope.launch { syncTasks() }
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
        // O logout pode ter acontecido enquanto esta resposta viajava. Sem esta guarda, o copy
        // abaixo repovoa `companies` e `personalWorkspaceId` numa sessao ja encerrada, e o
        // `persist()` da linha seguinte GRAVA EM DISCO os nomes das empresas, os e-mails dos
        // funcionarios e os setores da conta anterior -- num aparelho que pode ser compartilhado.
        //
        // O conserto do signOut (fazer o logout esperar o syncJob) nao cobria isto: o
        // refreshFromServer e disparado por outros quatro caminhos e NAO e rastreado pelo syncJob.
        // Comparar o token e mais preciso do que testar se ele existe: pega tambem a troca de
        // conta, em que a resposta da conta antiga chegaria com uma sessao nova ja aberta.
        if (state.apiToken != token) return
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
        // Mesma corrida do refreshFromServer, e pela mesma razao: aqui tambem se grava em disco
        // depois de uma ida ao servidor. O que vaza sao os titulos e os responsaveis das tarefas da
        // empresa. Consertar so um dos dois deixaria metade do buraco aberto -- que foi exatamente
        // o erro cometido no signOut.
        if (state.apiToken != token) return
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
            tasks = cargaAceitavel(visibleTasks).map { it.toApiTask() },
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
            // Nao ha mais tratamento especial de 409 aqui. O que impedia a carga de subir agora e
            // filtrado ANTES de montar o payload, em `cargaAceitavel` -- ver o comentario dela.
            //
            // O build 8 tentava desfazer a conclusao ao receber 409. Nao funcionou em aparelho: o
            // sync seguinte passava, o sucesso chamava refreshTasks(), o servidor devolvia a mesma
            // conclusao e o ciclo recomecava. Prevenir na carga resolve; remediar na resposta, nao.
            // A mensagem crua do servidor ("Lista de tarefas invalida.") nao diz nada a quem usa o
            // app, mas foi o que permitiu diagnosticar o bloqueio do recurrenceTimes em 27/08.
            // Emoldurar em vez de esconder: fica legivel para o usuario e util para quem investiga.
            //
            // Dois pontos em vez de parenteses, e o ponto final do servidor aparado. A primeira
            // versao usava parenteses e produzia "...pelo servidor (Lista de tarefas invalida.)."
            // -- ponto dentro do parentese seguido de outro ponto fora. Com a mensagem do modo
            // visitante da previa, que ja tem parentese propria, virava parentese dentro de
            // parentese. Visto na previa em 27/08, depois de a redacao ja ter ido para o build 8.
            val detalhe = runCatching { json.decodeFromString<ApiError>(response.body).error }
                .getOrNull()
                ?.trim()
                ?.trimEnd('.')
            message = if (detalhe.isNullOrBlank()) {
                "Alterações salvas no aparelho; sincronização pendente."
            } else {
                "Servidor recusou a sincronização: $detalhe. As alterações estão salvas no aparelho."
            }
        }
    }

    /**
     * Verdadeiro para ocorrencia de serie recorrente cuja data ainda nao chegou.
     *
     * Espelha a guarda de `mobile-api.server.ts:1702`. Comparacao de String funciona porque as
     * datas sao ISO `AAAA-MM-DD`, em que ordem lexicografica e ordem cronologica.
     */
    private fun ocorrenciaFuturaDeSerie(task: PopTask): Boolean =
        task.recurrenceOccurrence > 1 && task.dueDate > todayIso()

    /**
     * O que NAO pode ir na carga, porque o servidor recusa a carga inteira por causa dele.
     *
     * Substitui a antiga `reverterConclusoesFuturas`, que desfazia a conclusao localmente ao
     * receber 409. Aquela abordagem falhou em aparelho no dia 31/08 e o motivo importa:
     *
     *   1. sync falha com 409 -> reverte local -> a lista fica limpa
     *   2. o sync seguinte passa -> e o sucesso chama `refreshTasks()`, que troca a lista pela do
     *      servidor -- e o SERVIDOR ainda tem aquelas ocorrencias como concluidas
     *   3. proximo sync falha com 409 de novo, e assim para sempre
     *
     * Ou seja: **o servidor guarda dado que a validacao dele mesmo recusa** (`mobile-api.server.ts`
     * grava a conclusao por outro caminho e a recusa no PUT). Reverter local briga com isso
     * eternamente -- e, pior, ALTERA dado do usuario para contornar bug de servidor.
     *
     * Omitir e melhor por tres razoes:
     *
     *   - nao destroi nada: `replaceMobileTasks` so apaga o que vem em `deletedServerIds`; tarefa
     *     ausente da carga fica intocada;
     *   - desbloqueia todo o resto -- era UM item impedindo qualquer tarefa nova de subir;
     *   - a divergencia que sobra e estavel e honesta: o app mostra concluida porque o servidor diz
     *     que esta, e o proximo `refreshTasks` confirma isso em vez de desfazer.
     *
     * Quando o servidor parar de aceitar essa conclusao por outro caminho, este filtro vira inocuo
     * sozinho -- nao ha nada para desligar depois.
     *
     * O conserto de raiz e do servidor e tem duas partes: aplicar a mesma checagem nos caminhos que
     * hoje gravam a conclusao sem passar por ela (painel e Android sao os candidatos), e limpar as
     * ocorrencias ja gravadas assim.
     */
    private fun cargaAceitavel(tasks: List<PopTask>): List<PopTask> =
        tasks.filterNot { it.completed && ocorrenciaFuturaDeSerie(it) }

    private fun persist() = platform.saveState(json.encodeToString(state))

    private fun apiError(response: ApiResponse, fallback: String): String =
        runCatching { json.decodeFromString<ApiError>(response.body).error }.getOrNull() ?: fallback
}

private fun ApiWorkspace.toPermissions() = WorkspacePermissions(
    isOwner = isOwner,
    canCreateTasks = canCreateTasks,
    canAssignTasks = canAssignTasks,
    canViewDepartments = canViewDepartments,
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
    // "Personalizada" nao tem equivalente no enum e cai aqui no else. Isso deixou de ser perda
    // porque a regra crua segue guardada abaixo e volta intacta ao servidor; o enum agora e so
    // o que a interface consegue desenhar.
    recurrence = when (recurrenceRule) {
        "Diária" -> RecurrenceKind.Daily
        "Semanal" -> RecurrenceKind.Weekly
        "Mensal" -> RecurrenceKind.Monthly
        "Anual" -> RecurrenceKind.Yearly
        else -> RecurrenceKind.None
    },
    recurrenceRule = recurrenceRule,
    recurrenceDetail = recurrenceDetail,
    recurrenceInterval = recurrenceInterval,
    recurrenceEndMode = recurrenceEndMode,
    recurrenceEndValue = recurrenceEndValue,
    recurrenceOccurrence = recurrenceOccurrence,
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
    recurrence = wireRule(),
    dueTime = dueTime,
    recurrenceRule = wireRule(),
    recurrenceDetail = recurrenceDetail,
    recurrenceInterval = recurrenceInterval,
    recurrenceEndMode = recurrenceEndMode,
    recurrenceEndValue = recurrenceEndValue,
    recurrenceOccurrence = recurrenceOccurrence,
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

/**
 * A regra que vai no PUT: a crua do servidor, guardada no cofre.
 *
 * O `if` cobre a tarefa que foi salva no aparelho antes do cofre existir. Nela o campo cru
 * desserializa com o default "Nao repetir" enquanto o enum ainda diz Semanal, e mandar o default
 * apagaria no servidor justamente a recorrencia que o cofre veio proteger. Nesse caso o enum e
 * quem sabe mais, e e ele que decide.
 */
private fun PopTask.wireRule(): String =
    if (recurrenceRule == "Não repetir" && recurrence != RecurrenceKind.None) {
        recurrence.toServerRule()
    } else {
        recurrenceRule
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
