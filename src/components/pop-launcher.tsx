import { useSyncExternalStore } from "react";
import { Sparkles } from "lucide-react";
import { PopAssistant, type PopTaskDraft } from "@/components/tasks/pop-assistant";
import { useTaskMutations } from "@/components/tasks/use-task-mutations";
import type { RecurrenceInput } from "@/components/tasks/task-form-types";
import { cn } from "@/lib/utils";

// Estado global mínimo para abrir a Pop de qualquer página (sidebar, FAB, botões).
let popOpen = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function openPopAssistant() {
  popOpen = true;
  notify();
}

function setPopOpen(open: boolean) {
  popOpen = open;
  notify();
}

export function PopDock() {
  const open = useSyncExternalStore(
    subscribe,
    () => popOpen,
    () => false,
  );
  const { createTaskMutation } = useTaskMutations();

  async function handleCreate(draft: PopTaskDraft) {
    if (
      !draft.title ||
      !draft.description ||
      !draft.dueDate ||
      !draft.targetType ||
      !draft.targetId
    ) {
      throw new Error("A Pop ainda não reuniu todos os dados necessários para criar a atividade.");
    }

    const recurrence: RecurrenceInput =
      draft.recurrence.frequency === "none"
        ? undefined
        : {
            frequency: draft.recurrence.frequency,
            interval: draft.recurrence.interval ?? undefined,
            intervalDays:
              draft.recurrence.frequency === "custom" && draft.recurrence.customUnit === "days"
                ? (draft.recurrence.interval ?? undefined)
                : undefined,
            customUnit: draft.recurrence.customUnit ?? undefined,
            dayOfMonth: draft.recurrence.dayOfMonth ?? undefined,
            monthOfYear: draft.recurrence.monthOfYear ?? undefined,
            endDate: draft.recurrence.endDate || undefined,
          };
    const responsibleId = draft.targetType === "user" ? "" : (draft.responsibleId ?? "");

    await createTaskMutation.mutateAsync({
      title: draft.title,
      description: draft.description,
      priority: draft.priority ?? "medium",
      dueDate: draft.dueDate,
      target: { type: draft.targetType, id: draft.targetId },
      responsibleId,
      reviewerId: draft.requiresReview
        ? (draft.reviewerId ?? responsibleId) || undefined
        : undefined,
      requiresReview: Boolean(draft.requiresReview),
      tags: draft.tags,
      checklist: draft.checklist,
      recurrence,
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openPopAssistant}
        className={cn(
          "pop-fab fixed bottom-6 right-6 z-[150] hidden h-14 w-14 items-center justify-center rounded-full lg:flex",
          open && "lg:hidden",
        )}
        aria-label="Falar com a Pop (assistente de IA)"
        title="Falar com a Pop"
      >
        <Sparkles className="h-6 w-6" />
      </button>
      <PopAssistant open={open} onOpenChange={setPopOpen} onCreate={handleCreate} />
    </>
  );
}
