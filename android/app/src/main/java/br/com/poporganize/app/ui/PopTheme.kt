package br.com.poporganize.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ProvideTextStyle
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import br.com.poporganize.app.R

val PopBlue = Color(0xFF1687F8)
val PopBlueDark = Color(0xFF0864DC)
val PopBlueSoft = Color(0xFFEAF5FF)
val PopBackground = Color.White
val PopText = Color(0xFF132238)
val PopMuted = Color(0xFF718096)
val PopBorder = Color(0xFFDCEBFA)

val PoppinsFontFamily = FontFamily(
    Font(R.font.poppins_regular, FontWeight.Normal),
    Font(R.font.poppins_semibold, FontWeight.SemiBold),
    Font(R.font.poppins_bold, FontWeight.Bold),
    Font(R.font.poppins_bold, FontWeight.ExtraBold),
)

private fun TextStyle.withPoppins() = copy(fontFamily = PoppinsFontFamily)

private val baseTypography = Typography()
private val PopTypography = Typography(
    displayLarge = baseTypography.displayLarge.withPoppins(),
    displayMedium = baseTypography.displayMedium.withPoppins(),
    displaySmall = baseTypography.displaySmall.withPoppins(),
    headlineLarge = baseTypography.headlineLarge.withPoppins(),
    headlineMedium = baseTypography.headlineMedium.withPoppins(),
    headlineSmall = baseTypography.headlineSmall.withPoppins(),
    titleLarge = baseTypography.titleLarge.withPoppins(),
    titleMedium = baseTypography.titleMedium.withPoppins(),
    titleSmall = baseTypography.titleSmall.withPoppins(),
    bodyLarge = baseTypography.bodyLarge.withPoppins(),
    bodyMedium = baseTypography.bodyMedium.withPoppins(),
    bodySmall = baseTypography.bodySmall.withPoppins(),
    labelLarge = baseTypography.labelLarge.withPoppins(),
    labelMedium = baseTypography.labelMedium.withPoppins(),
    labelSmall = baseTypography.labelSmall.withPoppins(),
)

private val PopColors = lightColorScheme(
    primary = PopBlue,
    onPrimary = Color.White,
    primaryContainer = PopBlueSoft,
    onPrimaryContainer = PopBlueDark,
    background = PopBackground,
    onBackground = PopText,
    surface = Color.White,
    onSurface = PopText,
    surfaceVariant = Color(0xFFF4F9FE),
    onSurfaceVariant = PopMuted,
    outline = PopBorder,
    error = Color(0xFFE5484D),
)

@Composable
fun PopTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = PopColors,
        typography = PopTypography,
    ) {
        ProvideTextStyle(
            value = MaterialTheme.typography.bodyMedium,
            content = content,
        )
    }
}
