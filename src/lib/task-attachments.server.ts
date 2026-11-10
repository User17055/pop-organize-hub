import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { Database } from "./database";
import { databasePool, hashToken, mutateDatabase, readDatabase } from "./database.server";
import type { Task } from "./domain";
import { canViewTask, getTaskPermissions } from "./permissions";

const SESSION_COOKIE = "pop_organize_session";
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
// A VPS é compartilhada e qualquer pessoa pode criar conta pela loja: o teto impede que um espaço
// encha o disco de todos.
const MAX_WORKSPACE_BYTES = 200 * 1024 * 1024;
// Arquivo recém-gravado ainda não está na tarefa; a limpeza não pode confundi-lo com sobra.
const ORPHAN_MIN_AGE_HOURS = 1;

function attachmentError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode });
}

let tableReady: Promise<void> | null = null;

// Os arquivos ficam fora do `app_state`, que é lido e regravado inteiro a cada mudança.
async function attachmentsTable() {
  const pool = databasePool();
  tableReady ??= pool
    .execute(
      `
      CREATE TABLE IF NOT EXISTS task_attachment_files (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        workspace_id VARCHAR(190) NOT NULL,
        task_id VARCHAR(300) NOT NULL,
        name VARCHAR(255) NOT NULL,
        size_bytes BIGINT NOT NULL,
        data LONGBLOB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_task_attachment_workspace (workspace_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
    )
    .then(() => undefined)
    .catch((error) => {
      tableReady = null;
      throw error;
    });
  await tableReady;
  return pool;
}

type Platform = Awaited<ReturnType<typeof readDatabase>>;

function sessionAccount(platform: Platform, request: Request) {
  const token = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!token) return null;
  const tokenHash = hashToken(decodeURIComponent(token));
  const session = platform.sessions.find(
    (item) => item.tokenHash === tokenHash && new Date(item.expiresAt).getTime() > Date.now(),
  );
  const account = session && platform.accounts.find((item) => item.id === session.userId);
  return session && account ? { session, account } : null;
}

function activeMember(workspace: Database, accountId: string) {
  const employee = workspace.employees.find((item) => item.id === accountId);
  if (!employee) return undefined;
  if (workspace.company.kind === "personal") {
    return workspace.company.ownerId === accountId ? employee : undefined;
  }
  return employee.status === "active" ? employee : undefined;
}

/** O mesmo espaço que `resolveSessionContext` escolhe para o painel. */
function activeWorkspace(platform: Platform, accountId: string, activeCompanyId?: string) {
  return (
    platform.workspaces.find(
      (item) => item.company.id === activeCompanyId && activeMember(item, accountId),
    ) ??
    platform.workspaces.find(
      (item) =>
        item.company.kind === "personal" &&
        item.company.ownerId === accountId &&
        activeMember(item, accountId),
    )
  );
}

function permissionInput(workspace: Database, task: Task, accountId: string) {
  return {
    task,
    currentUser: activeMember(workspace, accountId),
    employees: workspace.employees,
    departments: workspace.departments,
    groups: workspace.groups,
    permissionGroups: workspace.permissionGroups,
  };
}

function cleanFileName(name: string) {
  const base = name.split(/[\\/]/).pop() ?? "";
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return clean.slice(-255) || "arquivo";
}

function sizeLabel(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function uploadTaskAttachment(request: Request) {
  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_ATTACHMENT_BYTES + 1024 * 1024) {
    throw attachmentError("O arquivo passa do limite de 20 MB.", 413);
  }
  const platform = await readDatabase();
  const logged = sessionAccount(platform, request);
  if (!logged) throw attachmentError("Sessão expirada. Faça login novamente.", 401);
  const workspace = activeWorkspace(platform, logged.account.id, logged.session.activeCompanyId);
  if (!workspace) throw attachmentError("Sessão expirada. Faça login novamente.", 401);

  const form = await request.formData();
  const taskId = form.get("taskId");
  const file = form.get("file");
  if (typeof taskId !== "string" || !(file instanceof File) || file.size === 0) {
    throw attachmentError("Escolha um arquivo.", 400);
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw attachmentError("O arquivo passa do limite de 20 MB.", 413);
  }
  const task = workspace.tasks.find((item) => item.id === taskId);
  if (!task) throw attachmentError("Tarefa não encontrada.", 404);
  if (!getTaskPermissions(permissionInput(workspace, task, logged.account.id)).canAttach) {
    throw attachmentError("Você não tem permissão para anexar arquivos nesta tarefa.", 403);
  }

  const pool = await attachmentsTable();
  const workspaceId = workspace.company.id;
  const [totals] = await pool.execute<RowDataPacket[]>(
    "SELECT COALESCE(SUM(size_bytes), 0) AS total FROM task_attachment_files WHERE workspace_id = ?",
    [workspaceId],
  );
  if (Number(totals[0]?.total ?? 0) + file.size > MAX_WORKSPACE_BYTES) {
    throw attachmentError("Este espaço atingiu o limite de 200 MB em anexos.", 413);
  }

  const fileId = randomUUID();
  const name = cleanFileName(file.name);
  try {
    await pool.execute<ResultSetHeader>(
      `INSERT INTO task_attachment_files (id, workspace_id, task_id, name, size_bytes, data)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [fileId, workspaceId, taskId, name, file.size, Buffer.from(await file.arrayBuffer())],
    );
  } catch (error) {
    if ((error as { code?: string }).code === "ER_NET_PACKET_TOO_LARGE") {
      throw attachmentError("O servidor não aceitou um arquivo deste tamanho.", 413);
    }
    throw error;
  }

  try {
    const updated = await mutateDatabase((current) => {
      const currentWorkspace = current.workspaces.find((item) => item.company.id === workspaceId);
      const currentTask = currentWorkspace?.tasks.find((item) => item.id === taskId);
      if (!currentWorkspace || !currentTask) throw attachmentError("Tarefa não encontrada.", 404);
      const permissions = getTaskPermissions(
        permissionInput(currentWorkspace, currentTask, logged.account.id),
      );
      if (!permissions.canAttach) {
        throw attachmentError("Você não tem permissão para anexar arquivos nesta tarefa.", 403);
      }
      const items = currentTask.attachmentItems ?? [];
      currentTask.attachmentItems = [
        ...items,
        {
          id: fileId,
          name,
          sizeLabel: sizeLabel(file.size),
          uploadedById: logged.account.id,
          createdAt: new Date().toISOString(),
          fileId,
        },
      ];
      currentTask.attachments = (currentTask.attachments ?? items.length) + 1;
      return currentTask;
    });
    void removeOrphanAttachmentFiles();
    return updated;
  } catch (error) {
    await pool.execute("DELETE FROM task_attachment_files WHERE id = ?", [fileId]);
    throw error;
  }
}

/** A resposta nunca abre no navegador: um HTML enviado como anexo rodaria na origem do painel. */
function downloadHeaders(name: string, size: number) {
  const ascii = name.replace(/[^\x20-\x7e]|["\\]/g, "_");
  const encoded = encodeURIComponent(name).replace(
    /['()*!]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return {
    "content-type": "application/octet-stream",
    "content-length": String(size),
    "content-disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`,
    "x-content-type-options": "nosniff",
    "content-security-policy": "sandbox; default-src 'none'",
    "cache-control": "private, no-store",
  };
}

export async function downloadTaskAttachment(request: Request, fileId: string) {
  const platform = await readDatabase();
  const logged = sessionAccount(platform, request);
  if (!logged) throw attachmentError("Sessão expirada. Faça login novamente.", 401);

  const notFound = attachmentError("Anexo não encontrado.", 404);
  const pool = await attachmentsTable();
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT workspace_id, task_id, name, data FROM task_attachment_files WHERE id = ? LIMIT 1",
    [fileId],
  );
  const row = rows[0];
  if (!row) throw notFound;
  // Sem acesso e inexistente respondem igual, para o endereço não confirmar que o arquivo existe.
  const workspace = platform.workspaces.find((item) => item.company.id === row.workspace_id);
  const task = workspace?.tasks.find((item) => item.id === row.task_id);
  if (!workspace || !task || !activeMember(workspace, logged.account.id)) throw notFound;
  if (!task.attachmentItems?.some((item) => item.fileId === fileId)) throw notFound;
  if (!canViewTask(permissionInput(workspace, task, logged.account.id))) throw notFound;

  const data = row.data as Buffer;
  return new Response(new Uint8Array(data), {
    status: 200,
    headers: downloadHeaders(String(row.name), data.length),
  });
}

/**
 * Apaga o arquivo que nenhuma tarefa cita mais. O download já recusa esses arquivos na hora; isto
 * libera o espaço e não deixa cópia de tarefa ou conta excluída. Falha aqui não pode derrubar a ação
 * que a chamou.
 */
export async function removeOrphanAttachmentFiles() {
  try {
    const pool = await attachmentsTable();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id FROM task_attachment_files
       WHERE created_at < NOW() - INTERVAL ${ORPHAN_MIN_AGE_HOURS} HOUR`,
    );
    if (rows.length === 0) return;
    const platform = await readDatabase();
    const referenced = new Set(
      platform.workspaces.flatMap((workspace) =>
        workspace.tasks.flatMap((task) => (task.attachmentItems ?? []).map((item) => item.fileId)),
      ),
    );
    for (const row of rows) {
      if (!referenced.has(String(row.id))) {
        await pool.execute("DELETE FROM task_attachment_files WHERE id = ?", [row.id]);
      }
    }
  } catch (error) {
    console.error("Attachment cleanup failed", error);
  }
}

/**
 * Apaga na hora o arquivo de um anexo que acabou de ser removido, sem esperar a limpeza de sobras
 * (que só olha arquivo com mais de uma hora). Confere antes que nenhuma tarefa o cite mais. Falha
 * aqui não desfaz a remoção: o download já recusa o arquivo, e a limpeza de sobras o pega depois.
 */
export async function deleteRemovedAttachmentFile(fileId: string) {
  try {
    const platform = await readDatabase();
    const stillReferenced = platform.workspaces.some((workspace) =>
      workspace.tasks.some((task) => task.attachmentItems?.some((item) => item.fileId === fileId)),
    );
    if (stillReferenced) return;
    const pool = await attachmentsTable();
    await pool.execute("DELETE FROM task_attachment_files WHERE id = ?", [fileId]);
  } catch (error) {
    console.error("Attachment removal cleanup failed", error);
  }
}

export function attachmentErrorResponse(error: unknown) {
  const status =
    typeof error === "object" && error && "statusCode" in error
      ? Number((error as { statusCode?: number }).statusCode) || 500
      : 500;
  if (status === 500) console.error("Task attachment failed", error);
  const message =
    status !== 500 && error instanceof Error
      ? error.message
      : "Não foi possível processar o anexo.";
  return Response.json({ error: message }, { status });
}
