package br.com.poporganize.shared

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.UIKitView
import platform.AuthenticationServices.ASAuthorizationAppleIDButton

/**
 * O botao nativo entra so como aparencia, com o toque desligado, e quem recebe o clique e uma
 * camada do Compose por cima.
 *
 * Ligar a acao no proprio UIControl exigiria um alvo Objective-C com selector retido por conta
 * propria -- exatamente o padrao que ja rendeu o bug em aberto do ASAuthorizationController, que
 * e variavel local e pode morrer antes do callback. A aparencia, que e o que a revisao da Apple
 * verifica, continua sendo a que o sistema desenha.
 *
 * Usa o inicializador padrao em vez de buttonWithType:style:. As constantes de estilo do
 * Objective-C nao resolveram no binding do Kotlin/Native, e cada tentativa de adivinhar o nome
 * custa um build inteiro; o padrao ja e o tipo "Iniciar sessao" no estilo branco. Em fundo claro
 * o branco se perde, entao a borda faz o papel do estilo WhiteOutline.
 */
@Composable
actual fun AppleSignInButton(
    onClick: () -> Unit,
    modifier: Modifier,
    enabled: Boolean,
    lightBackground: Boolean,
) {
    Box(
        modifier.then(
            if (lightBackground) {
                Modifier.border(1.dp, Color(0xFF1D1D1F), RoundedCornerShape(8.dp))
            } else {
                Modifier
            },
        ),
    ) {
        UIKitView(
            factory = { ASAuthorizationAppleIDButton().apply { userInteractionEnabled = false } },
            modifier = Modifier.matchParentSize().alpha(if (enabled) 1f else .5f),
        )
        Box(Modifier.matchParentSize().clickable(enabled = enabled, onClick = onClick))
    }
}
