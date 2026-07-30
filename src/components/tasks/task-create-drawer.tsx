import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ListChecks, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { priorityLabels, type Employee, type Priority } from "@/lib/domain";
import { Field } from "@/components/form-field";
import { GlassDatePicker } from "./glass-date-picker";
import { GlassSelect, RecurrenceFields } from "./recurrence-fields";
import type { TaskFormState } from "./task-form-types";

const inputClass =
  "task-create-input w-full h-10 px-3 rounded-md border outline-none text-sm transition";

const textareaClass =
  "task-create-input min-h-[160px] w-full resize-y rounded-md border px-3 py-2.5 text-sm leading-relaxed outline-none transition";

const companySteps = ["Dados", "Acesso", "Finalizar"] as const;
const personalSteps = ["Dados", "Recorrência", "Finalizar"] as const;

export function TaskCreateDrawer({
  open,
  onOpenChange,
  form,
  onFormChange,
  onSubmit,
  isSubmitting,
  errorMessage,
  employees,
  targetOptions,
  personalMode = false,
  canCreateChecklist = false,
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
  personalMode?: boolean;
  canCreateChecklist?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const steps = personalMode ? personalSteps : companySteps;
  const isLastStep = step === steps.length - 1;
  const isDepartmentTarget = form.targetKey.startsWith("department:");
  const isUserTarget = form.targetKey.startsWith("user:");
  const canContinue =
    step !== 0 || Boolean(form.title.trim() && form.description.trim() && form.dueDate);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    if (!open || !mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mounted, open, onOpenChange]);

  function nextStep() {
    if (!canContinue) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function previousStep() {
    setStep((current) => Math.max(current - 1, 0));
  }

  const drawer = (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[190] bg-slate-950/28 backdrop-blur-[2px] transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden={!open}
      />
      <aside
        inert={!open}
        className={cn(
          "task-create-drawer fixed inset-y-0 right-0 z-[200] flex h-dvh max-h-dvh w-full flex-col overflow-hidden rounded-none border transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:inset-y-3 sm:right-3 sm:h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-1.5rem)] sm:w-[420px] sm:rounded-lg md:w-[440px]",
          open ? "task-create-drawer-open translate-x-0" : "translate-x-full",
        )}
      >
        <form
          onSubmit={onSubmit}
          className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-lg"
        >
          <header className="task-create-header task-create-panel-section z-[60] shrink-0 border-b px-4 pb-4 pt-4 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-[22px] font-bold leading-tight text-foreground">
                  Criar tarefa
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="glass-icon-button flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-foreground"
                aria-label="Fechar nova tarefa"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {steps.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStep(index)}
                  className={cn(
                    "task-create-step pressable h-11 rounded-2xl border px-2 text-sm font-bold transition",
                    index === step
                      ? "task-create-step-active"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </header>

          <div className="task-create-body task-create-panel-section min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
            {step === 0 && (
              <>
                <Field label="Título">
                  <input
                    value={form.title}
                    onChange={(event) =>
                      onFormChange((current) => ({ ...current, title: event.target.value }))
                    }
                    className={inputClass}
                    placeholder="Ex: Criar campanha..."
                    required
                  />
                </Field>
                <Field label="Descrição">
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      onFormChange((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                    className={textareaClass}
                    required
                  />
                </Field>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Prioridade">
                    <GlassSelect
                      value={form.priority}
                      options={Object.entries(priorityLabels).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                      onChange={(priority) =>
                        onFormChange((current) => ({
                          ...current,
                          priority: priority as Priority,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Prazo">
                    <GlassDatePicker
                      value={form.dueDate}
                      onChange={(dueDate) =>
                        onFormChange((current) => ({
                          ...current,
                          dueDate,
                        }))
                      }
                      ariaLabel="Prazo da tarefa"
                      required
                    />
                  </Field>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="task-create-card rounded-lg border p-4">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-foreground/70">
                    Recorrência
                  </div>
                  <RecurrenceFields
                    value={form.recurrence}
                    onChange={(recurrence) =>
                      onFormChange((current) => ({ ...current, recurrence }))
                    }
                  />
                </div>
                {personalMode ? (
                  <div className="task-create-card rounded-2xl border p-4">
                    <div className="text-sm font-bold text-foreground">Tarefa pessoal</div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Esta tarefa fica somente no seu Meu espaço. Para atribuir tarefas a outras
                      pessoas, crie ou acesse uma empresa.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label="Visível para">
                      <GlassSelect
                        value={form.targetKey}
                        options={targetOptions}
                        onChange={(targetKey) =>
                          onFormChange((current) => ({
                            ...current,
                            targetKey,
                            responsibleId: targetKey.startsWith("user:")
                              ? ""
                              : current.responsibleId,
                          }))
                        }
                      />
                    </Field>
                    {!isUserTarget && (
                      <Field label={isDepartmentTarget ? "Responsável (opcional)" : "Responsável"}>
                        <GlassSelect
                          value={form.responsibleId}
                          options={[
                            {
                              value: "",
                              label: isDepartmentTarget
                                ? "Sem responsável — setor inteiro"
                                : "Sem responsável",
                            },
                            ...employees.map((employee) => ({
                              value: employee.id,
                              label: employee.name,
                            })),
                          ]}
                          onChange={(responsibleId) =>
                            onFormChange((current) => ({
                              ...current,
                              responsibleId,
                            }))
                          }
                        />
                      </Field>
                    )}
                  </div>
                )}
              </>
            )}

            {step === 2 && (
              <>
                {!personalMode && (
                  <label className="task-create-review-toggle task-create-card pressable flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-bold text-foreground">
                    <input
                      type="checkbox"
                      checked={form.requiresReview}
                      onChange={(event) =>
                        onFormChange((current) => ({
                          ...current,
                          requiresReview: event.target.checked,
                          reviewerId:
                            event.target.checked && !current.responsibleId && !current.reviewerId
                              ? (employees[0]?.id ?? "")
                              : current.reviewerId,
                        }))
                      }
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        "task-create-checkbox flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition",
                        form.requiresReview && "task-create-checkbox-checked",
                      )}
                      aria-hidden="true"
                    >
                      <Check className="task-create-checkbox-icon h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0">Precisa de revisão</span>
                  </label>
                )}
                {!personalMode && form.requiresReview && (
                  <Field label="Revisor">
                    <GlassSelect
                      value={form.reviewerId}
                      options={[
                        {
                          value: "",
                          label: form.responsibleId ? "Usar o responsável" : "Selecione um revisor",
                        },
                        ...employees.map((employee) => ({
                          value: employee.id,
                          label: employee.name,
                        })),
                      ]}
                      onChange={(reviewerId) =>
                        onFormChange((current) => ({
                          ...current,
                          reviewerId,
                        }))
                      }
                    />
                  </Field>
                )}
                <Field label="Tags">
                  <input
                    value={form.tags}
                    onChange={(event) =>
                      onFormChange((current) => ({ ...current, tags: event.target.value }))
                    }
                    className={inputClass}
                    placeholder="Separadas por vírgula"
                  />
                </Field>
                {canCreateChecklist && (
                  <div className="task-create-card rounded-2xl border p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                      <ListChecks className="h-4 w-4 text-primary" />
                      Checklist inicial
                    </div>
                    <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                      Digite um item por linha. Somente administradores podem incluir o checklist
                      durante o cadastro.
                    </p>
                    <textarea
                      value={form.checklist}
                      onChange={(event) =>
                        onFormChange((current) => ({
                          ...current,
                          checklist: event.target.value,
                        }))
                      }
                      rows={5}
                      className="task-create-input min-h-[120px] w-full resize-y rounded-md border px-3 py-2.5 text-sm leading-relaxed outline-none transition"
                      placeholder={
                        "Ex: Conferir materiais\nRegistrar no sistema\nEnviar confirmação"
                      }
                    />
                  </div>
                )}
              </>
            )}

            {errorMessage && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {errorMessage}
              </div>
            )}
          </div>

          <footer className="task-create-footer task-create-panel-section shrink-0 border-t px-4 py-3.5 backdrop-blur sm:px-5">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={step === 0 ? () => onOpenChange(false) : previousStep}
                className="task-create-secondary-button pressable h-12 rounded-2xl px-5 text-sm font-bold text-foreground"
              >
                {step === 0 ? "Cancelar" : "Voltar"}
              </button>
              {isLastStep ? (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="task-create-primary-button pressable h-12 flex-1 rounded-2xl text-sm font-bold transition disabled:opacity-60"
                >
                  {isSubmitting ? "Criando..." : "Criar tarefa"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!canContinue}
                  className="task-create-primary-button pressable h-12 flex-1 rounded-2xl text-sm font-bold transition disabled:opacity-55"
                >
                  Continuar
                </button>
              )}
            </div>
          </footer>
        </form>
      </aside>
    </>
  );

  return mounted ? createPortal(drawer, document.body) : null;
}
