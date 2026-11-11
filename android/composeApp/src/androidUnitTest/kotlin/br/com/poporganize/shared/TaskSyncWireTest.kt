package br.com.poporganize.shared

import kotlinx.serialization.json.Json
import org.junit.Assert.*
import org.junit.Test

class TaskSyncWireTest {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true; explicitNulls = false }
    private val wire = TaskSyncWire(json) { it.toPopTask(WorkspaceKind.Company, "c1").toApiTask() }
    private val base = ApiTask(id = 1, serverId = "t1", title = "Original", dueDate = "2026-11-11",
        dueLabel = "Hoje", department = "Equipe", assignmentType = "department", assignmentTargetId = "d1",
        assignmentTargetLabel = "Equipe", assignee = "Ana", assignees = listOf("Ana"))
    @Test fun unchangedRoundTripDoesNotCreateMutation() {
        assertNull(wire.mutation(base, base.toPopTask(WorkspaceKind.Company, "c1").toApiTask()))
    }
    @Test fun editingTitlePreservesCanonicalRoutingAndPresentation() {
        val local = base.toPopTask(WorkspaceKind.Company, "c1").copy(title = "Novo").toApiTask()
        val mutation = wire.mutation(base, local)!!
        assertEquals("Novo", mutation.title); assertEquals(base.assignees, mutation.assignees)
        assertEquals("Hoje", mutation.dueLabel); assertEquals("d1", mutation.assignmentTargetId)
    }
    @Test fun remotePermissionRevocationSurvivesNormalization() {
        val local = base.toPopTask(WorkspaceKind.Company, "c1").copy(title = "Local").toApiTask()
        val result = wire.reconcile(base, local, base.copy(title = "Site", canEdit = false))
        assertEquals("Site", result.first.title); assertFalse(result.first.canEdit)
    }
    @Test fun conflictKeepsOriginalCanonicalBaseForNextAttempt() {
        val local = base.toPopTask(WorkspaceKind.Company, "c1").copy(title = "Local").toApiTask()
        val result = wire.reconcile(base, local, base.copy(title = "Site"))
        assertEquals("Local", result.first.title); assertEquals("Original", result.second.title)
    }
    @Test fun acknowledgedSubmissionRebasesEditsMadeInFlight() {
        val submitted = base.copy(title = "Primeiro")
        val latest = submitted.toPopTask(WorkspaceKind.Company, "c1").copy(title = "Segundo").toApiTask()
        val result = wire.reconcile(base, latest, submitted, submitted)
        assertEquals("Segundo", result.first.title); assertEquals("Primeiro", result.second.title)
    }
}
