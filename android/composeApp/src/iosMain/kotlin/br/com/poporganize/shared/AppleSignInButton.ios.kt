package br.com.poporganize.shared

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.UIKitView
import platform.AuthenticationServices.ASAuthorizationAppleIDButton
import platform.UIKit.UIColor

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

    // O QUADRADO ATRAS DO BOTAO NAO E DO BOTAO -- e o fundo do sistema aparecendo pelo buraco do
    // interop. Terceira hipotese sobre o mesmo defeito; as duas primeiras (builds 8 e 9) mexeram no
    // `cornerRadius`, que nunca esteve errado.
    //
    // O que provou: nos prints de 31/08 o quadrado e BRANCO no tema claro e PRETO no escuro. Isso e
    // assinatura de `UIColor.systemBackground`, nao de nada que este arquivo desenhe. Se fosse raio
    // faltando, a cor nao mudaria com o tema.
    //
    // O mecanismo: `UIKitView` poe uma UIView de verdade na hierarquia, e o Compose nao pinta por
    // cima dela -- ele deixa um buraco RETANGULAR no proprio desenho. O botao desenha a pilula
    // arredondada dentro desse retangulo, certinho. Nos cantos, fora da pilula e dentro do
    // retangulo, ve-se o fundo do UIViewController por baixo.
    //
    // Corroborado lendo a API real da 1.8.2 nos .klib versionados em `android/.kotlin/` (sao zips):
    // a versao ANTIGA de `UIKitView`, em `androidx.compose.ui.interop`, tinha um parametro
    // `background: Color` -- existia exatamente para tapar este buraco. A atual o removeu, e
    // `UIKitInteropProperties` so tem `interactionMode` e `isNativeAccessibilityEnabled`, nada
    // sobre recorte; o holder rastreia apenas retangulos (`currentClippedRect`).
    //
    // TENTATIVA 4, e a diferenca dela para a 3 e DE QUEM E A VIEW que recebe a cor.
    //
    // A tentativa 3 (build 10) pintou o fundo do proprio UIViewController, via
    // LocalUIViewController, dentro de um LaunchedEffect. E ela FUNCIONOU -- por alguns segundos.
    // O Guilherme relatou em 31/08: "ate funciona momentaneamente, mas se der alguns cliques na
    // tela ou sair e voltar do app volta a ficar errado".
    //
    // Isso e a melhor evidencia que este defeito ja produziu: **funcionar por um instante prova
    // que o diagnostico do buraco esta certo.** O que falha e a durabilidade -- a view raiz e do
    // sistema, e o sistema a repinta (mudanca de trait, ciclo de vida, volta do segundo plano), e
    // o LaunchedEffect so dispara de novo se a COR mudar, o que nao acontece nesses eventos.
    //
    // Agora a cor vai na view que e MINHA: o proprio botao, criado aqui no factory. Ninguem de
    // fora a repinta. Aplicada nos dois lugares -- factory para o primeiro desenho, update para
    // sobreviver a recomposicao e a troca de tema.
    //
    // Perfil de risco desta linha, de proposito: se o `cornerRadius` do botao for so um parametro
    // de desenho, o `backgroundColor` preenche o retangulo inteiro e os cantos passam a ter a cor
    // da pagina -- resolvido. Se ele mexer no `layer.cornerRadius`, o fundo sai recortado junto e
    // esta linha nao faz nada. **Ou conserta, ou e inofensiva.** Nao ha caminho em que piore.
    //
    // Se ainda assim ficar quadrado, o proximo passo NAO e uma quinta tentativa aqui: e desenhar o
    // botao em Compose. Mas isso reverte a decisao registrada no KDoc do `expect`
    // (AppleSignInButton.kt) sobre a Review 4.8, e essa reversao e decisao do Guilherme, nao minha.
    //
    // A cor e a da raiz do app: `Surface(color = colorScheme.background)`, em PopOrganizeApp.kt.
    val fundoDaPagina = MaterialTheme.colorScheme.background
    val fundoUIKit = UIColor(
        red = fundoDaPagina.red.toDouble(),
        green = fundoDaPagina.green.toDouble(),
        blue = fundoDaPagina.blue.toDouble(),
        alpha = 1.0,
    )

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
            // O `update` reaplicando o raio veio do build 9, quando eu ainda achava que o problema
            // era o `cornerRadius` nao pegar. Nao era -- ver o comentario grande la em cima. Fica
            // porque e barato e cobre o caso de o botao refazer o proprio fundo ao ser medido, mas
            // NAO e o conserto do quadrado.
            update = { botao ->
                botao.cornerRadius = radius
                botao.clipsToBounds = true
                botao.backgroundColor = fundoUIKit
            },
            factory = {
                ASAuthorizationAppleIDButton().apply {
                    userInteractionEnabled = false
                    clipsToBounds = true
                    backgroundColor = fundoUIKit
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
