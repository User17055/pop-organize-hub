package br.com.poporganize.shared

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.poporganize.shared.resources.Res
import br.com.poporganize.shared.resources.poppins_bold
import br.com.poporganize.shared.resources.poppins_regular
import br.com.poporganize.shared.resources.poppins_semibold
import org.jetbrains.compose.resources.Font

/**
 * Identidade visual do app, derivada do painel web (src/styles.css) -- nao inventada aqui.
 *
 * O azul ja era o mesmo nos dois lados (#1687F8). O que faltava no app era todo o resto do
 * acabamento que a web tem: gradiente, brilho, sombra, e um fundo que pertencesse a marca.
 */

// --- Marca -------------------------------------------------------------------------------------

internal val PopBlue = Color(0xFF1687F8) // --primary
internal val PopBlueDeep = Color(0xFF0864DC) // fim do --gradient-primary
internal val PopBlueLift = Color(0xFF45ADFF) // inicio do --gradient-primary
internal val PopGlow = Color(0xFF62C7FF) // --primary-glow

/** --gradient-primary do painel web, em 135deg. */
internal val PopBrandGradient = Brush.linearGradient(
    0f to PopBlueLift,
    0.52f to PopBlue,
    1f to PopBlueDeep,
)

// --- Estado ------------------------------------------------------------------------------------
//
// Reafinados para o fundo azul-escuro novo. As versoes antigas foram escolhidas contra um fundo
// esverdeado e ficavam sujas aqui -- o verde em especial vibrava contra o azul.

internal val PopGreen = Color(0xFF23C08A)
internal val PopOrange = Color(0xFFFFA92E)
internal val PopRed = Color(0xFFF2565B)

// --- Escuro ------------------------------------------------------------------------------------
//
// O fundo antigo era #0D1110: um preto ESVERDEADO. Contra ele, o azul da marca ficava orfao -- a
// cor aparecia so em numeros e no ponto do logotipo, e o app lia como cinza com semaforo colorido.
// Puxar toda a escala de cinzas para o azul faz a marca sustentar a tela inteira sem pintar nada
// de azul.

private val darkColors = darkColorScheme(
    primary = PopBlue,
    onPrimary = Color.White,
    primaryContainer = Color(0xFF0E3A66),
    onPrimaryContainer = Color(0xFFC9E3FF),
    secondary = PopGlow,
    onSecondary = Color(0xFF06243F),
    background = Color(0xFF080D14),
    onBackground = Color(0xFFEAF1F8),
    surface = Color(0xFF101822),
    onSurface = Color(0xFFEAF1F8),
    surfaceVariant = Color(0xFF18222E),
    onSurfaceVariant = Color(0xFF8B9AAB),
    outline = Color(0xFF243141),
    outlineVariant = Color(0xFF1A2332),
    error = PopRed,
    onError = Color.White,
)

// --- Claro -------------------------------------------------------------------------------------

private val lightColors = lightColorScheme(
    // PopBlueDeep, e nao PopBlue, apesar de PopBlue ser a cor da marca no painel.
    //
    // `primary` no tema claro carrega texto branco: e o fundo de todo Button do Material 3, cujo
    // labelLarge tem 14.sp -- abaixo do limiar de "texto grande" do WCAG, entao vale a regua de
    // 4.5:1. PopBlue #1687F8 com branco da 3.59:1 e reprova; PopBlueDeep #0864DC da 5.43:1 e
    // passa. (Conferido com o calculo de luminancia relativa, aferido antes contra preto/branco,
    // que tem de dar exatamente 21.00.)
    //
    // Este arquivo tinha #0864DC aqui e a troca para PopBlue veio junto com a paleta nova, sem
    // que a conta fosse refeita. O azul claro da marca continua na tela onde nao carrega texto:
    // no gradiente, no ponto do logotipo e no tema escuro, onde o fundo e escuro e a regua e outra.
    //
    // Fica igual a `secondary` logo abaixo. E feio no papel e nao muda nada na tela: nenhum
    // componente do app usa `secondary` hoje.
    primary = PopBlueDeep,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE4F1FF),
    onPrimaryContainer = Color(0xFF074C98),
    secondary = PopBlueDeep,
    onSecondary = Color.White,
    background = Color(0xFFF6F9FC),
    onBackground = Color(0xFF10243A), // --foreground do painel web
    surface = Color.White,
    onSurface = Color(0xFF10243A),
    surfaceVariant = Color(0xFFEDF3F9),
    onSurfaceVariant = Color(0xFF5F7286),
    outline = Color(0xFFD8E3ED),
    outlineVariant = Color(0xFFE8EFF5),
    error = Color(0xFFC4353A),
    onError = Color.White,
)

// --- Forma -------------------------------------------------------------------------------------
//
// O Material 3 usa 4/8/12/16dp. O iOS trabalha com raios bem maiores, e e um dos sinais mais
// baratos de que o app nao e um Android portado.

private val popShapes = Shapes(
    extraSmall = androidx.compose.foundation.shape.RoundedCornerShape(8.dp),
    small = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
    medium = androidx.compose.foundation.shape.RoundedCornerShape(18.dp),
    large = androidx.compose.foundation.shape.RoundedCornerShape(24.dp),
    extraLarge = androidx.compose.foundation.shape.RoundedCornerShape(32.dp),
)

// --- Tipografia --------------------------------------------------------------------------------
//
// Poppins e a fonte display do painel web (--font-display). Entra aqui como familia PADRAO do tema,
// e nao caso a caso, por um motivo pratico: as telas trazem 39 `fontSize` e 45 `fontWeight`
// escritos a mao e usam MaterialTheme.typography uma unica vez. Tamanho e peso escritos no
// composable sobrescrevem o tema; `fontFamily` nao -- ele desce por LocalTextStyle. Declarar a
// familia aqui alcanca a tela inteira sem tocar em nenhum dos 84 pontos.
//
// A escala abaixo substitui a do Material 3, que e afinada para Roboto. Poppins e geometrica e tem
// altura-x grande: nos tamanhos de titulo ela precisa de tracking negativo para nao parecer
// espacada, e de entrelinha mais curta para o titulo nao flutuar.

/**
 * Tres pesos reais, e isso importa mais do que parece.
 *
 * Com apenas Regular e Bold declarados, TODO peso a partir de 500 -- Medium, SemiBold, Bold,
 * ExtraBold -- resolve para o mesmo Bold. As telas pedem esses quatro pesos em 45 lugares, entao a
 * interface inteira saia com a mesma voz pesada e nada tinha destaque, porque tudo tinha.
 *
 * Declarar o SemiBold devolve a hierarquia sem tocar em nenhum ponto de chamada: onde ja se pedia
 * SemiBold, agora sai SemiBold. Medium (500) tambem cai aqui, que e o comportamento desejado --
 * Poppins Medium nao existe no projeto e SemiBold e o vizinho mais proximo.
 */
@Composable
private fun poppins() = FontFamily(
    Font(Res.font.poppins_regular, FontWeight.Normal),
    Font(Res.font.poppins_semibold, FontWeight.Medium),
    Font(Res.font.poppins_semibold, FontWeight.SemiBold),
    Font(Res.font.poppins_bold, FontWeight.Bold),
)

@Composable
private fun popTypography(): Typography {
    val poppins = poppins()
    val base = Typography()
    fun TextStyle.brand(tracking: Float) = copy(fontFamily = poppins, letterSpacing = tracking.sp)
    return base.copy(
        displayLarge = base.displayLarge.brand(-1.5f),
        displayMedium = base.displayMedium.brand(-1.0f),
        displaySmall = base.displaySmall.brand(-0.75f),
        headlineLarge = base.headlineLarge.brand(-0.75f),
        headlineMedium = base.headlineMedium.brand(-0.5f),
        headlineSmall = base.headlineSmall.brand(-0.4f),
        titleLarge = base.titleLarge.brand(-0.3f),
        titleMedium = base.titleMedium.brand(-0.1f),
        titleSmall = base.titleSmall.brand(0f),
        // O corpo fica sem tracking negativo: Poppins em tamanho pequeno ja e apertada, e fechar
        // mais prejudica a leitura -- que e o oposto do que se quer numa lista de tarefas.
        bodyLarge = base.bodyLarge.brand(0f),
        bodyMedium = base.bodyMedium.brand(0f),
        bodySmall = base.bodySmall.brand(0f),
        // Rotulos ganham tracking POSITIVO. Sao curtos, quase sempre em maiuscula ou em negrito
        // pequeno ("Alta", "Hoje", "Pendentes"), e abrir a letra e o que os faz parecer rotulo em
        // vez de texto encolhido.
        labelLarge = base.labelLarge.brand(0.2f),
        labelMedium = base.labelMedium.brand(0.4f),
        labelSmall = base.labelSmall.brand(0.6f),
    )
}

@Composable
internal fun PopTheme(light: Boolean, content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (light) lightColors else darkColors,
        typography = popTypography(),
        shapes = popShapes,
        content = content,
    )
}
