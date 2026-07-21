package br.com.poporganize.shared

import androidx.compose.ui.window.ComposeUIViewController
import kotlinx.coroutines.suspendCancellableCoroutine
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
import platform.Foundation.NSUserDefaults
import platform.Foundation.create
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

    override val platformName = "iPhone"
    override val supportsAppleSignIn = true

    override fun loadState(): String? = NSUserDefaults.standardUserDefaults.stringForKey(STATE_KEY)

    override fun saveState(value: String) {
        NSUserDefaults.standardUserDefaults.setObject(value, forKey = STATE_KEY)
    }

    override suspend fun signInWithGoogle(): AuthResult =
        AuthResult.Failure("O Google no iPhone será ativado ao adicionar o URL Scheme no Xcode.")

    override suspend fun signInWithApple(): AuthResult = suspendCancellableCoroutine { continuation ->
        val delegate = AppleAuthorizationDelegate { result ->
            appleDelegate = null
            if (continuation.isActive) continuation.resume(result)
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
}

private class AppleAuthorizationDelegate(
    private val complete: (AuthResult) -> Unit,
) : NSObject(), ASAuthorizationControllerDelegateProtocol, ASAuthorizationControllerPresentationContextProvidingProtocol {
    override fun authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization: ASAuthorization,
    ) {
        val credential = didCompleteWithAuthorization.credential as? ASAuthorizationAppleIDCredential
        if (credential == null) {
            complete(AuthResult.Failure("Não foi possível ler a conta Apple."))
            return
        }
        val email = credential.email ?: "E-mail privado da Apple"
        val name = listOfNotNull(credential.fullName?.givenName, credential.fullName?.familyName)
            .joinToString(" ")
            .ifBlank { "Usuário Apple" }
        complete(AuthResult.Success(UserProfile(credential.user, name, email)))
    }

    override fun authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError: NSError,
    ) {
        complete(AuthResult.Failure(didCompleteWithError.localizedDescription))
    }

    override fun presentationAnchorForAuthorizationController(controller: ASAuthorizationController): ASPresentationAnchor =
        UIApplication.sharedApplication.keyWindow ?: error("Janela principal indisponível")
}
