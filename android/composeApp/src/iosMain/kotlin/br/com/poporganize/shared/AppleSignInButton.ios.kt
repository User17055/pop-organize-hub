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
 * custa um build inteiro.
 *
 * ATENCAO -- este comentario afirmava, ate 27/08/2026, que "o padrao ja e o tipo 'Iniciar sessao'
 * no estilo branco". **Isso e falso.** O inicializador padrao do ASAuthorizationAppleIDButton usa
 * o estilo **preto**. O erro tinha consequencia visivel: no tema escuro o botao e preto sobre um
 * fundo quase preto, sem borda nenhuma, e nao se enxerga que ele e uma pilula -- le como um bloco
 * quadrado ao lado da pilula azul do "Entrar com e-mail". O `cornerRadius` abaixo sempre esteve
 * certo e sempre foi aplicado; o que faltava era contraste, nao raio.
 *
 * Por isso a borda existe nos DOIS temas: no claro ela impede que o botao se perca no branco, no
 * escuro ela desenha a forma que o preto sozinho nao mostra. O caminho correto seria o estilo
 * branco da Apple, e ele fica pendente do binding -- ver a skill `pre-push-ios`, secao 3.
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
            when {
                lightBackground -> Modifier.border(1.dp, Color(0xFF1D1D1F), RoundedCornerShape(radius.dp))
                // Preto a 50% sobre um fundo quase preto praticamente SOME. Enquanto conecta, o
                // botao nao ficava apagado -- ficava invisivel, e a tela parecia ter perdido uma
                // opcao. Este contorno fica FORA do alpha (ele e do Box; a transparencia e do
                // UIKitView de dentro), entao a forma continua na tela com o miolo apagado.
                !enabled -> Modifier.border(1.dp, Color.White.copy(alpha = .22f), RoundedCornerShape(radius.dp))
                // Antes era `Modifier` -- sem borda. Em tema escuro, botao preto sobre fundo quase
                // preto nao mostra a propria silhueta: o raio de 26 esta la, mas nao ha o que ver.
                // Ao lado de uma pilula azul, isso le como um retangulo colado de outro app. Um
                // pouco mais forte que o contorno do estado desabilitado, para os dois nao se
                // confundirem quando o botao esta conectando.
                else -> Modifier.border(1.dp, Color.White.copy(alpha = .38f), RoundedCornerShape(radius.dp))
            },
        ),
    ) {
        UIKitView(
            // DOIS mecanismos independentes, de proposito. O build 8 ja tinha o `cornerRadius`
            // aplicado aqui no factory, compilou verde, e mesmo assim o botao saiu QUADRADO no
            // aparelho: a borda do Compose desenhava a pilula e por baixo dela sobrava um retangulo
            // preto de cantos retos. Ou seja, atribuir a propriedade nao bastou.
            //
            // 1) `update` reaplica depois que a view entra na hierarquia e e medida. A hipotese e
            //    que o botao refaca o proprio fundo no layout e perca o que foi posto no factory.
            // 2) `clipsToBounds` cobre a outra possibilidade: o raio existir na camada e faltar a
            //    mascara que recorta o desenho.
            //
            // Sao independentes porque nao sei qual e a causa -- nao ha compilador de iosMain nesta
            // maquina, e a previa em desktop nao compila este arquivo. Se ainda assim sair quadrado,
            // parar de insistir: o botao e componente do sistema e quem se adapta e o resto da tela.
            update = { botao ->
                botao.cornerRadius = radius
                botao.clipsToBounds = true
            },
            factory = {
                ASAuthorizationAppleIDButton().apply {
                    userInteractionEnabled = false
                    clipsToBounds = true
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
