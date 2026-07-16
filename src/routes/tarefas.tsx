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
import type { PermissionKey, TargetType, Task, TaskStatus } from "@/lib/domain";
import { getTaskPermissions } from "@/lib/permissions";
import { hasPermission, isAdminUser, resolvePermissionSet } from "@/lib/permission-groups";
import { Plus, Search, ChevronDown, Archive, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskCreateDrawer } from "@/components/tasks/task-create-drawer";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { TaskList } from "@/components/tasks/task-list";
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

function TasksPage() {
  const { data, isLoading, error } = useWorkspaceData();
  const [active, setActive] = useState<TaskStatus | "all">("all");
  const [search, setSearch] = useState("");
  const filters = emptyTaskFilters;
  const [isMounted, setIsMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
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
  } = useTaskMutations({
    onCompleted: () => setSelectedTaskId(null),
    onCreated: () => setShowForm(false),
    onDeleted: () => setSelectedTaskId(null),
    onCommented: () => setCommentBody(""),
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
          (!data ||
            taskMatchesFilters(t, filters, { employees: data.employees, groups: data.groups })),
      ),
    [active, normalizedSearch, taskRows, filters, data],
  );
  const completedTasks = useMemo(
    () =>
      taskRows.filter(
        (task) =>
          task.status === "completed" &&
          (normalizedSearch === "" ||
            task.title.toLowerCase().includes(normalizedSearch) ||
            task.description.toLowerCase().includes(normalizedSearch)),
      ),
    [normalizedSearch, taskRows],
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
  const selectedTask = selectedTaskId ? tasks.find((task) => task.id === selectedTaskId) : null;
  const selectedPermissions = selectedTask
    ? getTaskPermissions({
        task: selectedTask,
        currentUser,
        employees,
        departments,
        groups,
      })
    : null;
  const targetOptions = [
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

  function openForm() {
    const dueDate = getDefaultDueDate();
    setForm({
      title: "",
      description: "",
      priority: "medium",
      dueDate,
      targetKey: `company:${company.id}`,
      responsibleId: employees[0]?.id ?? "",
      reviewerId: "",
      requiresReview: false,
      tags: "",
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
      recurrence: recurrenceToForm(task.recurrence, task.dueDate),
    });
    updateTaskMutation.reset();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const [type, id] = form.targetKey.split(":") as [TargetType, string];
    const responsibleId = form.responsibleId || employees[0]?.id;
    if (!responsibleId) return;

    createTaskMutation.mutate({
      title: form.title,
      description: form.description,
      priority: form.priority,
      dueDate: form.dueDate,
      target: { type, id },
      responsibleId,
      reviewerId: form.requiresReview ? form.reviewerId || responsibleId : undefined,
      requiresReview: form.requiresReview,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      recurrence: recurrenceFromForm(form.recurrence),
    });
  }

  function handleEditSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedTask) return;

    updateTaskMutation.mutate({
      id: selectedTask.id,
      title: editForm.title,
      description: editForm.description,
      priority: editForm.priority,
      dueDate: editForm.dueDate,
      tags: editForm.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      recurrence: recurrenceFromForm(editForm.recurrence),
    });
  }

  function handleDeleteSelectedTask() {
    if (!selectedTask) return;
    const confirmed = window.confirm(
      `Excluir a tarefa "${selectedTask.title}"? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;
    deleteTaskMutation.mutate({ id: selectedTask.id });
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
          <button
            onClick={openForm}
            className="hidden h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-bold text-background transition hover:-translate-y-0.5 hover:bg-foreground/90 md:inline-flex"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background/16">
              <Plus className="h-4 w-4" />
            </span>
            Nova tarefa
          </button>
        ) : undefined
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="task-glass-control flex h-12 min-w-[240px] flex-1 items-center gap-2 rounded-[18px] px-4 transition-colors focus-within:border-primary/45 md:h-11">
          <Search className="h-4 w-4 text-primary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou descrição..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/75"
          />
        </div>
        {canCreateTask && (
          <button
            onClick={openForm}
            className="pressable inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-bold text-background transition hover:bg-foreground/90 md:hidden"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background/16">
              <Plus className="h-4 w-4" />
            </span>
            Nova
          </button>
        )}
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
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

      <TaskList
        tasks={list}
        employees={employees}
        departments={departments}
        groups={groups}
        currentUser={currentUser}
        showResponsible={canSeePeopleContext}
        selectedTaskId={selectedTaskId}
        onOpen={openTask}
        onComplete={(task) => statusMutation.mutate({ id: task.id, status: "completed" })}
        isCompleting={statusMutation.isPending}
      />

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
                        canSeePeopleContext ? "justify-between" : "justify-end",
                      )}
                    >
                      {canSeePeopleContext && <span className="truncate">{emp?.name}</span>}
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
      />
    </AppShell>
  );
}
