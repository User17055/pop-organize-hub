import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { addMonths, endOfMonth, endOfWeek, format, startOfWeek, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ErrorState, LoadingState } from "@/components/data-state";
import { AccessRestricted } from "@/components/access-restricted";
import { useWorkspaceData } from "@/lib/api/use-workspace";
import { getTaskPermissions } from "@/lib/permissions";
import type { TargetType, Task } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { MonthGrid } from "@/components/calendar/month-grid";
import { DaySheet } from "@/components/calendar/day-sheet";
import {
  getCalendarTaskDepartmentIds,
  getCalendarTaskFirstTime,
} from "@/components/calendar/calendar-task";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { TaskCreateDrawer } from "@/components/tasks/task-create-drawer";
import { useTaskMutations } from "@/components/tasks/use-task-mutations";
import { RecurringDeleteDialog } from "@/components/tasks/recurring-delete-dialog";
import { emptyTaskFilters, taskMatchesFilters } from "@/components/tasks/task-filter-bar";
import {
  formatFileSizeMb,
  getDefaultDueDate,
  getDefaultRecurrence,
  recurrenceFromForm,
  recurrenceToForm,
  type TaskEditState,
  type TaskFormState,
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
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const filters = emptyTaskFilters;
  const [isMounted, setIsMounted] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedOccurrenceDate, setSelectedOccurrenceDate] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [createForm, setCreateForm] = useState<TaskFormState>(() => {
    const dueDate = getDefaultDueDate();
    return {
      title: "",
      description: "",
      priority: "medium",
      dueDate,
      targetKey: "",
      responsibleId: "",
      reviewerId: "",
      requiresReview: false,
      tags: "",
      checklist: "",
      recurrence: getDefaultRecurrence(dueDate),
    };
  });
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
      weekDays: [],
      excludedWeekDays: [],
      times: [],
      interval: "1",
      customUnit: "days",
      dayOfMonth: "1",
      monthOfYear: "1",
      endDate: "",
    },
  });

  const {
    createTaskMutation,
    statusMutation,
    updateTaskMutation,
    deleteTaskMutation,
    commentMutation,
    attachmentMutation,
    addSubtaskMutation,
    toggleSubtaskMutation,
    deleteSubtaskMutation,
  } = useTaskMutations({
    onCreated: () => setShowCreateForm(false),
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
    const context = {
      employees: data.employees,
      departments: data.departments,
      groups: data.groups,
    };
    return data.tasks.filter(
      (task) =>
        taskMatchesFilters(task, filters, context) &&
        (departmentFilter === "all" ||
          getCalendarTaskDepartmentIds(task, context).includes(departmentFilter)),
    );
  }, [data, departmentFilter, filters]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    const actualSeriesDates = new Set<string>();
    const latestRecurringTask = new Map<string, Task>();
    const todayKey = format(new Date(), "yyyy-MM-dd");

    for (const task of filteredTasks) {
      const bucket = map.get(task.dueDate);
      if (bucket) bucket.push(task);
      else map.set(task.dueDate, [task]);

      if (!task.recurrence) continue;
      const recurringSeriesId = task.recurrenceParentId ?? task.id;
      actualSeriesDates.add(`${recurringSeriesId}:${task.dueDate}`);
      const latest = latestRecurringTask.get(recurringSeriesId);
      if (!latest || task.dueDate > latest.dueDate) {
        latestRecurringTask.set(recurringSeriesId, task);
      }
    }

    const rangeEnd = format(endOfWeek(endOfMonth(visibleMonth)), "yyyy-MM-dd");
    for (const [seriesId, task] of latestRecurringTask) {
      for (const dueDate of recurringTaskDatesInRange(task, todayKey, rangeEnd)) {
        if (actualSeriesDates.has(`${seriesId}:${dueDate}`)) continue;
        if (dueDate < todayKey) continue;
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
        const leftTime = getCalendarTaskFirstTime(left) ?? "99:99";
        const rightTime = getCalendarTaskFirstTime(right) ?? "99:99";
        const byTime = leftTime.localeCompare(rightTime);
        if (byTime !== 0) return byTime;
        const leftCompleted = left.status === "completed";
        const rightCompleted = right.status === "completed";
        if (leftCompleted !== rightCompleted) return Number(leftCompleted) - Number(rightCompleted);
        return left.title.localeCompare(right.title, "pt-BR");
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

  const { currentUser, departments, employees, groups, invitations, permissionGroups, tasks } =
    data;
  const assignmentMembers = [
    ...employees,
    ...invitations.map((invitation) => ({
      id: invitation.id,
      name: invitation.name,
      email: invitation.email,
      role: "Convite pendente",
      departmentId: invitation.departmentId,
      groupIds: invitation.groupIds,
      status: invitation.status,
      permissionGroupId: invitation.permissionGroupId,
    })),
  ];
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
  const company = data.company;
  const sortedDepartments = [...departments].sort((left, right) =>
    left.name.localeCompare(right.name, "pt-BR"),
  );
  const isPersonalWorkspace = company.kind === "personal";
  const canCreateTask = hasPermission(permissionSet, "tasks.create");
  const targetOptions = isPersonalWorkspace
    ? [{ value: `user:${currentUser.id}`, label: "Somente eu" }]
    : [
        { value: `company:${company.id}`, label: "Empresa inteira" },
        ...departments.map((department) => ({
          value: `department:${department.id}`,
          label: department.name,
        })),
        ...groups.map((group) => ({ value: `group:${group.id}`, label: `Grupo: ${group.name}` })),
        ...assignmentMembers.map((employee) => ({
          value: `user:${employee.id}`,
          label: employee.name,
        })),
      ];

  function openCreateTaskForDay(day: Date) {
    const dueDate = format(day, "yyyy-MM-dd");
    setCreateForm({
      title: "",
      description: "",
      priority: "medium",
      dueDate,
      targetKey: isPersonalWorkspace ? `user:${currentUser.id}` : "",
      responsibleId: "",
      reviewerId: "",
      requiresReview: false,
      tags: "",
      checklist: "",
      recurrence: getDefaultRecurrence(dueDate),
    });
    createTaskMutation.reset();
    setSelectedDay(null);
    setShowCreateForm(true);
  }

  function handleCreateSubmit(submittedForm: TaskFormState) {
    const [selectedType, selectedId] = submittedForm.targetKey.split(":") as [TargetType, string];
    const type = isPersonalWorkspace ? "user" : selectedType;
    const id = isPersonalWorkspace ? currentUser.id : selectedId;
    const responsibleId = type === "user" ? id : submittedForm.responsibleId;
    createTaskMutation.mutate({
      title: submittedForm.title,
      description: submittedForm.description,
      priority: submittedForm.priority,
      dueDate: submittedForm.dueDate,
      target: { type, id },
      responsibleId,
      reviewerId:
        !isPersonalWorkspace && submittedForm.requiresReview
          ? submittedForm.reviewerId || undefined
          : undefined,
      requiresReview: !isPersonalWorkspace && submittedForm.requiresReview,
      tags: submittedForm.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      checklist: submittedForm.checklist
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
      recurrence: recurrenceFromForm(submittedForm.recurrence),
    });
  }

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
      responsibleId: selectedType === "user" ? selectedId : editForm.responsibleId,
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
                employees={assignmentMembers}
                departments={departments}
                groups={groups}
                company={data.company}
                editForm={editForm}
                onEditFormChange={setEditForm}
                onSubmit={handleEditSubmit}
                onClose={() => setSelectedTaskId(null)}
                onStatusChange={(status) =>
                  statusMutation.mutate({
                    id: selectedTask.id,
                    status,
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
      contentClassName="flex min-h-0 flex-col"
    >
      <div className="mb-4 flex shrink-0 flex-col gap-2 md:mb-3 md:flex-row md:items-center md:justify-between">
        <div className="task-glass-control flex w-full items-center justify-between gap-2 rounded-[22px] px-2 py-2 md:w-auto md:rounded-full md:py-1.5">
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
        <div className="flex items-center justify-between gap-3 md:justify-end">
          {!isPersonalWorkspace && sortedDepartments.length > 0 && (
            <label className="task-glass-control flex h-10 min-w-0 items-center gap-2 rounded-full px-3 md:h-9">
              <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">Filtrar por setor</span>
              <select
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
                className="min-w-0 max-w-[220px] bg-transparent text-sm font-semibold text-foreground outline-none"
                aria-label="Filtrar calendário por setor"
              >
                <option value="all">Todos os setores</option>
                {sortedDepartments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground md:text-sm">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {filteredTasks.length} tarefas
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <MonthGrid
          month={visibleMonth}
          tasksByDay={tasksByDay}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          employees={assignmentMembers}
          departments={departments}
          groups={groups}
          fullHeight
        />
      </div>

      <DaySheet
        day={selectedDay}
        tasks={dayTasks}
        employees={assignmentMembers}
        departments={departments}
        groups={groups}
        onOpenChange={(open) => {
          if (!open) setSelectedDay(null);
        }}
        onOpenTask={openTask}
        onCreateTask={
          canCreateTask && selectedDay ? () => openCreateTaskForDay(selectedDay) : undefined
        }
        isTaskAvailable={(task) =>
          tasks.some(
            (sourceTask) => sourceTask.id === task.id && sourceTask.dueDate === task.dueDate,
          )
        }
      />

      <TaskCreateDrawer
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        form={createForm}
        onSubmit={handleCreateSubmit}
        isSubmitting={createTaskMutation.isPending}
        errorMessage={
          createTaskMutation.error instanceof Error ? createTaskMutation.error.message : null
        }
        employees={assignmentMembers}
        departments={departments}
        groups={groups}
        targetOptions={targetOptions}
        personalMode={isPersonalWorkspace}
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
