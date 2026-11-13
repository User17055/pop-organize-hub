package br.com.poporganize.app.ui

import java.text.Normalizer

internal fun isPopVoiceConfirmation(text: String, ageMs: Long, end: Long, consumedEnd: Long): Boolean {
    val normalized = Normalizer.normalize(text, Normalizer.Form.NFD).replace(Regex("\\p{M}"), "").lowercase().trim()
    return ageMs in 0..20_000 && end > consumedEnd && Regex("^(sim[, ]+)?eu confirmo[.!?, ]*$").matches(normalized)
}
