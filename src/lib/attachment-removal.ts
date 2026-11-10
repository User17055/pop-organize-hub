import type { Task, TaskAttachment } from "./domain";
import type { TaskPermissions } from "./permissions";

/**
 * Quem pode tirar um anexo da tarefa: quem edita a tarefa, ou quem enviou o arquivo enquanto ainda
 * pode anexar nela. A gaveta usa esta mesma função para decidir se mostra o botão, para a tela e o
 * servidor não discordarem.
 */
export function canRemoveAttachment(
  attachment: Pick<TaskAttachment, "uploadedById">,
  currentUserId: string | undefined,
  permissions: Pick<TaskPermissions, "canEditContent" | "canAttach">,
) {
  if (permissions.canEditContent) return true;
  return (
    permissions.canAttach && Boolean(currentUserId) && attachment.uploadedById === currentUserId
  );
}

export type AttachmentRemovalResult =
  { ok: true; fileId?: string } | { ok: false; status: 403 | 404; message: string };

/**
 * Tira um anexo do painel da tarefa. O arquivo guardado não é apagado aqui: quem chama apaga depois
 * de gravar, porque o estado e a tabela de arquivos são gravações separadas.
 *
 * O anexo do aparelho (`nativeData.attachmentName`) não está em `attachmentItems` e não é tocado;
 * por isso a contagem só desce um, sem nunca ficar abaixo do que sobrou na lista.
 */
export function removeAttachment(
  task: Task,
  attachmentId: string,
  currentUserId: string | undefined,
  permissions: Pick<TaskPermissions, "canEditContent" | "canAttach">,
): AttachmentRemovalResult {
  const attachment = task.attachmentItems?.find((item) => item.id === attachmentId);
  if (!attachment) return { ok: false, status: 404, message: "Anexo não encontrado." };
  if (!canRemoveAttachment(attachment, currentUserId, permissions)) {
    return {
      ok: false,
      status: 403,
      message: "Só quem enviou o arquivo ou quem edita a tarefa pode removê-lo.",
    };
  }
  const remaining = (task.attachmentItems ?? []).filter((item) => item.id !== attachmentId);
  task.attachmentItems = remaining;
  task.attachments = Math.max(remaining.length, (task.attachments ?? remaining.length + 1) - 1);
  return { ok: true, fileId: attachment.fileId };
}
