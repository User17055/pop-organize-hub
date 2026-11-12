package br.com.poporganize.app.data

import org.junit.Assert.*
import br.com.poporganize.shared.sync.*
import org.junit.Test

class TaskSyncTest {
    private val base = mapOf("title" to "Original", "description" to "", "canEdit" to "true", "checklist" to "[]")

    @Test fun laterServerEditAfterAnAcknowledgedUploadDoesNotGetUndone() {
        val submitted = base + ("title" to "Celular A")
        val laterServer = base + ("title" to "Celular B")
        assertEquals(laterServer, reconcileTaskFields(base, submitted, laterServer, submitted).task)
        val newLocal = submitted + ("title" to "Nova edição local")
        val next = reconcileTaskFields(base, newLocal, laterServer, submitted)
        assertEquals("Nova edição local", next.task["title"])
        assertEquals("Celular A", next.baseline["title"])
    }

    @Test fun remoteChangesMergeWithOnlyLocallyChangedFields() {
        val result = reconcileTaskFields(base, base + ("title" to "Local"), base + ("description" to "Site"))
        assertEquals("Local", result.task["title"])
        assertEquals("Site", result.task["description"])
        assertEquals("Original", result.baseline["title"])
        assertEquals("Site", result.baseline["description"])
    }
    @Test fun conflictsKeepOriginalBaseAcrossRetries() {
        val local = base + ("title" to "Local")
        val remote = base + ("title" to "Site")
        val first = reconcileTaskFields(base, local, remote)
        val retry = reconcileTaskFields(first.baseline, first.task, remote)
        assertEquals("Original", retry.baseline["title"])
        assertEquals("Local", retry.task["title"])
    }
    @Test fun editMadeDuringUploadUsesAcceptedVersionAsBase() {
        val submitted = base + ("title" to "Primeiro")
        val latest = base + ("title" to "Segundo")
        val result = reconcileTaskFields(base, latest, submitted, submitted)
        assertEquals("Segundo", result.task["title"])
        assertEquals("Primeiro", result.baseline["title"])
    }
    @Test fun permissionRevocationUsesServerData() {
        val remote = base + mapOf("title" to "Site", "canEdit" to "false")
        assertEquals(remote, reconcileTaskFields(base, base + ("title" to "Local"), remote, canEdit = false).task)
    }
    @Test fun serverCanClearChecklistAndAttachment() {
        val old = base + mapOf("checklist" to "[old]", "attachmentName" to "old.pdf")
        val remote = base + ("attachmentName" to "")
        assertEquals(remote, reconcileTaskFields(old, old, remote).task)
    }
    @Test fun onlySubmittedDeletionsAreAcknowledged() {
        assertEquals(listOf("new"), remainingTaskDeletions(listOf("sent", "new"), listOf("sent")))
    }
    @Test fun workspaceReorderingRetainsCorrectGroupReferences() {
        val a = mutableListOf("A"); val b = mutableListOf("B")
        val result = remapWorkspaceTasks(listOf("a", "b"), listOf(a, b), listOf("b", "c", "a")) { mutableListOf(it) }
        assertSame(b, result[0]); assertEquals(listOf("c"), result[1]); assertSame(a, result[2])
    }
    @Test fun replacementAtSameIndexDoesNotReuseAnotherWorkspace() {
        assertEquals(listOf(listOf("c")), remapWorkspaceTasks(listOf("a"), listOf(listOf("A")), listOf("c")) { listOf(it) })
    }
    @Test fun acceptedRemoteValuesClearPendingChange() {
        val local = base + ("title" to "Local")
        val result = reconcileTaskFields(base, local, local)
        assertFalse(taskHasChanges(result.baseline, result.task))
    }
    @Test fun equivalentWireFormattingDoesNotCreatePendingChanges() {
        assertFalse(taskHasChanges(mapOf("title" to "  Texto  ", "duration" to "1 hora", "reminder" to "Sem lembrete"),
            mapOf("title" to "Texto", "duration" to "60 min", "reminder" to "Sem notificação")))
    }
}
