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
import br.com.poporganize.shared.ApiResponse
import br.com.poporganize.shared.PopPlatformServices
import br.com.poporganize.shared.PopTask
import br.com.poporganize.shared.UserProfile
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import java.security.SecureRandom
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

class PopAndroidServices(private val activity: Activity) : PopPlatformServices {
    private val preferences = activity.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

    override val platformName = "Android"
    override val supportsAppleSignIn = false
    override val supportsGoogleSignIn = true

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
                val response = apiRequest(
                    path = "auth/google",
                    method = "POST",
                    body = JSONObject().put("credential", google.idToken).toString(),
                )
                val payload = runCatching { JSONObject(response.body) }.getOrElse { JSONObject() }
                if (!response.successful) {
                    AuthResult.Failure(payload.optString("error", "Não foi possível conectar ao servidor."))
                } else {
                    val user = payload.optJSONObject("user") ?: JSONObject()
                    val token = payload.optString("token")
                    if (token.isBlank() || user.optString("id").isBlank()) {
                        AuthResult.Failure("O servidor retornou uma sessão inválida.")
                    } else {
                        AuthResult.Success(
                            UserProfile(
                                id = user.optString("id"),
                                name = user.optString("name"),
                                email = user.optString("email"),
                                avatarUrl = user.optString("photoUrl"),
                            ),
                            token,
                        )
                    }
                }
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

    override suspend fun apiRequest(
        path: String,
        method: String,
        body: String?,
        token: String?,
        workspaceId: String?,
    ): ApiResponse = withContext(Dispatchers.IO) {
        val base = BuildConfig.POP_API_BASE_URL.trimEnd('/')
        val connection = (URL("$base/${path.trimStart('/')}").openConnection() as java.net.HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 15_000
            readTimeout = 30_000
            setRequestProperty("Accept", "application/json")
            if (!token.isNullOrBlank()) setRequestProperty("Authorization", "Bearer $token")
            if (!workspaceId.isNullOrBlank()) setRequestProperty("X-Workspace-Id", workspaceId)
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
            }
        }
        try {
            if (body != null) connection.outputStream.bufferedWriter(Charsets.UTF_8).use { it.write(body) }
            val status = connection.responseCode
            val responseBody = (if (status in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            ApiResponse(status, responseBody)
        } finally {
            connection.disconnect()
        }
    }

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

    override fun openExternalUrl(url: String) {
        activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
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
