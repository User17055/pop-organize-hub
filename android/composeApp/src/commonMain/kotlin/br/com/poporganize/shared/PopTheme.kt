package br.com.poporganize.shared

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

internal val PopBlue = Color(0xFF1687F8)
internal val PopGreen = Color(0xFF18A66A)
internal val PopOrange = Color(0xFFFF9F1C)
internal val PopRed = Color(0xFFE5484D)

private val darkColors = darkColorScheme(
    primary = PopBlue,
    onPrimary = Color.White,
    primaryContainer = Color(0xFF153452),
    onPrimaryContainer = Color(0xFFD4E9FF),
    background = Color(0xFF0D1110),
    onBackground = Color(0xFFF4F8FD),
    surface = Color(0xFF191D1C),
    onSurface = Color(0xFFF4F8FD),
    surfaceVariant = Color(0xFF242928),
    onSurfaceVariant = Color(0xFFA8B1B0),
    outline = Color(0xFF35403E),
    error = PopRed,
)

private val lightColors = lightColorScheme(
    primary = Color(0xFF0864DC),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE4F1FF),
    onPrimaryContainer = Color(0xFF074C98),
    background = Color(0xFFF4F7FB),
    onBackground = Color(0xFF111923),
    surface = Color.White,
    onSurface = Color(0xFF111923),
    surfaceVariant = Color(0xFFEAF0F6),
    onSurfaceVariant = Color(0xFF657383),
    outline = Color(0xFFD5DEE7),
    error = Color(0xFFBA1A1A),
)

@Composable
internal fun PopTheme(light: Boolean, content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (light) lightColors else darkColors,
        typography = Typography(),
        content = content,
    )
}
