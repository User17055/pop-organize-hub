package br.com.poporganize.app.ui

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PopVoiceConfirmationPolicyTest {
    @Test fun acceptsRecentExplicitConfirmation() {
        assertTrue(isPopVoiceConfirmation("Eu confirmo.", 1000, 5000, 0))
        assertTrue(isPopVoiceConfirmation("Sim, eu confirmo!", 1000, 5000, 0))
    }
    @Test fun rejectsNegationQuestionsOldSpeechAndReplays() {
        for (text in listOf("Não, eu confirmo?", "Não confirmo", "Se eu confirmo", "Eu confirmo? não", "Confirmo", "Pode criar"))
            assertFalse(text, isPopVoiceConfirmation(text, 1000, 5000, 0))
        assertFalse(isPopVoiceConfirmation("Eu confirmo", 21000, 5000, 0))
        assertFalse(isPopVoiceConfirmation("Eu confirmo", 1000, 5000, 5000))
    }
}
