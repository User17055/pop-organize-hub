package br.com.poporganize.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ProvideTextStyle
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import br.com.poporganize.app.R

val PopBlue = Color(0xFF1687F8)
val PopBlueDark = Color(0xFF0864DC)
val PopBlueSoft: Color @Composable @ReadOnlyComposable get() = MaterialTheme.colorScheme.primaryContainer
val PopBackground: Color @Composable @ReadOnlyComposable get() = MaterialTheme.colorScheme.background
val PopSurface: Color @Composable @ReadOnlyComposable get() = MaterialTheme.colorScheme.surface
val PopSurfaceAlt: Color @Composable @ReadOnlyComposable get() = MaterialTheme.colorScheme.surfaceVariant
val PopText: Color @Composable @ReadOnlyComposable get() = MaterialTheme.colorScheme.onSurface
val PopMuted: Color @Composable @ReadOnlyComposable get() = MaterialTheme.colorScheme.onSurfaceVariant
val PopBorder: Color @Composable @ReadOnlyComposable get() = MaterialTheme.colorScheme.outline

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

private val PopDarkColors = darkColorScheme(
    primary = PopBlue,
    onPrimary = Color.White,
    primaryContainer = Color(0xFF24292B),
    onPrimaryContainer = PopBlueDark,
    background = Color(0xFF111313),
    onBackground = Color(0xFFF4F8FD),
    surface = Color(0xFF1A1D1D),
    onSurface = Color(0xFFF4F8FD),
    surfaceVariant = Color(0xFF242727),
    onSurfaceVariant = Color(0xFFA3AAAA),
    outline = Color(0xFF303536),
    error = Color(0xFFE5484D),
)

private val PopLightColors = lightColorScheme(
    primary = PopBlueDark,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE4F1FF),
    onPrimaryContainer = Color(0xFF074C98),
    background = Color(0xFFF4F7FA),
    onBackground = Color(0xFF17212B),
    surface = Color.White,
    onSurface = Color(0xFF17212B),
    surfaceVariant = Color(0xFFE9EEF3),
    onSurfaceVariant = Color(0xFF65717D),
    outline = Color(0xFFD4DCE4),
    error = Color(0xFFBA1A1A),
)

@Composable
fun PopTheme(lightTheme: Boolean = false, content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (lightTheme) PopLightColors else PopDarkColors,
        typography = PopTypography,
    ) {
        ProvideTextStyle(
            value = MaterialTheme.typography.bodyMedium,
            content = content,
        )
    }
}
