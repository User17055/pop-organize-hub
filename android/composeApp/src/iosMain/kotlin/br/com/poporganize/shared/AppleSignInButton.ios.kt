package br.com.poporganize.shared

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.matchParentSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.viewinterop.UIKitView
import platform.AuthenticationServices.ASAuthorizationAppleIDButton
import platform.AuthenticationServices.ASAuthorizationAppleIDButtonStyleBlack
import platform.AuthenticationServices.ASAuthorizationAppleIDButtonStyleWhite
import platform.AuthenticationServices.ASAuthorizationAppleIDButtonTypeSignIn

/**
 * O botao nativo entra so como aparencia, com o toque desligado, e quem recebe o clique e uma
 * camada do Compose por cima.
 *
 * Ligar a acao no proprio UIControl exigiria um alvo Objective-C com selector, retido por conta
 * propria -- exatamente o padrao que ja rendeu o bug em aberto do ASAuthorizationController, que
 * e variavel local e pode morrer antes do callback. A aparencia, que e o que a revisao da Apple
 * verifica, continua sendo a que o sistema desenha.
 */
@Composable
actual fun AppleSignInButton(
    onClick: () -> Unit,
    modifier: Modifier,
    enabled: Boolean,
    lightBackground: Boolean,
) {
    Box(modifier) {
        UIKitView(
            factory = {
                ASAuthorizationAppleIDButton.buttonWithType(
                    ASAuthorizationAppleIDButtonTypeSignIn,
                    // Em fundo claro o botao preto tem contraste; em fundo escuro, o branco.
                    if (lightBackground) {
                        ASAuthorizationAppleIDButtonStyleBlack
                    } else {
                        ASAuthorizationAppleIDButtonStyleWhite
                    },
                ).apply {
                    userInteractionEnabled = false
                }
            },
            modifier = Modifier.matchParentSize().alpha(if (enabled) 1f else .5f),
        )
        Box(Modifier.matchParentSize().clickable(enabled = enabled, onClick = onClick))
    }
}
