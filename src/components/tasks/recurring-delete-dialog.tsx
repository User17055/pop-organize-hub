import { Repeat, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import type { Task } from "@/lib/domain";

export function RecurringDeleteDialog({
  task,
  occurrenceDate,
  open,
  pending,
  onClose,
  onConfirm,
}: {
  task: Task | null;
  occurrenceDate?: string;
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onConfirm: (scope?: "occurrence" | "series") => void;
}) {
  if (!open || !task) return null;
  const isRecurring = Boolean(task.recurrence);
  const date = occurrenceDate ?? task.dueDate;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <motion.section
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-task-title"
        className="w-full max-w-md rounded-[24px] border border-white/70 bg-background p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-destructive/10 text-destructive">
            <AnimatePresence mode="wait">
              <motion.span
                key={pending ? "deleting" : "idle"}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={
                  pending
                    ? { opacity: 1, scale: 1, rotate: [0, -10, 10, -5, 0] }
                    : { opacity: 1, scale: 1, rotate: 0 }
                }
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: pending ? 0.55 : 0.2, repeat: pending ? Infinity : 0 }}
              >
                {isRecurring ? <Repeat className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="delete-task-title" className="font-display text-lg font-bold">
              {isRecurring ? "Excluir atividade recorrente" : "Excluir atividade"}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {isRecurring
                ? "Escolha se deseja remover somente esta ocorrência ou toda a série."
                : `A atividade “${task.title}” será removida permanentemente.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="glass-icon-button flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            aria-label="Cancelar exclusão"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isRecurring && (
          <div className="mt-4 rounded-[16px] border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground">
            Ocorrência selecionada:{" "}
            <strong className="text-foreground">
              {new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR")}
            </strong>
          </div>
        )}

        <div className="mt-5 grid gap-2">
          {isRecurring && (
            <button
              type="button"
              disabled={pending}
              onClick={() => onConfirm("occurrence")}
              className="h-12 rounded-[15px] border border-border bg-background text-sm font-bold transition hover:border-primary/30 hover:text-primary disabled:opacity-60"
            >
              Excluir somente esta data
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => onConfirm(isRecurring ? "series" : undefined)}
            className="h-12 rounded-[15px] bg-destructive text-sm font-bold text-destructive-foreground transition hover:bg-destructive/90 disabled:opacity-60"
          >
            {pending
              ? "Excluindo..."
              : isRecurring
                ? "Excluir toda a recorrência"
                : "Confirmar exclusão"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onClose}
            className="h-10 rounded-[13px] text-sm font-semibold text-muted-foreground transition hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
      </motion.section>
    </div>,
    document.body,
  );
}
