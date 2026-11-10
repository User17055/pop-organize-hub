import type { Database } from "./database";
import { invalidateNativeShadow } from "./native-shadow";

/**
 * Cancela um convite pendente. O painel e o endpoint móvel chamam esta função; a permissão
 * (`manage.employees`, a mesma de convidar e reenviar) fica com cada um, como já era.
 *
 * Uma tarefa pode ser atribuída a quem ainda não aceitou: o id do convite entra no alvo, nos
 * responsáveis ou no revisor, e `transferInvitationAssignments` o troca pelo id da conta no aceite.
 * Cancelado o convite, esse id não aponta para mais ninguém, então a tarefa é liberada do mesmo
 * jeito que na exclusão de funcionário: alvo pessoal vai para a empresa, responsável e revisor saem.
 *
 * Devolve `false` quando o convite não existe.
 */
export function removeInvitation(workspace: Database, invitationId: string): boolean {
  if (!workspace.invitations.some((invitation) => invitation.id === invitationId)) return false;
  workspace.invitations = workspace.invitations.filter(
    (invitation) => invitation.id !== invitationId,
  );

  for (const task of workspace.tasks) {
    const wasResponsible =
      task.responsibleId === invitationId || (task.responsibleIds?.includes(invitationId) ?? false);
    if (wasResponsible) {
      task.responsibleIds = task.responsibleIds?.filter((id) => id !== invitationId);
      if (task.responsibleId === invitationId) {
        task.responsibleId = task.responsibleIds?.[0] ?? "";
      }
      invalidateNativeShadow(task, "responsible");
    }
    if (task.reviewerId === invitationId) task.reviewerId = undefined;
    if (task.target.type === "user" && task.target.id === invitationId) {
      task.target = { type: "company", id: workspace.company.id, label: workspace.company.name };
      invalidateNativeShadow(task, "target");
    }
  }
  return true;
}
