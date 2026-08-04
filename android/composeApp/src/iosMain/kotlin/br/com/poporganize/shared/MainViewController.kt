@file:OptIn(kotlinx.cinterop.ExperimentalForeignApi::class)

package br.com.poporganize.shared

import androidx.compose.ui.window.ComposeUIViewController
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import platform.AuthenticationServices.ASAuthorization
import platform.AuthenticationServices.ASAuthorizationAppleIDCredential
import platform.AuthenticationServices.ASAuthorizationAppleIDProvider
import platform.AuthenticationServices.ASAuthorizationController
import platform.AuthenticationServices.ASAuthorizationControllerDelegateProtocol
import platform.AuthenticationServices.ASAuthorizationControllerPresentationContextProvidingProtocol
import platform.AuthenticationServices.ASAuthorizationScopeEmail
import platform.AuthenticationServices.ASAuthorizationScopeFullName
import platform.AuthenticationServices.ASPresentationAnchor
import platform.Foundation.NSError
import platform.Foundation.NSString
import platform.Foundation.NSURL
import platform.Foundation.NSBundle
import platform.Foundation.NSHTTPURLResponse
import platform.Foundation.NSMutableURLRequest
import platform.Foundation.NSUTF8StringEncoding
import platform.Foundation.NSURLSession
import platform.Foundation.NSUserDefaults
import platform.Foundation.create
import platform.Foundation.dataUsingEncoding
import platform.UIKit.UIApplication
import platform.UIKit.UIViewController
import platform.UserNotifications.UNAuthorizationOptionAlert
import platform.UserNotifications.UNAuthorizationOptionBadge
import platform.UserNotifications.UNAuthorizationOptionSound
import platform.UserNotifications.UNUserNotificationCenter
import kotlin.coroutines.resume
import kotlin.experimental.ExperimentalNativeApi
import platform.darwin.NSObject

fun MainViewController(): UIViewController = ComposeUIViewController {
    PopOrganizeApp(IosPlatformServices)
}

private object IosPlatformServices : PopPlatformServices {
    private const val STATE_KEY = "pop_organize_kmp_state_v1"
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
            kotlinx.coroutines.MainScope().launch {
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
        val request = NSMutableURLRequest.requestWithURL(url).apply {
            HTTPMethod = method
            setValue("application/json", forHTTPHeaderField = "Accept")
            if (!token.isNullOrBlank()) setValue("Bearer $token", forHTTPHeaderField = "Authorization")
            if (!workspaceId.isNullOrBlank()) setValue(workspaceId, forHTTPHeaderField = "X-Workspace-Id")
            if (body != null) {
                setValue("application/json; charset=utf-8", forHTTPHeaderField = "Content-Type")
                HTTPBody = (body as NSString).dataUsingEncoding(NSUTF8StringEncoding)
            }
        }
        val task = NSURLSession.sharedSession.dataTaskWithRequest(request) { data, response, error ->
            if (!continuation.isActive) return@dataTaskWithRequest
            val status = (response as? NSHTTPURLResponse)?.statusCode?.toInt() ?: 0
            val responseBody = data?.let {
                NSString.create(data = it, encoding = NSUTF8StringEncoding)?.toString()
            }.orEmpty()
            val fallback = error?.localizedDescription?.let { "{\"error\":${json.encodeToString(it)}}" }.orEmpty()
            continuation.resume(ApiResponse(status, responseBody.ifBlank { fallback }))
        }
        continuation.invokeOnCancellation { task.cancel() }
        task.resume()
    }

    override fun updateNotifications(tasks: List<PopTask>, firstName: String) {
        val pending = tasks.count { !it.completed }
        UIApplication.sharedApplication.applicationIconBadgeNumber = pending.toLong()
        UNUserNotificationCenter.currentNotificationCenter().requestAuthorizationWithOptions(
            UNAuthorizationOptionAlert or UNAuthorizationOptionSound or UNAuthorizationOptionBadge,
        ) { granted, _ ->
            if (granted) UIApplication.sharedApplication.registerForRemoteNotifications()
        }
    }

    override fun applyTheme(light: Boolean) = Unit

    override fun playActionSound() = Unit

    override fun openSupportEmail() {
        NSURL.URLWithString("mailto:contato@poporganize.com")?.let { UIApplication.sharedApplication.openURL(it) }
    }

    override fun openExternalUrl(url: String) {
        NSURL.URLWithString(url)?.let { UIApplication.sharedApplication.openURL(it) }
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
        complete(credential, credential?.let { null } ?: "Não foi possível ler a conta Apple.")
    }

    override fun authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError: NSError,
    ) {
        complete(null, didCompleteWithError.localizedDescription)
    }

    override fun presentationAnchorForAuthorizationController(controller: ASAuthorizationController): ASPresentationAnchor =
        UIApplication.sharedApplication.keyWindow ?: error("Janela principal indisponível")
}
