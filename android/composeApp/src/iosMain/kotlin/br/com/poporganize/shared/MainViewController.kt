@file:OptIn(kotlinx.cinterop.ExperimentalForeignApi::class)

package br.com.poporganize.shared

import androidx.compose.ui.window.ComposeUIViewController
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.datetime.Clock
import kotlinx.datetime.LocalDate
import kotlinx.datetime.LocalDateTime
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import platform.AudioToolbox.AudioServicesPlaySystemSound
import platform.AuthenticationServices.ASAuthorization
import platform.AuthenticationServices.ASAuthorizationAppleIDCredential
import platform.AuthenticationServices.ASAuthorizationAppleIDProvider
import platform.AuthenticationServices.ASAuthorizationController
import platform.AuthenticationServices.ASAuthorizationControllerDelegateProtocol
import platform.AuthenticationServices.ASAuthorizationControllerPresentationContextProvidingProtocol
import platform.AuthenticationServices.ASAuthorizationScopeEmail
import platform.AuthenticationServices.ASAuthorizationScopeFullName
import platform.AuthenticationServices.ASPresentationAnchor
import platform.Foundation.NSBundle
import platform.Foundation.NSData
import platform.Foundation.NSDateComponents
import platform.Foundation.NSError
import platform.Foundation.NSHTTPURLResponse
import platform.Foundation.NSMutableURLRequest
import platform.Foundation.NSString
import platform.Foundation.NSURL
import platform.Foundation.NSURLResponse
import platform.Foundation.NSURLSession
import platform.Foundation.NSUTF8StringEncoding
import platform.Foundation.NSUserDefaults
import platform.Foundation.create
import platform.Foundation.dataUsingEncoding
import platform.UIKit.UIApplication
import platform.UIKit.UIUserInterfaceStyle
import platform.UIKit.UIViewController
import platform.UIKit.UIWindow
import platform.UserNotifications.UNAuthorizationOptionAlert
import platform.UserNotifications.UNAuthorizationOptionBadge
import platform.UserNotifications.UNAuthorizationOptionSound
import platform.UserNotifications.UNCalendarNotificationTrigger
import platform.UserNotifications.UNMutableNotificationContent
import platform.UserNotifications.UNNotificationRequest
import platform.UserNotifications.UNNotificationSound
import platform.UserNotifications.UNUserNotificationCenter
import platform.darwin.NSObject
import kotlin.coroutines.resume

fun MainViewController(): UIViewController = ComposeUIViewController {
    PopOrganizeApp(IosPlatformServices)
}

private object IosPlatformServices : PopPlatformServices {
    private const val STATE_KEY = "pop_organize_kmp_state_v1"

    // O iOS mantem no maximo 64 notificacoes locais pendentes por aplicativo.
    private const val MAX_SCHEDULED_REMINDERS = 60

    // Toque curto do sistema ao concluir uma atividade (equivalente ao som padrao do Android).
    private const val ACTION_SOUND_ID = 1007u

    private val mainScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var appleDelegate: AppleAuthorizationDelegate? = null
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    override val platformName = "iPhone"
    override val supportsAppleSignIn = true
    override val supportsGoogleSignIn = false

    override fun loadState(): String? = NSUserDefaults.standardUserDefaults.stringForKey(STATE_KEY)

    override fun saveState(value: String) {
        NSUserDefaults.standardUserDefaults.setObject(value, forKey = STATE_KEY)
    }

    override suspend fun signInWithGoogle(): AuthResult =
        AuthResult.Failure("Use o acesso por e-mail ou sua conta Apple neste iPhone.")

    override suspend fun signInWithApple(): AuthResult = suspendCancellableCoroutine { continuation ->
        val delegate = AppleAuthorizationDelegate { credential, error ->
            if (credential == null) {
                appleDelegate = null
                if (continuation.isActive) continuation.resume(AuthResult.Failure(error ?: "Login Apple cancelado."))
                return@AppleAuthorizationDelegate
            }
            val identityToken = credential.identityToken?.let {
                NSString.create(data = it, encoding = NSUTF8StringEncoding)?.toString()
            }
            if (identityToken.isNullOrBlank()) {
                appleDelegate = null
                if (continuation.isActive) continuation.resume(AuthResult.Failure("A Apple não retornou uma credencial válida."))
                return@AppleAuthorizationDelegate
            }
            val email = credential.email.orEmpty()
            val name = listOfNotNull(credential.fullName?.givenName, credential.fullName?.familyName)
                .joinToString(" ").trim()
            mainScope.launch {
                val response = apiRequest(
                    path = "auth/apple",
                    method = "POST",
                    body = json.encodeToString(
                        AppleAuthPayload(identityToken = identityToken, name = name.ifBlank { null }, email = email.ifBlank { null }),
                    ),
                )
                val result = if (response.successful) {
                    runCatching { json.decodeFromString<ApiSession>(response.body) }
                        .fold(
                            onSuccess = { session ->
                                AuthResult.Success(
                                    UserProfile(session.user.id, session.user.name, session.user.email, session.user.photoUrl),
                                    session.token,
                                )
                            },
                            onFailure = { AuthResult.Failure("O servidor retornou uma sessão inválida.") },
                        )
                } else {
                    AuthResult.Failure(
                        runCatching { json.decodeFromString<ApiError>(response.body).error }.getOrNull()
                            ?: "Não foi possível entrar com a Apple.",
                    )
                }
                appleDelegate = null
                if (continuation.isActive) continuation.resume(result)
            }
        }
        appleDelegate = delegate
        val request = ASAuthorizationAppleIDProvider().createRequest().apply {
            requestedScopes = listOf(ASAuthorizationScopeFullName, ASAuthorizationScopeEmail)
        }
        ASAuthorizationController(listOf(request)).apply {
            this.delegate = delegate
            presentationContextProvider = delegate
            performRequests()
        }
    }

    override suspend fun apiRequest(
        path: String,
        method: String,
        body: String?,
        token: String?,
        workspaceId: String?,
    ): ApiResponse = suspendCancellableCoroutine { continuation ->
        val configuredBase = NSBundle.mainBundle.objectForInfoDictionaryKey("POP_API_BASE_URL") as? String
        val base = configuredBase?.trim()?.trimEnd('/').orEmpty()
        val url = NSURL.URLWithString("$base/${path.trimStart('/')}")
        if (base.isBlank() || url == null) {
            continuation.resume(ApiResponse(0, "{\"error\":\"URL da API não configurada.\"}"))
            return@suspendCancellableCoroutine
        }
        // requestWithURL: e declarado em NSURLRequest, entao o binding devolve o tipo imutavel;
        // sem o cast os setters de NSMutableURLRequest nao existem para o compilador.
        val request = (NSMutableURLRequest.requestWithURL(url) as NSMutableURLRequest).apply {
            setHTTPMethod(method)
            setValue("application/json", forHTTPHeaderField = "Accept")
            if (!token.isNullOrBlank()) setValue("Bearer $token", forHTTPHeaderField = "Authorization")
            if (!workspaceId.isNullOrBlank()) setValue(workspaceId, forHTTPHeaderField = "X-Workspace-Id")
            if (body != null) {
                setValue("application/json; charset=utf-8", forHTTPHeaderField = "Content-Type")
                setHTTPBody((body as NSString).dataUsingEncoding(NSUTF8StringEncoding))
            }
        }
        // Os tipos dos parametros sao explicitos porque dataTaskWithRequest tem sobrecarga com e
        // sem completion handler; sem eles a resolucao falha e a lambda inteira fica sem tipo.
        val task = NSURLSession.sharedSession.dataTaskWithRequest(
            request,
        ) { data: NSData?, response: NSURLResponse?, error: NSError? ->
            if (continuation.isActive) {
                val status = (response as? NSHTTPURLResponse)?.statusCode?.toInt() ?: 0
                val responseBody = data
                    ?.let { NSString.create(data = it, encoding = NSUTF8StringEncoding)?.toString() }
                    .orEmpty()
                val fallback = error?.localizedDescription
                    ?.let { message -> "{\"error\":${json.encodeToString(message)}}" }
                    .orEmpty()
                continuation.resume(ApiResponse(status, responseBody.ifBlank { fallback }))
            }
        }
        continuation.invokeOnCancellation { task.cancel() }
        task.resume()
    }

    /**
     * Espelha os lembretes locais do Android: distintivo com o total pendente e uma notificacao
     * local para cada atividade com data e hora ainda no futuro.
     */
    override fun updateNotifications(tasks: List<PopTask>, firstName: String) {
        val pending = tasks.count { !it.completed }
        val now = Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault())
        val reminders = tasks
            .asSequence()
            .filter { !it.completed && it.dueTime.isNotBlank() }
            .mapNotNull { task -> scheduledAt(task)?.let { moment -> task to moment } }
            .filter { pair -> pair.second > now }
            .sortedBy { pair -> pair.second }
            .take(MAX_SCHEDULED_REMINDERS)
            .toList()

        mainScope.launch {
            UIApplication.sharedApplication.applicationIconBadgeNumber = pending.toLong()
            UNUserNotificationCenter.currentNotificationCenter().requestAuthorizationWithOptions(
                UNAuthorizationOptionAlert or UNAuthorizationOptionSound or UNAuthorizationOptionBadge,
            ) { granted, _ ->
                if (granted) mainScope.launch { scheduleReminders(reminders, firstName) }
            }
        }
    }

    private fun scheduleReminders(reminders: List<Pair<PopTask, LocalDateTime>>, firstName: String) {
        val center = UNUserNotificationCenter.currentNotificationCenter()
        // O aplicativo nao cria outras notificacoes locais, entao recriar a lista mantem tudo em dia.
        center.removeAllPendingNotificationRequests()
        val owner = firstName.trim()
        reminders.forEach { pair ->
            val task = pair.first
            val moment = pair.second
            val content = UNMutableNotificationContent().apply {
                setTitle(if (owner.isBlank()) "Pop Organize" else "$owner, chegou a hora")
                setBody(task.title.ifBlank { "Você tem uma atividade agendada." })
                // O som personalizado exige CAF/AIFF/WAV; pop_notification.mp3 nao serve aqui.
                setSound(UNNotificationSound.defaultSound)
            }
            val components = NSDateComponents().apply {
                year = moment.year.toLong()
                month = moment.monthNumber.toLong()
                day = moment.dayOfMonth.toLong()
                hour = moment.hour.toLong()
                minute = moment.minute.toLong()
            }
            val trigger = UNCalendarNotificationTrigger.triggerWithDateMatchingComponents(components, repeats = false)
            center.addNotificationRequest(
                UNNotificationRequest.requestWithIdentifier("pop-task-" + task.id, content, trigger),
                null,
            )
        }
    }

    private fun scheduledAt(task: PopTask): LocalDateTime? {
        val date = runCatching { LocalDate.parse(task.dueDate) }.getOrNull() ?: return null
        val parts = task.dueTime.trim().split(":")
        val hour = parts.getOrNull(0)?.toIntOrNull() ?: return null
        val minute = parts.getOrNull(1)?.toIntOrNull() ?: 0
        if (hour !in 0..23 || minute !in 0..59) return null
        return LocalDateTime(date.year, date.monthNumber, date.dayOfMonth, hour, minute)
    }

    override fun applyTheme(light: Boolean) {
        mainScope.launch {
            keyWindow()?.overrideUserInterfaceStyle =
                if (light) UIUserInterfaceStyle.UIUserInterfaceStyleLight
                else UIUserInterfaceStyle.UIUserInterfaceStyleDark
        }
    }

    override fun playActionSound() {
        AudioServicesPlaySystemSound(ACTION_SOUND_ID)
    }

    override fun openSupportEmail() {
        NSURL.URLWithString("mailto:contato@poporganize.com")?.let { UIApplication.sharedApplication.openURL(it) }
    }

    override fun openExternalUrl(url: String) {
        NSURL.URLWithString(url)?.let { UIApplication.sharedApplication.openURL(it) }
    }

    internal fun keyWindow(): UIWindow? {
        val application = UIApplication.sharedApplication
        return application.keyWindow
            ?: application.windows.filterIsInstance<UIWindow>().firstOrNull()
    }
}

@kotlinx.serialization.Serializable
private data class AppleAuthPayload(
    val identityToken: String,
    val name: String? = null,
    val email: String? = null,
)

private class AppleAuthorizationDelegate(
    private val complete: (ASAuthorizationAppleIDCredential?, String?) -> Unit,
) : NSObject(), ASAuthorizationControllerDelegateProtocol, ASAuthorizationControllerPresentationContextProvidingProtocol {
    override fun authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization: ASAuthorization,
    ) {
        val credential = didCompleteWithAuthorization.credential as? ASAuthorizationAppleIDCredential
        complete(credential, if (credential == null) "Não foi possível ler a conta Apple." else null)
    }

    override fun authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError: NSError,
    ) {
        complete(null, didCompleteWithError.localizedDescription)
    }

    override fun presentationAnchorForAuthorizationController(controller: ASAuthorizationController): ASPresentationAnchor =
        IosPlatformServices.keyWindow() ?: error("Janela principal indisponível")
}
