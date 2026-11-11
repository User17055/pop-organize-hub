import type { Task, TaskJustification } from "./domain";
import { nextId } from "./database";

/**
 * Justificar tarefa não concluída (F11). Uma regra só para o painel, o endpoint móvel e as
 * contagens de atrasadas, para os três não dizerem coisas diferentes.
 *
 * - "Vou fazer depois" (`later`): só em tarefa atrasada. Ela segue aberta e atrasada, com o selo
 *   "Justificada"; as contagens mostram "X atrasadas (Y justificadas)".
 * - "Não será feita" (`not_done`): em qualquer tarefa aberta. Ela vira "Cancelada", com o motivo, e
 *   sai das atrasadas.
 * - Quem pode justificar edita o texto ou desfaz; "não será feita" desfeita volta a pendente.
 *   Cada mudança vira um comentário automático, que é o histórico que o gestor lê.
 *
 * A permissão (quem justifica) é a de quem muda o status: `canChangeStatus`. Quem chama confere.
 */

export const JUSTIFICATION_TEXT_MIN = 3;
export const JUSTIFICATION_TEXT_MAX = 500;

export const justificationKindLabels: Record<TaskJustification["kind"], string> = {
  later: "Vai fazer depois",
  not_done: "Não será feita",
};

type StatusAndDate = Pick<Task, "status" | "dueDate">;

/** AAAA-MM-DD no fuso do navegador: o que a tela usa para "atrasada". */
export function localIsoDate(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** O "hoje" do servidor, no mesmo fuso que o endpoint móvel usa para ocorrência futura. */
export function saoPauloToday(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(date);
}

/** Aberta = ainda tem trabalho a fazer. Concluída e cancelada não contam como atrasadas. */
export function isTaskOpen(task: Pick<Task, "status">) {
  return task.status !== "completed" && task.status !== "canceled";
}

/** `today` em AAAA-MM-DD, no fuso de quem chama. */
export function isTaskOverdue(task: StatusAndDate, today: string) {
  return isTaskOpen(task) && task.dueDate < today;
}

/**
 * A justificativa que vale agora. Uma "vou fazer depois" deixada numa tarefa que depois foi
 * concluída, ou um "não será feita" de uma tarefa reaberta por outro caminho, não aparecem.
 */
export function activeJustification(
  task: Pick<Task, "status" | "justification">,
): TaskJustification | undefined {
  const justification = task.justification;
  if (!justification) return undefined;
  if (task.status === "canceled")
    return justification.kind === "not_done" ? justification : undefined;
  if (isTaskOpen(task)) return justification.kind === "later" ? justification : undefined;
  return undefined;
}

/** Atrasada e com "vou fazer depois": o selo "Justificada". */
export function isJustifiedOverdue(
  task: StatusAndDate & Pick<Task, "justification">,
  today: string,
) {
  return isTaskOverdue(task, today) && activeJustification(task)?.kind === "later";
}

export function countOverdue(
  tasks: Array<StatusAndDate & Pick<Task, "justification">>,
  today: string,
) {
  let overdue = 0;
  let justified = 0;
  for (const task of tasks) {
    if (!isTaskOverdue(task, today)) continue;
    overdue += 1;
    if (activeJustification(task)?.kind === "later") justified += 1;
  }
  return { overdue, justified };
}

/** "3 atrasadas" ou "3 atrasadas (1 justificada)". */
export function overdueLabel(overdue: number, justified: number) {
  const base = `${overdue} ${overdue === 1 ? "atrasada" : "atrasadas"}`;
  if (justified === 0) return base;
  return `${base} (${justified} ${justified === 1 ? "justificada" : "justificadas"})`;
}

/** O que a tela pode oferecer nesta tarefa, além da permissão. */
export function justificationChoices(
  task: StatusAndDate & Pick<Task, "justification">,
  today: string,
) {
  const current = activeJustification(task);
  const open = isTaskOpen(task);
  return {
    later: open && isTaskOverdue(task, today) && current === undefined,
    notDone: open && current?.kind !== "not_done",
    edit: current !== undefined,
    undo: current !== undefined || task.status === "canceled",
  };
}

export type JustificationRequest =
  { action: "set"; kind: TaskJustification["kind"]; text: string } | { action: "undo" };

export class JustificationError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
  }
}

function justificationText(value: unknown) {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (text.length < JUSTIFICATION_TEXT_MIN) {
    throw new JustificationError(
      `Escreva o motivo (pelo menos ${JUSTIFICATION_TEXT_MIN} caracteres).`,
    );
  }
  if (text.length > JUSTIFICATION_TEXT_MAX) {
    throw new JustificationError(`O motivo pode ter até ${JUSTIFICATION_TEXT_MAX} caracteres.`);
  }
  return text;
}

/** Lê a entrada crua (painel ou aparelho) e recusa o que não for um pedido válido. */
export function parseJustificationRequest(input: Record<string, unknown>): JustificationRequest {
  if (input.undo === true || input.mode === "undo") return { action: "undo" };
  const kind = input.kind;
  if (kind !== "later" && kind !== "not_done") {
    throw new JustificationError("Tipo de justificativa inválido.");
  }
  return { action: "set", kind, text: justificationText(input.text) };
}

function addAutomaticComment(task: Task, authorId: string, body: string, now: string) {
  const currentCount = task.comments ?? task.commentItems?.length ?? 0;
  task.commentItems = task.commentItems ?? [];
  task.commentItems.push({ id: nextId("tc", task.commentItems), authorId, body, createdAt: now });
  task.comments = currentCount + 1;
}

/**
 * Aplica o pedido na tarefa (já conferida a permissão) e grava o comentário automático. Devolve o
 * texto do comentário. `now` em ISO; `today` em AAAA-MM-DD.
 */
export function applyTaskJustification(
  task: Task,
  request: JustificationRequest,
  actorId: string,
  now: string,
  today: string,
) {
  const current = activeJustification(task);
  const choices = justificationChoices(task, today);
  let comment: string;

  if (request.action === "undo") {
    if (!choices.undo) throw new JustificationError("Não há justificativa para desfazer.", 409);
    if (task.status === "canceled") {
      task.status = "pending";
      comment = "Reabriu a tarefa (desfez “não será feita”).";
    } else {
      comment = "Removeu a justificativa do atraso.";
    }
    delete task.justification;
  } else if (current && current.kind === request.kind) {
    if (current.text === request.text) return null;
    task.justification = { ...current, text: request.text, updatedAt: now };
    comment =
      request.kind === "later"
        ? `Editou a justificativa do atraso: ${request.text}`
        : `Editou o motivo de não fazer: ${request.text}`;
  } else if (request.kind === "later") {
    if (!choices.later) {
      throw new JustificationError(
        isTaskOpen(task)
          ? "“Vou fazer depois” só vale para tarefa atrasada."
          : "Esta tarefa não está aberta.",
        409,
      );
    }
    task.justification = { kind: "later", text: request.text, authorId: actorId, createdAt: now };
    comment = `Justificou o atraso (vai fazer depois): ${request.text}`;
  } else {
    if (!choices.notDone) throw new JustificationError("Esta tarefa não está aberta.", 409);
    task.justification = {
      kind: "not_done",
      text: request.text,
      authorId: actorId,
      createdAt: now,
    };
    task.status = "canceled";
    comment = `Marcou como não será feita: ${request.text}`;
  }

  addAutomaticComment(task, actorId, comment, now);
  return comment;
}
