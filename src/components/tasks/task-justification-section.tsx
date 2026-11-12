import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, Clock, Pencil, RotateCcw } from "lucide-react";
import { justifyTask } from "@/lib/api/pop-organize.functions";
import { workspaceQueryKey, type WorkspaceResult } from "@/lib/api/use-workspace";
import type { Task, TaskJustification } from "@/lib/domain";
import {
  activeJustification,
  justificationChoices,
  JUSTIFICATION_TEXT_MAX,
  JUSTIFICATION_TEXT_MIN,
  localIsoDate,
} from "@/lib/task-justification";
import { cn } from "@/lib/utils";

type Editing = { kind: TaskJustification["kind"]; text: string } | null;

/**
 * F11: justificar tarefa não concluída. "Vou fazer depois" só em atrasada; "não será feita" em
 * qualquer aberta (vira "Cancelada"). Quem pode justificar edita ou desfaz; cada mudança vira
 * comentário automático no servidor. A regra está em `task-justification.ts`.
 */
export function TaskJustificationSection({
  task,
  canJustify,
  authorName,
}: {
  task: Task;
  canJustify: boolean;
  authorName: (id: string) => string | undefined;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Editing>(null);
  const current = activeJustification(task);
  const choices = justificationChoices(task, localIsoDate());

  const mutation = useMutation({
    mutationFn: (
      payload: { mode: "set"; kind: TaskJustification["kind"]; text: string } | { mode: "undo" },
    ) => justifyTask({ data: { taskId: task.id, ...payload } }),
    onSuccess: (updatedTask) => {
      setEditing(null);
      queryClient.setQueryData<WorkspaceResult>(workspaceQueryKey, (data) =>
        data
          ? {
              ...data,
              tasks: data.tasks.map((item) =>
                item.id === updatedTask.id ? { ...item, ...updatedTask } : item,
              ),
            }
          : data,
      );
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  const canceled = task.status === "canceled";
  const offers = canJustify && (choices.later || choices.notDone || choices.undo);
  if (!current && !canceled && !offers) return null;

  const start = (kind: TaskJustification["kind"]) => {
    mutation.reset();
    setEditing({ kind, text: current?.kind === kind ? current.text : "" });
  };
  const trimmed = editing?.text.trim() ?? "";
  const author = current ? authorName(current.authorId) : undefined;
  const when = current
    ? new Date(current.updatedAt ?? current.createdAt).toLocaleDateString("pt-BR")
    : "";

  return (
    <section
      aria-label="Justificativa"
      className={cn(
        "mt-3 rounded-2xl border p-3",
        canceled
          ? "border-border bg-muted/40"
          : current
            ? "border-amber-500/25 bg-amber-500/10"
            : "border-border/70 bg-background/50",
      )}
    >
      {current ? (
        <div className="flex items-start gap-2.5">
          {canceled ? (
            <Ban className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-foreground">
              {canceled ? "Cancelada: não será feita" : "Justificada: vai fazer depois"}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/85">
              {current.text}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {author ? `${author} · ` : ""}
              {when}
            </p>
          </div>
        </div>
      ) : canceled ? (
        <p className="text-xs font-bold text-foreground">Tarefa cancelada</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {choices.later
            ? "Não deu para concluir no prazo? Justifique o atraso ou diga que ela não será feita."
            : "Se esta tarefa não vai mais ser feita, registre o motivo."}
        </p>
      )}

      {editing ? (
        <div className="mt-3 space-y-2">
          <label className="block text-[11px] font-semibold text-muted-foreground">
            {editing.kind === "later"
              ? "Por que atrasou e quando vai fazer?"
              : "Por que não será feita?"}
            <textarea
              value={editing.text}
              autoFocus
              maxLength={JUSTIFICATION_TEXT_MAX}
              onChange={(event) => setEditing({ ...editing, text: event.target.value })}
              rows={3}
              className="mt-1 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-xs font-normal text-foreground outline-none transition focus:border-primary"
            />
          </label>
          {mutation.error && (
            <p className="text-[11px] text-destructive">{mutation.error.message}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="h-8 rounded-md px-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={mutation.isPending || trimmed.length < JUSTIFICATION_TEXT_MIN}
              onClick={() => mutation.mutate({ mode: "set", kind: editing.kind, text: trimmed })}
              className="h-8 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {mutation.isPending
                ? "Salvando..."
                : editing.kind === "not_done"
                  ? "Cancelar a tarefa"
                  : "Salvar justificativa"}
            </button>
          </div>
        </div>
      ) : (
        canJustify && (
          <div className="mt-3 flex flex-wrap gap-2">
            {choices.later && (
              <JustifyButton onClick={() => start("later")} icon={Clock}>
                Justificar atraso
              </JustifyButton>
            )}
            {current && (
              <JustifyButton onClick={() => start(current.kind)} icon={Pencil}>
                Editar
              </JustifyButton>
            )}
            {choices.notDone && (
              <JustifyButton onClick={() => start("not_done")} icon={Ban}>
                Não será feita
              </JustifyButton>
            )}
            {choices.undo && (
              <JustifyButton
                onClick={() => mutation.mutate({ mode: "undo" })}
                icon={RotateCcw}
                disabled={mutation.isPending}
              >
                {canceled ? "Reabrir tarefa" : "Remover justificativa"}
              </JustifyButton>
            )}
            {mutation.error && (
              <p className="w-full text-[11px] text-destructive">{mutation.error.message}</p>
            )}
          </div>
        )
      )}
    </section>
  );
}

function JustifyButton({
  onClick,
  icon: Icon,
  disabled,
  children,
}: {
  onClick: () => void;
  icon: typeof Clock;
  disabled?: boolean;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-background/70 px-2.5 text-xs font-semibold text-foreground/80 transition hover:border-primary/30 hover:text-primary disabled:opacity-60"
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}
