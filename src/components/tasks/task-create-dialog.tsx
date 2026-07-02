import type { FormEvent } from "react";
import { Repeat } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { priorityLabels, type Employee, type Priority } from "@/lib/domain";
import { Field } from "@/components/form-field";
import { RecurrenceFields } from "./recurrence-fields";
import type { TaskFormState } from "./task-form-types";

export function TaskCreateDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  onSubmit,
  isSubmitting,
  errorMessage,
  employees,
  targetOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: TaskFormState;
  onFormChange: (updater: (current: TaskFormState) => TaskFormState) => void;
  onSubmit: (event: FormEvent) => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
  employees: Employee[];
  targetOptions: Array<{ value: string; label: string }>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
            <DialogDescription>
              Preencha os dados abaixo para criar uma nova tarefa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 mt-4">
            <Field label="Título">
              <input
                value={form.title}
                onChange={(e) => onFormChange((current) => ({ ...current, title: e.target.value }))}
                className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
                placeholder="Ex: Criar campanha..."
                required
              />
            </Field>
            <Field label="Descrição">
              <textarea
                value={form.description}
                onChange={(e) =>
                  onFormChange((current) => ({ ...current, description: e.target.value }))
                }
                rows={3}
                className="w-full px-3 py-2 rounded-md bg-background border border-input outline-none focus:border-primary text-sm resize-none"
                required
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Prioridade">
                <select
                  value={form.priority}
                  onChange={(e) =>
                    onFormChange((current) => ({
                      ...current,
                      priority: e.target.value as Priority,
                    }))
                  }
                  className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
                >
                  {Object.entries(priorityLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Prazo">
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    onFormChange((current) => ({ ...current, dueDate: e.target.value }))
                  }
                  className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
                  required
                />
              </Field>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Repeat className="h-3.5 w-3.5" />
                Recorrência
              </div>
              <RecurrenceFields
                value={form.recurrence}
                onChange={(recurrence) => onFormChange((current) => ({ ...current, recurrence }))}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Ao concluir, a próxima ocorrência será criada automaticamente se ainda estiver no
                prazo definido.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Destino">
                <select
                  value={form.targetKey}
                  onChange={(e) =>
                    onFormChange((current) => ({ ...current, targetKey: e.target.value }))
                  }
                  className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
                >
                  {targetOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Responsável">
                <select
                  value={form.responsibleId}
                  onChange={(e) =>
                    onFormChange((current) => ({ ...current, responsibleId: e.target.value }))
                  }
                  className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
                >
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.requiresReview}
                onChange={(e) =>
                  onFormChange((current) => ({ ...current, requiresReview: e.target.checked }))
                }
                className="rounded border-input accent-primary"
              />
              Precisa de revisão
            </label>
            {form.requiresReview && (
              <Field label="Revisor">
                <select
                  value={form.reviewerId}
                  onChange={(e) =>
                    onFormChange((current) => ({ ...current, reviewerId: e.target.value }))
                  }
                  className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
                >
                  <option value="">Usar o responsável</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Tags">
              <input
                value={form.tags}
                onChange={(e) => onFormChange((current) => ({ ...current, tags: e.target.value }))}
                className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
                placeholder="Separadas por vírgula"
              />
            </Field>
            {errorMessage && <div className="text-sm text-destructive">{errorMessage}</div>}
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 rounded-md border border-border text-sm font-medium hover:bg-muted transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ background: "var(--gradient-primary)" }}
              className="h-9 px-5 rounded-xl text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-60 shadow-[var(--shadow-elegant)]"
            >
              {isSubmitting ? "Criando..." : "Criar tarefa"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
