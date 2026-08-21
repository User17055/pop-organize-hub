package br.com.poporganize.shared

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * Nao existe login Apple no Android, e o LoginScreen so chama este composable quando
 * PopPlatformServices.supportsAppleSignIn e verdadeiro -- falso na implementacao Android. O corpo
 * vazio existe para o alvo androidTarget() do modulo continuar compilando.
 */
@Composable
actual fun AppleSignInButton(
    onClick: () -> Unit,
    modifier: Modifier,
    enabled: Boolean,
    lightBackground: Boolean,
) = Unit
