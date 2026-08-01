import { createFileRoute } from "@tanstack/react-router";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { AppShell } from "@/components/app-shell";
import { ErrorState, LoadingState } from "@/components/data-state";
import { PENDING_TASK_KEY } from "@/components/notifications-menu";
import { useWorkspaceData } from "@/lib/api/use-workspace";
import type { PermissionKey, TargetType, Task, TaskStatus, WorkspaceData } from "@/lib/domain";
import { getTaskPermissions } from "@/lib/permissions";
import { hasPermission, isAdminUser, resolvePermissionSet } from "@/lib/permission-groups";
import {
  Archive,
  ChevronDown,
  Columns3,
  Eye,
  EyeOff,
  Layers3,
  Plus,
  Repeat,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskCreateDrawer } from "@/components/tasks/task-create-drawer";
import { PopAssistant, type PopTaskDraft } from "@/components/tasks/pop-assistant";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { TaskList } from "@/components/tasks/task-list";
import { RecurringDeleteDialog } from "@/components/tasks/recurring-delete-dialog";
import { useTaskMutations } from "@/components/tasks/use-task-mutations";
import { emptyTaskFilters, taskMatchesFilters } from "@/components/tasks/task-filter-bar";
import { PriorityBadge } from "@/components/app-shell";
import {
  getDefaultDueDate,
  getDefaultRecurrence,
  recurrenceFromForm,
  recurrenceLabel,
  recurrenceToForm,
  formatFileSizeMb,
  type RecurrenceInput,
  type TaskEditState,
  type TaskFormState,
} from "@/components/tasks/task-form-types";

export const Route = createFileRoute("/tarefas")({
  head: () => ({
    meta: [
      { title: "Tarefas - Pop Organize" },
      { name: "description", content: "Gerencie, filtre e acompanhe todas as tarefas da empresa." },
    ],
  }),
  component: TasksPage,
});

const statusFilters: Array<{ key: TaskStatus | "all"; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "pending", label: "Pendentes" },
  { key: "in_progress", label: "Em andamento" },
  { key: "waiting_review", label: "Aguardando revisão" },
  { key: "reopened", label: "Reabertas" },
];

type TaskScope = "today" | "overdue" | "upcoming" | "mine" | "department" | "group" | "all";

const adminScopeFilters: Array<{ key: TaskScope; label: string }> = [
  { key: "today", label: "Hoje" },
  { key: "overdue", label: "Atrasadas" },
  { key: "upcoming", label: "Próximas" },
  { key: "mine", label: "Para mim" },
  { key: "department", label: "Setor" },
  { key: "group", label: "Grupo" },
  { key: "all", label: "Todas" },
];

function taskMatchesAdminScope(task: Task, scope: TaskScope, data: WorkspaceData) {
  if (scope === "all") return true;
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  if (scope === "today") return task.status !== "completed" && task.dueDate === today;
  if (scope === "overdue") return task.status !== "completed" && task.dueDate < today;
  if (scope === "upcoming") return task.status !== "completed" && task.dueDate > today;

  const currentEmployee = data.employees.find((employee) => employee.id === data.currentUser.id);
  if (!currentEmployee) return false;
  if (scope === "mine") {
    const responsibleIds = new Set(
      [task.responsibleId, ...(task.responsibleIds ?? [])].filter(Boolean),
    );
    return (
      responsibleIds.has(currentEmployee.id) ||
      (task.target.type === "user" && task.target.id === currentEmployee.id)
    );
  }
  if (scope === "department") {
    return task.target.type === "department" && task.target.id === currentEmployee.departmentId;
  }

  const currentGroupIds = new Set(
    data.groups
      .filter((group) => group.memberIds.includes(currentEmployee.id))
      .map((group) => group.id),
  );
  return task.target.type === "group" && currentGroupIds.has(task.target.id);
}

type TaskLayoutPreferences = {
  layoutMode: "list" | "department";
  titleWidth: number;
  density: "compact" | "comfortable";
  showDescription: boolean;
};

const defaultLayoutPreferences: TaskLayoutPreferences = {
  layoutMode: "list",
  titleWidth: 340,
  density: "comfortable",
  showDescription: true,
};

function TasksPage() {
  const { data, isLoading, error } = useWorkspaceData();
  const [active, setActive] = useState<TaskStatus | "all">("all");
  const [taskScope, setTaskScope] = useState<TaskScope>("all");
  const [search, setSearch] = useState("");
  const filters = emptyTaskFilters;
  const [isMounted, setIsMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPop, setShowPop] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLayoutSettings, setShowLayoutSettings] = useState(false);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [layoutPreferences, setLayoutPreferences] =
    useState<TaskLayoutPreferences>(defaultLayoutPreferences);
  const [collapsedDepartments, setCollapsedDepartments] = useState<Set<string>>(() => new Set());
  const [commentBody, setCommentBody] = useState("");
  const [form, setForm] = useState<TaskFormState>(() => {
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
  const [editForm, setEditForm] = useState<TaskEditState>(() => {
    const dueDate = getDefaultDueDate();
    return {
      title: "",
      description: "",
      priority: "medium",
      dueDate,
      tags: "",
      targetKey: "",
      responsibleId: "",
      recurrence: getDefaultRecurrence(dueDate),
    };
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
    reorderTaskMutation,
  } = useTaskMutations({
    onCompleted: () => setSelectedTaskId(null),
    onCreated: () => {
      setShowForm(false);
      setShowPop(false);
    },
    onDeleted: () => {
      setSelectedTaskId(null);
      setShowDeleteDialog(false);
    },
    onCommented: () => setCommentBody(""),
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const stored = window.localStorage.getItem("pop-organize:task-layout");
    if (!stored) return;
    try {
      setLayoutPreferences({
        ...defaultLayoutPreferences,
        ...(JSON.parse(stored) as Partial<TaskLayoutPreferences>),
      });
    } catch {
      window.localStorage.removeItem("pop-organize:task-layout");
    }
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    window.localStorage.setItem("pop-organize:task-layout", JSON.stringify(layoutPreferences));
  }, [isMounted, layoutPreferences]);

  useEffect(() => {
    if (!data) return;
    const pendingId = sessionStorage.getItem(PENDING_TASK_KEY);
    if (!pendingId) return;
    sessionStorage.removeItem(PENDING_TASK_KEY);
    const task = data.tasks.find((item) => item.id === pendingId);
    if (!task) return;
    setSelectedTaskId(task.id);
    setCommentBody("");
    setEditForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      tags: task.tags.join(", "),
      targetKey: `${task.target.type}:${task.target.id}`,
      responsibleId: task.responsibleId,
      recurrence: recurrenceToForm(task.recurrence, task.dueDate),
    });
    updateTaskMutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const taskRows = useMemo(() => data?.tasks ?? [], [data?.tasks]);
  const activeTaskRows = useMemo(
    () => taskRows.filter((task) => task.status !== "completed"),
    [taskRows],
  );
  const list = useMemo(
    () =>
      taskRows.filter(
        (t) =>
          t.status !== "completed" &&
          (active === "all" || t.status === active) &&
          (normalizedSearch === "" ||
            t.title.toLowerCase().includes(normalizedSearch) ||
            t.description.toLowerCase().includes(normalizedSearch)) &&
          (!data || taskMatchesAdminScope(t, taskScope, data)) &&
          (!data ||
            taskMatchesFilters(t, filters, { employees: data.employees, groups: data.groups })),
      ),
    [active, normalizedSearch, taskRows, taskScope, filters, data],
  );
  const completedTasks = useMemo(
    () =>
      taskRows.filter(
        (task) =>
          task.status === "completed" &&
          (normalizedSearch === "" ||
            task.title.toLowerCase().includes(normalizedSearch) ||
            task.description.toLowerCase().includes(normalizedSearch)) &&
          (!data || taskMatchesAdminScope(task, taskScope, data)),
      ),
    [normalizedSearch, taskRows, taskScope, data],
  );

  if (isLoading) {
    return (
      <AppShell title="Tarefas" subtitle="Carregando demandas da empresa">
        <LoadingState />
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="Tarefas" subtitle="Acompanhe e organize todas as demandas da empresa">
        <ErrorState />
      </AppShell>
    );
  }

  const { company, currentUser, departments, employees, groups, tasks } = data;
  const permissionSet = resolvePermissionSet({
    currentUser,
    employees,
    permissionGroups: data.permissionGroups,
  });
  const canSeePeopleContext =
    isAdminUser({ currentUser, employees }) ||
    (["pages.employees", "pages.reports", "manage.employees"] as PermissionKey[]).some((key) =>
      hasPermission(permissionSet, key),
    );
  const canCreateTask = hasPermission(permissionSet, "tasks.create");
  const currentUserIsAdmin = isAdminUser({ currentUser, employees });
  const isPersonalWorkspace = company.kind === "personal";
  const showResponsible = canSeePeopleContext && !isPersonalWorkspace;
  const selectedTask = selectedTaskId ? tasks.find((task) => task.id === selectedTaskId) : null;
  const selectedPermissions = selectedTask
    ? getTaskPermissions({
        task: selectedTask,
        currentUser,
        employees,
        departments,
        groups,
        permissionGroups: data.permissionGroups,
      })
    : null;
  const targetOptions = isPersonalWorkspace
    ? [{ value: `user:${currentUser.id}`, label: "Somente eu" }]
    : [
        { value: `company:${company.id}`, label: "Empresa inteira" },
        ...departments.map((department) => ({
          value: `department:${department.id}`,
          label: `Setor: ${department.name}`,
        })),
        ...groups.map((group) => ({
          value: `group:${group.id}`,
          label: `Grupo: ${group.name}`,
        })),
        ...employees.map((employee) => ({
          value: `user:${employee.id}`,
          label: `Pessoa: ${employee.name}`,
        })),
      ];
  const taskSections =
    layoutPreferences.layoutMode === "department"
      ? [
          ...departments
            .map((department) => ({
              id: department.id,
              label: department.name,
              tasks: list.filter(
                (task) => task.target.type === "department" && task.target.id === department.id,
              ),
            }))
            .filter((section) => section.tasks.length > 0),
          {
            id: "other",
            label: "Outras atividades",
            tasks: list.filter((task) => task.target.type !== "department"),
          },
        ].filter((section) => section.tasks.length > 0)
      : [{ id: "all", label: "Todas as atividades", tasks: list }];

  function openForm() {
    const dueDate = getDefaultDueDate();
    setForm({
      title: "",
      description: "",
      priority: "medium",
      dueDate,
      targetKey: isPersonalWorkspace ? `user:${currentUser.id}` : `company:${company.id}`,
      responsibleId: "",
      reviewerId: "",
      requiresReview: false,
      tags: "",
      checklist: "",
      recurrence: getDefaultRecurrence(dueDate),
    });
    createTaskMutation.reset();
    setShowForm(true);
  }

  function openTask(task: Task) {
    setSelectedTaskId(task.id);
    setCommentBody("");
    setEditForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      tags: task.tags.join(", "),
      targetKey: `${task.target.type}:${task.target.id}`,
      responsibleId: task.responsibleId,
      recurrence: recurrenceToForm(task.recurrence, task.dueDate),
    });
    updateTaskMutation.reset();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const [selectedType, selectedId] = form.targetKey.split(":") as [TargetType, string];
    const type = isPersonalWorkspace ? "user" : selectedType;
    const id = isPersonalWorkspace ? currentUser.id : selectedId;
    const responsibleId = type === "user" ? "" : form.responsibleId;

    createTaskMutation.mutate({
      title: form.title,
      description: form.description,
      priority: form.priority,
      dueDate: form.dueDate,
      target: { type, id },
      responsibleId,
      reviewerId:
        !isPersonalWorkspace && form.requiresReview
          ? form.reviewerId || responsibleId || undefined
          : undefined,
      requiresReview: !isPersonalWorkspace && form.requiresReview,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      checklist: form.checklist
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
      recurrence: recurrenceFromForm(form.recurrence),
    });
  }

  function handlePopConfirm(draft: PopTaskDraft) {
    if (
      !draft.title ||
      !draft.description ||
      !draft.dueDate ||
      !draft.targetType ||
      !draft.targetId
    ) {
      return;
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

    createTaskMutation.mutate({
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
      responsibleId: selectedType === "user" ? "" : editForm.responsibleId,
      tags: editForm.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      recurrence: recurrenceFromForm(editForm.recurrence),
    });
  }

  function handleReorderTask(task: Task, beforeTaskId: string | null) {
    setMovingTaskId(task.id);
    window.setTimeout(() => {
      reorderTaskMutation.mutate(
        { taskId: task.id, beforeTaskId },
        { onSettled: () => setMovingTaskId(null) },
      );
    }, 180);
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

  const mutationError =
    createTaskMutation.error instanceof Error ? createTaskMutation.error.message : null;
  const updateError =
    updateTaskMutation.error instanceof Error ? updateTaskMutation.error.message : null;
  const statusError = statusMutation.error instanceof Error ? statusMutation.error.message : null;
  const deleteError =
    deleteTaskMutation.error instanceof Error ? deleteTaskMutation.error.message : null;
  const commentError =
    commentMutation.error instanceof Error ? commentMutation.error.message : null;
  const attachmentError =
    attachmentMutation.error instanceof Error ? attachmentMutation.error.message : null;
  const subtaskError =
    addSubtaskMutation.error instanceof Error
      ? addSubtaskMutation.error.message
      : toggleSubtaskMutation.error instanceof Error
        ? toggleSubtaskMutation.error.message
        : deleteSubtaskMutation.error instanceof Error
          ? deleteSubtaskMutation.error.message
          : null;

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
                company={company}
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
                onReorder={(position) => {
                  const first = activeTaskRows.find((task) => task.id !== selectedTask.id);
                  handleReorderTask(
                    selectedTask,
                    position === "start" ? (first?.id ?? null) : null,
                  );
                }}
                onDelete={handleDeleteSelectedTask}
                isSaving={updateTaskMutation.isPending}
                isMoving={movingTaskId === selectedTask.id}
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
                  updateError ??
                  statusError ??
                  deleteError ??
                  commentError ??
                  attachmentError ??
                  subtaskError
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
      title="Tarefas"
      subtitle="Acompanhe e organize todas as demandas da empresa"
      actions={
        canCreateTask ? (
          <div className="hidden items-center gap-2 lg:flex">
            <button
              onClick={() => setShowPop(true)}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 text-sm font-bold text-primary transition hover:-translate-y-0.5 hover:bg-primary/15"
            >
              <Sparkles className="h-4 w-4" />
              Criar com a Pop
            </button>
            <button
              onClick={openForm}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-primary/90"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/16">
                <Plus className="h-4 w-4" />
              </span>
              Nova tarefa
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="mb-4 flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="task-glass-control flex h-12 min-w-0 flex-1 items-center gap-2 rounded-[18px] px-3 transition-colors focus-within:border-primary/45 sm:px-4 md:h-11">
          <Search className="h-4 w-4 text-primary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tarefas..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/75"
          />
        </div>
        {canCreateTask && (
          <>
            <button
              onClick={() => setShowPop(true)}
              className="pressable inline-flex h-12 shrink-0 items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 text-sm font-bold text-primary transition hover:bg-primary/15 lg:hidden"
              aria-label="Criar com a Pop"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Pop</span>
            </button>
            <button
              onClick={openForm}
              className="pressable inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary px-3.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:px-4 lg:hidden"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background/16">
                <Plus className="h-4 w-4" />
              </span>
              Nova
            </button>
          </>
        )}
      </div>

      <div className="mobile-horizontal-scroll mb-5 flex gap-2 overflow-x-auto pb-1">
        {statusFilters.map((f) => {
          const count =
            f.key === "all"
              ? activeTaskRows.length
              : activeTaskRows.filter((t) => t.status === f.key).length;
          const isActive = active === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setActive(f.key)}
              className={cn(
                "pressable inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-all",
                isActive
                  ? "border border-primary/18 bg-primary/10 text-primary"
                  : "task-glass-control text-foreground/70 hover:border-primary/50 hover:text-primary",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-md px-1.5 text-[11px]",
                  isActive ? "bg-white/60 text-primary" : "task-vivid-chip",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {currentUserIsAdmin && !isPersonalWorkspace && (
        <div className="mobile-horizontal-scroll mb-5 flex gap-2 overflow-x-auto pb-1">
          {adminScopeFilters.map((filter) => {
            const count = activeTaskRows.filter((task) =>
              taskMatchesAdminScope(task, filter.key, data),
            ).length;
            const isActive = taskScope === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setTaskScope(filter.key)}
                className={cn(
                  "pressable inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-all",
                  isActive
                    ? "border border-primary/18 bg-primary/10 text-primary"
                    : "task-glass-control text-foreground/70 hover:border-primary/50 hover:text-primary",
                )}
              >
                {filter.label}
                <span className="rounded-md bg-white/60 px-1.5 text-[11px] text-primary">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setLayoutPreferences((current) => ({
                ...current,
                layoutMode: current.layoutMode === "department" ? "list" : "department",
              }))
            }
            className={cn(
              "task-glass-control pressable inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-bold transition",
              layoutPreferences.layoutMode === "department" && "border-primary/25 text-primary",
            )}
          >
            <Layers3 className="h-4 w-4" />
            {layoutPreferences.layoutMode === "department" ? "Por setor" : "Abrir por setor"}
          </button>
          <button
            type="button"
            onClick={() => setShowLayoutSettings((current) => !current)}
            className={cn(
              "task-glass-control pressable inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-bold transition",
              showLayoutSettings && "border-primary/25 text-primary",
            )}
          >
            <Settings2 className="h-4 w-4" />
            Personalizar layout
          </button>
          {layoutPreferences.layoutMode === "department" && (
            <button
              type="button"
              onClick={() => {
                const sectionIds = taskSections.map((section) => section.id);
                const allCollapsed =
                  sectionIds.length > 0 &&
                  sectionIds.every((sectionId) => collapsedDepartments.has(sectionId));
                setCollapsedDepartments(allCollapsed ? new Set() : new Set(sectionIds));
              }}
              className="task-glass-control pressable inline-flex h-10 items-center gap-2 rounded-full px-4 text-xs font-bold transition hover:border-primary/25 hover:text-primary"
            >
              {taskSections.every((section) => collapsedDepartments.has(section.id)) ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              {taskSections.every((section) => collapsedDepartments.has(section.id))
                ? "Mostrar todos os setores"
                : "Ocultar todos os setores"}
            </button>
          )}
        </div>
        <span className="hidden text-xs text-muted-foreground lg:inline">
          Arraste a barra azul ao lado de “Atividade” para aumentar ou diminuir.
        </span>
      </div>

      {showLayoutSettings && (
        <section className="task-glass-panel mb-4 grid gap-4 rounded-[20px] p-4 sm:grid-cols-3">
          <label className="space-y-2 text-xs font-semibold">
            <span className="flex items-center justify-between gap-2 text-foreground">
              <span className="flex items-center gap-2">
                <Columns3 className="h-4 w-4 text-primary" />
                Largura da atividade
              </span>
              <span className="text-[10px] text-primary">{layoutPreferences.titleWidth}px</span>
            </span>
            <input
              type="range"
              min={240}
              max={680}
              step={20}
              value={layoutPreferences.titleWidth}
              onChange={(event) =>
                setLayoutPreferences((current) => ({
                  ...current,
                  titleWidth: Number(event.target.value),
                }))
              }
              className="w-full accent-primary"
            />
          </label>
          <label className="space-y-2 text-xs font-semibold">
            <span className="text-foreground">Espaçamento das linhas</span>
            <select
              value={layoutPreferences.density}
              onChange={(event) =>
                setLayoutPreferences((current) => ({
                  ...current,
                  density: event.target.value as TaskLayoutPreferences["density"],
                }))
              }
              className="h-10 w-full rounded-xl border border-border/70 bg-background/70 px-3 outline-none"
            >
              <option value="comfortable">Confortável</option>
              <option value="compact">Compacto</option>
            </select>
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[14px] border border-border/60 bg-background/55 px-3 text-xs font-semibold">
            Mostrar notas na tabela
            <input
              type="checkbox"
              checked={layoutPreferences.showDescription}
              onChange={(event) =>
                setLayoutPreferences((current) => ({
                  ...current,
                  showDescription: event.target.checked,
                }))
              }
              className="h-4 w-4 accent-primary"
            />
          </label>
        </section>
      )}

      <div className="space-y-4">
        {taskSections.map((section) => {
          const collapsed = collapsedDepartments.has(section.id);
          return (
            <section key={section.id}>
              {layoutPreferences.layoutMode === "department" && (
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedDepartments((current) => {
                      const next = new Set(current);
                      if (next.has(section.id)) next.delete(section.id);
                      else next.add(section.id);
                      return next;
                    })
                  }
                  className="mb-2 flex w-full items-center justify-between rounded-[16px] border border-border/60 bg-card/55 px-4 py-3 text-left transition hover:border-primary/25"
                >
                  <span className="font-display text-sm font-bold">{section.label}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {section.tasks.length} atividades
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", collapsed && "-rotate-90")}
                    />
                  </span>
                </button>
              )}
              {!collapsed && (
                <TaskList
                  tasks={section.tasks}
                  employees={employees}
                  departments={departments}
                  groups={groups}
                  permissionGroups={data.permissionGroups}
                  currentUser={currentUser}
                  showResponsible={showResponsible}
                  selectedTaskId={selectedTaskId}
                  onOpen={openTask}
                  onComplete={(task) => statusMutation.mutate({ id: task.id, status: "completed" })}
                  onReorder={handleReorderTask}
                  movingTaskId={movingTaskId}
                  isCompleting={statusMutation.isPending}
                  preferences={layoutPreferences}
                  onTitleWidthChange={(titleWidth) =>
                    setLayoutPreferences((current) => ({ ...current, titleWidth }))
                  }
                />
              )}
            </section>
          );
        })}
      </div>

      {list.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          {completedTasks.length > 0
            ? "Nenhuma tarefa ativa neste filtro."
            : "Nenhuma tarefa encontrada."}
        </div>
      )}

      {completedTasks.length > 0 && (
        <section className="task-glass-panel mt-6 overflow-hidden rounded-[22px] md:rounded-[22px]">
          <button
            type="button"
            onClick={() => setShowCompleted((current) => !current)}
            className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-foreground/[0.025] md:px-6"
          >
            <span className="inline-flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-border/70 bg-background/70 text-primary transition-colors group-hover:text-primary">
                <Archive className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  Tarefas concluídas
                </span>
                <span className="text-xs text-muted-foreground">
                  {completedTasks.length} {completedTasks.length === 1 ? "atividade" : "atividades"}{" "}
                  arquivada{completedTasks.length === 1 ? "" : "s"}
                </span>
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:text-primary",
                showCompleted && "rotate-180",
              )}
            />
          </button>

          {showCompleted && (
            <div className="grid grid-cols-1 gap-3 border-t border-border/60 bg-background/35 p-4 animate-in fade-in slide-in-from-top-1 duration-150 md:grid-cols-2 md:p-5 xl:grid-cols-3">
              {completedTasks.map((task) => {
                const emp = employees.find((employee) => employee.id === task.responsibleId);
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => openTask(task)}
                    className="task-glass-control pressable rounded-[16px] p-4 text-left opacity-80 hover:border-primary/35 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-foreground line-through">
                          {task.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {task.description}
                        </p>
                        {task.recurrence && (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            <Repeat className="h-3 w-3" />
                            {recurrenceLabel(task.recurrence)}
                          </div>
                        )}
                      </div>
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <div
                      className={cn(
                        "mt-3 flex items-center gap-3 text-[11px] text-muted-foreground",
                        showResponsible ? "justify-between" : "justify-end",
                      )}
                    >
                      {showResponsible && (
                        <span className="truncate">
                          {emp?.name ?? (task.target.type === "department" ? "Setor inteiro" : "")}
                        </span>
                      )}
                      <span>
                        {new Date(`${task.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {taskDetailLayer}

      <RecurringDeleteDialog
        task={selectedTask ?? null}
        open={showDeleteDialog}
        pending={deleteTaskMutation.isPending}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={(scope) => {
          if (!selectedTask) return;
          deleteTaskMutation.mutate({
            id: selectedTask.id,
            scope,
            occurrenceDate: selectedTask.dueDate,
          });
        }}
      />

      <PopAssistant
        open={showPop}
        onOpenChange={setShowPop}
        onConfirm={handlePopConfirm}
        isCreating={createTaskMutation.isPending}
        createError={mutationError}
      />

      <TaskCreateDrawer
        open={showForm}
        onOpenChange={setShowForm}
        form={form}
        onFormChange={setForm}
        onSubmit={handleSubmit}
        isSubmitting={createTaskMutation.isPending}
        errorMessage={mutationError}
        employees={employees}
        targetOptions={targetOptions}
        personalMode={isPersonalWorkspace}
        canCreateChecklist={isAdminUser({ currentUser, employees })}
      />
    </AppShell>
  );
}
