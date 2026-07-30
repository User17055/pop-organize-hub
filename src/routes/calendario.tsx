import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { addMonths, endOfMonth, endOfWeek, format, startOfWeek, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ErrorState, LoadingState } from "@/components/data-state";
import { AccessRestricted } from "@/components/access-restricted";
import { useWorkspaceData } from "@/lib/api/use-workspace";
import { getTaskPermissions } from "@/lib/permissions";
import type { TargetType, Task } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { MonthGrid } from "@/components/calendar/month-grid";
import { DaySheet } from "@/components/calendar/day-sheet";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { useTaskMutations } from "@/components/tasks/use-task-mutations";
import { RecurringDeleteDialog } from "@/components/tasks/recurring-delete-dialog";
import { emptyTaskFilters, taskMatchesFilters } from "@/components/tasks/task-filter-bar";
import {
  formatFileSizeMb,
  recurrenceFromForm,
  recurrenceToForm,
  type TaskEditState,
} from "@/components/tasks/task-form-types";
import { recurringTaskDatesInRange } from "@/lib/recurrence";
import { hasPermission, resolvePermissionSet } from "@/lib/permission-groups";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário - Pop Organize" },
      {
        name: "description",
        content: "Visualize as tarefas da empresa organizadas por data de vencimento.",
      },
    ],
  }),
  component: CalendarPage,
});

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function CalendarPage() {
  const { data, isLoading, error } = useWorkspaceData();
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const filters = emptyTaskFilters;
  const [isMounted, setIsMounted] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedOccurrenceDate, setSelectedOccurrenceDate] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [editForm, setEditForm] = useState<TaskEditState>({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    tags: "",
    targetKey: "",
    responsibleId: "",
    recurrence: {
      frequency: "none",
      interval: "1",
      customUnit: "days",
      dayOfMonth: "1",
      monthOfYear: "1",
      endDate: "",
    },
  });

  const {
    statusMutation,
    updateTaskMutation,
    deleteTaskMutation,
    commentMutation,
    attachmentMutation,
    addSubtaskMutation,
    toggleSubtaskMutation,
    deleteSubtaskMutation,
  } = useTaskMutations({
    onCompleted: () => setSelectedTaskId(null),
    onDeleted: () => {
      setSelectedTaskId(null);
      setShowDeleteDialog(false);
    },
    onCommented: () => setCommentBody(""),
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const filteredTasks = useMemo(() => {
    if (!data) return [];
    return data.tasks.filter((task) =>
      taskMatchesFilters(task, filters, { employees: data.employees, groups: data.groups }),
    );
  }, [data, filters]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    const actualSeriesDates = new Set<string>();
    const latestRecurringTask = new Map<string, Task>();

    for (const task of filteredTasks) {
      const bucket = map.get(task.dueDate);
      if (bucket) bucket.push(task);
      else map.set(task.dueDate, [task]);

      if (!task.recurrence) continue;
      const seriesId = task.recurrenceParentId ?? task.id;
      actualSeriesDates.add(`${seriesId}:${task.dueDate}`);
      const latest = latestRecurringTask.get(seriesId);
      if (!latest || task.dueDate > latest.dueDate) latestRecurringTask.set(seriesId, task);
    }

    const rangeStart = format(startOfWeek(startOfMonth(visibleMonth)), "yyyy-MM-dd");
    const rangeEnd = format(endOfWeek(endOfMonth(visibleMonth)), "yyyy-MM-dd");
    for (const [seriesId, task] of latestRecurringTask) {
      for (const dueDate of recurringTaskDatesInRange(task, rangeStart, rangeEnd)) {
        if (actualSeriesDates.has(`${seriesId}:${dueDate}`)) continue;
        const occurrence: Task = {
          ...task,
          dueDate,
          status: "pending",
          recurrenceOccurrence: (task.recurrenceOccurrence ?? 1) + 1,
        };
        const bucket = map.get(dueDate);
        if (bucket) bucket.push(occurrence);
        else map.set(dueDate, [occurrence]);
      }
    }
    for (const dayTasks of map.values()) {
      dayTasks.sort((left, right) => {
        const leftCompleted = left.status === "completed" || left.status === "waiting_review";
        const rightCompleted = right.status === "completed" || right.status === "waiting_review";
        return Number(rightCompleted) - Number(leftCompleted);
      });
    }
    return map;
  }, [filteredTasks, visibleMonth]);

  if (isLoading) {
    return (
      <AppShell title="Calendário" subtitle="Carregando tarefas da empresa">
        <LoadingState />
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="Calendário" subtitle="Visualize tarefas por data de vencimento">
        <ErrorState />
      </AppShell>
    );
  }

  const { currentUser, departments, employees, groups, permissionGroups, tasks } = data;
  const permissionSet = resolvePermissionSet({ currentUser, employees, permissionGroups });
  if (!hasPermission(permissionSet, "pages.calendar")) {
    return (
      <AppShell title="Calendário" subtitle="Visualize tarefas por data de vencimento">
        <AccessRestricted requiredLabel="quem pode visualizar o calendário" />
      </AppShell>
    );
  }
  const selectedTask = selectedTaskId ? tasks.find((task) => task.id === selectedTaskId) : null;
  const selectedPermissions = selectedTask
    ? getTaskPermissions({
        task: selectedTask,
        currentUser,
        employees,
        departments,
        groups,
        permissionGroups,
      })
    : null;
  const selectedDayKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const dayTasks = selectedDayKey ? (tasksByDay.get(selectedDayKey) ?? []) : [];

  function openTask(task: Task) {
    const sourceTask = tasks.find((item) => item.id === task.id) ?? task;
    setSelectedDay(null);
    setSelectedTaskId(sourceTask.id);
    setSelectedOccurrenceDate(task.dueDate);
    setCommentBody("");
    setEditForm({
      title: sourceTask.title,
      description: sourceTask.description,
      priority: sourceTask.priority,
      dueDate: sourceTask.dueDate,
      tags: sourceTask.tags.join(", "),
      targetKey: `${sourceTask.target.type}:${sourceTask.target.id}`,
      responsibleId: sourceTask.responsibleId,
      recurrence: recurrenceToForm(sourceTask.recurrence, sourceTask.dueDate),
    });
    updateTaskMutation.reset();
  }

  function handleEditSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedTask) return;
    const [selectedType, selectedId] = editForm.targetKey.split(":") as [TargetType, string];
    updateTaskMutation.mutate({
      id: selectedTask.id,
      title: editForm.title,
      description: editForm.description,
      priority: editForm.priority,
      dueDate: editForm.dueDate,
      target: { type: selectedType, id: selectedId },
      responsibleId: editForm.responsibleId,
      tags: editForm.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      recurrence: recurrenceFromForm(editForm.recurrence),
    });
  }

  function handleDeleteSelectedTask() {
    if (!selectedTask) return;
    setShowDeleteDialog(true);
  }

  function handleCommentSubmit() {
    if (!selectedTask || !commentBody.trim()) return;
    commentMutation.mutate({ taskId: selectedTask.id, body: commentBody.trim() });
  }

  function handleAttachmentFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedTask) return;
    attachmentMutation.mutate({
      taskId: selectedTask.id,
      name: file.name,
      sizeLabel: formatFileSizeMb(file.size),
    });
  }

  const updateError =
    updateTaskMutation.error instanceof Error ? updateTaskMutation.error.message : null;
  const statusError = statusMutation.error instanceof Error ? statusMutation.error.message : null;
  const deleteError =
    deleteTaskMutation.error instanceof Error ? deleteTaskMutation.error.message : null;
  const commentError =
    commentMutation.error instanceof Error ? commentMutation.error.message : null;
  const attachmentError =
    attachmentMutation.error instanceof Error ? attachmentMutation.error.message : null;

  const taskDetailLayer = isMounted
    ? createPortal(
        <>
          <div
            className={cn(
              "fixed inset-0 z-[190] bg-slate-900/20 backdrop-blur-[2px] transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              selectedTask ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            onClick={() => setSelectedTaskId(null)}
            aria-hidden={!selectedTask}
          />
          <aside
            className={cn(
              "fixed inset-y-0 right-0 z-[200] flex h-dvh w-[94vw] flex-col overflow-hidden rounded-l-[28px] border-l border-white/70 bg-background transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-[50vw] sm:min-w-[420px] sm:max-w-[680px]",
              selectedTask ? "translate-x-0" : "translate-x-full",
            )}
            aria-hidden={!selectedTask}
          >
            {selectedTask && selectedPermissions && (
              <TaskDetailDrawer
                task={selectedTask}
                permissions={selectedPermissions}
                employees={employees}
                departments={departments}
                groups={groups}
                company={data.company}
                editForm={editForm}
                onEditFormChange={setEditForm}
                onSubmit={handleEditSubmit}
                onClose={() => setSelectedTaskId(null)}
                onToggleComplete={() =>
                  statusMutation.mutate({
                    id: selectedTask.id,
                    status: selectedTask.status === "completed" ? "in_progress" : "completed",
                  })
                }
                onDelete={handleDeleteSelectedTask}
                isSaving={updateTaskMutation.isPending}
                isDeleting={deleteTaskMutation.isPending}
                isStatusPending={statusMutation.isPending}
                commentBody={commentBody}
                onCommentBodyChange={setCommentBody}
                onCommentSubmit={handleCommentSubmit}
                isCommenting={commentMutation.isPending}
                onAttachmentFile={handleAttachmentFile}
                isAttaching={attachmentMutation.isPending}
                subtasks={selectedTask.subtasks}
                onAddSubtask={(title) =>
                  addSubtaskMutation.mutate({ taskId: selectedTask.id, title })
                }
                onToggleSubtask={(subtaskId, done) =>
                  toggleSubtaskMutation.mutate({ taskId: selectedTask.id, subtaskId, done })
                }
                onDeleteSubtask={(subtaskId) =>
                  deleteSubtaskMutation.mutate({ taskId: selectedTask.id, subtaskId })
                }
                isAddingSubtask={addSubtaskMutation.isPending}
                errorMessage={
                  updateError ?? statusError ?? deleteError ?? commentError ?? attachmentError
                }
              />
            )}
          </aside>
        </>,
        document.body,
      )
    : null;

  return (
    <AppShell
      title="Calendário"
      subtitle="Visualize as tarefas organizadas por data de vencimento"
      contentClassName="flex min-h-0 flex-col md:min-h-[calc(100dvh-96px)]"
    >
      <div className="mb-4 flex justify-center md:mb-5 md:justify-between">
        <div className="task-glass-control flex w-full items-center justify-between gap-2 rounded-[22px] px-2 py-2 md:w-auto md:rounded-full">
          <button
            type="button"
            onClick={() => setVisibleMonth((current) => startOfMonth(subMonths(current, 1)))}
            className="pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70 text-foreground transition hover:border-primary/30 hover:text-primary md:h-9 md:w-9"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1 text-center font-display text-[15px] font-bold capitalize text-foreground md:min-w-[180px] md:text-sm">
            {format(visibleMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          <button
            type="button"
            onClick={() => setVisibleMonth((current) => startOfMonth(addMonths(current, 1)))}
            className="pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70 text-foreground transition hover:border-primary/30 hover:text-primary md:h-9 md:w-9"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              setVisibleMonth(startOfMonth(today));
              setSelectedDay(today);
            }}
            className={cn(
              "pressable hidden h-9 rounded-full border border-border/70 bg-background/70 px-3 text-sm font-semibold hover:border-primary/30 hover:text-primary md:inline-flex md:items-center",
            )}
          >
            Hoje
          </button>
        </div>
        <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
          <span className="h-2 w-2 rounded-full bg-primary" />
          {filteredTasks.length} tarefas no calendário
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <MonthGrid
          month={visibleMonth}
          tasksByDay={tasksByDay}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          fullHeight
        />
      </div>

      <DaySheet
        day={selectedDay}
        tasks={dayTasks}
        employees={employees}
        departments={departments}
        onOpenChange={(open) => {
          if (!open) setSelectedDay(null);
        }}
        onOpenTask={openTask}
        isTaskAvailable={(task) =>
          tasks.some(
            (sourceTask) => sourceTask.id === task.id && sourceTask.dueDate === task.dueDate,
          )
        }
      />

      {taskDetailLayer}

      <RecurringDeleteDialog
        task={selectedTask ?? null}
        occurrenceDate={selectedOccurrenceDate ?? selectedTask?.dueDate}
        open={showDeleteDialog}
        pending={deleteTaskMutation.isPending}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={(scope) => {
          if (!selectedTask) return;
          deleteTaskMutation.mutate({
            id: selectedTask.id,
            scope,
            occurrenceDate: selectedOccurrenceDate ?? selectedTask.dueDate,
          });
        }}
      />
    </AppShell>
  );
}
