import { CalendarClock, X } from "lucide-react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";

export function RecurringDateDialog({
  date,
  onClose,
  onConfirm,
}: {
  /** A data nova. Sem ela, o diálogo fica fechado. */
  date?: string;
  onClose: () => void;
  onConfirm: (scope: "this" | "following") => void;
}) {
  if (!date) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-300 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.section
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="recurring-date-title"
        className="w-full max-w-md rounded-3xl border border-white/70 bg-background p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-primary/10 text-primary">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="recurring-date-title" className="font-display text-lg font-bold">
              Mudar a data
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Esta atividade se repete. A nova data (
              {new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR")}) vale para quais
              ocorrências?
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="glass-icon-button flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            aria-label="Voltar à edição"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={() => onConfirm("this")}
            className="h-12 rounded-[15px] bg-primary text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
          >
            Só esta
          </button>
          <button
            type="button"
            onClick={() => onConfirm("following")}
            className="h-12 rounded-[15px] border border-border bg-background text-sm font-bold transition hover:border-primary/30 hover:text-primary"
          >
            Esta e as seguintes
          </button>
          <p className="px-1 text-xs leading-relaxed text-muted-foreground">
            Em “Esta e as seguintes”, a repetição passa a seguir a nova data. As anteriores ficam
            como estão.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-[13px] text-sm font-semibold text-muted-foreground transition hover:text-foreground"
          >
            Voltar
          </button>
        </div>
      </motion.section>
    </div>,
    document.body,
  );
}
