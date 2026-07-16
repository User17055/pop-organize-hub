package br.com.poporganize.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val PopBlue = Color(0xFF1687F8)
val PopBlueDark = Color(0xFF0864DC)
val PopBlueSoft = Color(0xFFEAF5FF)
val PopBackground = Color.White
val PopText = Color(0xFF132238)
val PopMuted = Color(0xFF718096)
val PopBorder = Color(0xFFDCEBFA)

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
        content = content,
    )
}
