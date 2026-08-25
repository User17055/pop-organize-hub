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
    // Metade da altura do botao (52.dp no ponto de chamada) deixa a pilula completa, que e a forma
    // dos outros botoes da tela. Sem isto o botao da Apple sai com o canto do sistema, quase reto,
    // e fica sendo o unico elemento quadrado numa tela de pilulas -- le como peca colada de outro
    // aplicativo. Foi a primeira coisa que o Guilherme apontou ao ver a tela num iPhone.
    val radius = 26.0

    Box(
        modifier.then(
            if (lightBackground) {
                Modifier.border(1.dp, Color(0xFF1D1D1F), RoundedCornerShape(radius.dp))
            } else {
                Modifier
            },
        ),
    ) {
        UIKitView(
            factory = {
                ASAuthorizationAppleIDButton().apply {
                    userInteractionEnabled = false
                    // Propriedade do proprio botao, e nao `layer.cornerRadius`.
                    //
                    // Nao ha compilador Kotlin/Native nesta maquina, entao a escolha e por
                    // evidencia. O que ja falhou a resolver aqui foi `ASAuthorizationAppleIDButtonStyle*`
                    // -- CONSTANTES, que sao geradas por outro caminho. Propriedade simples desta
                    // mesma classe ja compila verde na linha de cima. `layer` seria dois saltos e
                    // nunca apareceu neste projeto; `cornerRadius` e um salto, na classe provada.
                    cornerRadius = radius
                }
            },
            modifier = Modifier.matchParentSize().alpha(if (enabled) 1f else .5f),
        )
        Box(Modifier.matchParentSize().clickable(enabled = enabled, onClick = onClick))
    }
}
