package br.com.poporganize.app

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.util.Base64
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import androidx.core.view.WindowCompat
import br.com.poporganize.app.notifications.NotificationTaskSnapshot
import br.com.poporganize.app.notifications.saveNotificationTaskSnapshot
import br.com.poporganize.shared.AuthResult
import br.com.poporganize.shared.PopPlatformServices
import br.com.poporganize.shared.PopTask
import br.com.poporganize.shared.UserProfile
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import java.security.SecureRandom

class PopAndroidServices(private val activity: Activity) : PopPlatformServices {
    private val preferences = activity.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

    override val platformName = "Android"
    override val supportsAppleSignIn = false

    override fun loadState(): String? = preferences.getString(STATE_KEY, null)

    override fun saveState(value: String) {
        preferences.edit().putString(STATE_KEY, value).apply()
    }

    override suspend fun signInWithGoogle(): AuthResult {
        val clientId = activity.getString(R.string.google_web_client_id).trim()
        if (clientId.isBlank() || clientId.startsWith("YOUR_")) {
            return AuthResult.Failure("Configure o ID do cliente Web do Google em strings.xml.")
        }

        val googleOption = GetSignInWithGoogleOption.Builder(clientId)
            .setNonce(generateNonce())
            .build()
        val request = GetCredentialRequest.Builder().addCredentialOption(googleOption).build()

        return try {
            val credential = CredentialManager.create(activity).getCredential(activity, request).credential
            if (credential !is CustomCredential || credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                AuthResult.Failure("O Google retornou uma credencial incompatível.")
            } else {
                val google = GoogleIdTokenCredential.createFrom(credential.data)
                preferences.edit()
                    .putString(SESSION_MODE, "google")
                    .putString(ACCOUNT_NAME, google.displayName.orEmpty())
                    .apply()
                AuthResult.Success(
                    UserProfile(
                        id = google.id,
                        name = google.displayName.orEmpty().ifBlank { google.id.substringBefore('@') },
                        email = google.id,
                        avatarUrl = google.profilePictureUri?.toString(),
                    ),
                )
            }
        } catch (_: GetCredentialCancellationException) {
            AuthResult.Cancelled
        } catch (_: NoCredentialException) {
            AuthResult.Failure("Nenhuma conta Google está disponível neste aparelho.")
        } catch (_: GoogleIdTokenParsingException) {
            AuthResult.Failure("Não foi possível validar a resposta do Google.")
        } catch (error: GetCredentialException) {
            AuthResult.Failure(error.localizedMessage ?: "Falha ao entrar com o Google.")
        }
    }

    override suspend fun signInWithApple(): AuthResult =
        AuthResult.Failure("Entrar com Apple está disponível no iPhone.")

    override fun updateNotifications(tasks: List<PopTask>, firstName: String) {
        preferences.edit().apply {
            if (firstName.isBlank()) {
                remove(SESSION_MODE)
                remove(ACCOUNT_NAME)
            } else {
                putString(SESSION_MODE, "kmp")
                putString(ACCOUNT_NAME, firstName)
            }
        }.apply()
        saveNotificationTaskSnapshot(
            activity,
            tasks.map { NotificationTaskSnapshot(it.title, it.dueDate, it.dueTime, it.completed) },
        )
    }

    override fun applyTheme(light: Boolean) {
        WindowCompat.getInsetsController(activity.window, activity.window.decorView).isAppearanceLightStatusBars = light
    }

    override fun playActionSound() {
        runCatching {
            RingtoneManager.getRingtone(activity, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))?.play()
        }
    }

    override fun openSupportEmail() {
        activity.startActivity(
            Intent(Intent.ACTION_SENDTO).apply {
                data = Uri.parse("mailto:contato@poporganize.com")
                putExtra(Intent.EXTRA_SUBJECT, "Suporte Pop Organize")
            },
        )
    }

    private fun generateNonce(): String {
        val bytes = ByteArray(32)
        SecureRandom().nextBytes(bytes)
        return Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
    }

    private companion object {
        const val PREFERENCES = "pop_organize_local"
        const val STATE_KEY = "pop_organize_kmp_state_v1"
        const val ACCOUNT_NAME = "pop_organize_google_account_name"
        const val SESSION_MODE = "pop_organize_session_mode"
    }
}
