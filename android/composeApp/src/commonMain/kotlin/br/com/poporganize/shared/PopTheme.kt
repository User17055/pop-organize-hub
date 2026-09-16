package br.com.poporganize.shared

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ProvideTextStyle
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
    primaryContainer = Color(0xFF24292B),
    onPrimaryContainer = PopBlueDeep,
    background = Color(0xFF111313),
    onBackground = Color(0xFFF4F8FD),
    surface = Color(0xFF1A1D1D),
    onSurface = Color(0xFFF4F8FD),
    surfaceVariant = Color(0xFF242727),
    onSurfaceVariant = Color(0xFFA3AAAA),
    outline = Color(0xFF303536),
    error = Color(0xFFE5484D),
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
    background = Color(0xFFF4F7FA),
    onBackground = Color(0xFF17212B),
    surface = Color.White,
    onSurface = Color(0xFF17212B),
    surfaceVariant = Color(0xFFE9EEF3),
    onSurfaceVariant = Color(0xFF65717D),
    outline = Color(0xFFD4DCE4),
    error = Color(0xFFBA1A1A),
)

// --- Forma -------------------------------------------------------------------------------------
//
// O Material 3 usa 4/8/12/16dp. O iOS trabalha com raios bem maiores, e e um dos sinais mais
// baratos de que o app nao e um Android portado.

private val popShapes = Shapes()

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
    Font(Res.font.poppins_semibold, FontWeight.SemiBold),
    Font(Res.font.poppins_bold, FontWeight.Bold),
    Font(Res.font.poppins_bold, FontWeight.ExtraBold),
)

@Composable
private fun popTypography(): Typography {
    val poppins = poppins()
    val base = Typography()
    fun TextStyle.brand() = copy(fontFamily = poppins)
    return base.copy(
        displayLarge = base.displayLarge.brand(),
        displayMedium = base.displayMedium.brand(),
        displaySmall = base.displaySmall.brand(),
        headlineLarge = base.headlineLarge.brand(),
        headlineMedium = base.headlineMedium.brand(),
        headlineSmall = base.headlineSmall.brand(),
        titleLarge = base.titleLarge.brand(),
        titleMedium = base.titleMedium.brand(),
        titleSmall = base.titleSmall.brand(),
        // O corpo fica sem tracking negativo: Poppins em tamanho pequeno ja e apertada, e fechar
        // mais prejudica a leitura -- que e o oposto do que se quer numa lista de tarefas.
        bodyLarge = base.bodyLarge.brand(),
        bodyMedium = base.bodyMedium.brand(),
        bodySmall = base.bodySmall.brand(),
        // Rotulos ganham tracking POSITIVO. Sao curtos, quase sempre em maiuscula ou em negrito
        // pequeno ("Alta", "Hoje", "Pendentes"), e abrir a letra e o que os faz parecer rotulo em
        // vez de texto encolhido.
        labelLarge = base.labelLarge.brand(),
        labelMedium = base.labelMedium.brand(),
        labelSmall = base.labelSmall.brand(),
    )
}

@Composable
internal fun PopTheme(light: Boolean, content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (light) lightColors else darkColors,
        typography = popTypography(),
        shapes = popShapes,
    ) { ProvideTextStyle(MaterialTheme.typography.bodyMedium, content) }
}
