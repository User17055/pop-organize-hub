import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useDeferredValue, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { AppShell, StatusBadge, PriorityBadge } from "@/components/app-shell";
import { ErrorState, LoadingState } from "@/components/data-state";
import { createTask, updateTaskDetails, updateTaskStatus } from "@/lib/api/pop-organize.functions";
import { useWorkspaceData, workspaceQueryKey } from "@/lib/api/use-workspace";
import {
  priorityLabels,
  statusLabels,
  type Task,
  type Priority,
  type TargetType,
  type TaskStatus,
} from "@/lib/domain";
import { getTaskPermissions } from "@/lib/permissions";
import {
  Plus,
  Filter,
  Search,
  Calendar,
  MessageSquare,
  Paperclip,
  UserCircle2,
  Pencil,
  ShieldCheck,
  X,
  Check,
  Flag,
  Target,
  User,
  UserCheck,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tarefas")({
  head: () => ({
    meta: [
      { title: "Tarefas - Pop Organize" },
      { name: "description", content: "Gerencie, filtre e acompanhe todas as tarefas da empresa." },
    ],
  }),
  component: TasksPage,
});

const filters: Array<{ key: TaskStatus | "all"; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "pending", label: "Pendentes" },
  { key: "in_progress", label: "Em andamento" },
  { key: "waiting_review", label: "Aguardando revisão" },
  { key: "reopened", label: "Reabertas" },
  { key: "completed", label: "Concluídas" },
];

type TaskFormState = {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
  targetKey: string;
  responsibleId: string;
  reviewerId: string;
  requiresReview: boolean;
  tags: string;
};

type TaskEditState = {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
  tags: string;
};

function getDefaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

function TasksPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useWorkspaceData();
  const [active, setActive] = useState<TaskStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskFormState>({
    title: "",
    description: "",
    priority: "medium",
    dueDate: getDefaultDueDate(),
    targetKey: "",
    responsibleId: "",
    reviewerId: "",
    requiresReview: false,
    tags: "",
  });
  const [editForm, setEditForm] = useState<TaskEditState>({
    title: "",
    description: "",
    priority: "medium",
    dueDate: getDefaultDueDate(),
    tags: "",
  });

  const createTaskMutation = useMutation({
    mutationFn: (payload: {
      title: string;
      description: string;
      priority: Priority;
      dueDate: string;
      target: { type: TargetType; id: string };
      responsibleId: string;
      reviewerId?: string;
      requiresReview: boolean;
      tags: string[];
    }) => createTask({ data: payload }),
    onSuccess: () => {
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { id: string; status: TaskStatus }) =>
      updateTaskStatus({ data: payload }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      title: string;
      description: string;
      priority: Priority;
      dueDate: string;
      tags: string[];
    }) => updateTaskDetails({ data: payload }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  const deferredSearch = useDeferredValue(search);
  const taskRows = useMemo(() => data?.tasks ?? [], [data?.tasks]);
  const list = useMemo(
    () =>
      taskRows.filter(
        (t) =>
          (active === "all" || t.status === active) &&
          (deferredSearch === "" ||
            t.title.toLowerCase().includes(deferredSearch.toLowerCase()) ||
            t.description.toLowerCase().includes(deferredSearch.toLowerCase())),
      ),
    [active, deferredSearch, taskRows],
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
  const getEmployee = (id: string) => employees.find((employee) => employee.id === id);
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
    setForm({
      title: "",
      description: "",
      priority: "medium",
      dueDate: getDefaultDueDate(),
      targetKey: `company:${company.id}`,
      responsibleId: employees[0]?.id ?? "",
      reviewerId: "",
      requiresReview: false,
      tags: "",
    });
    createTaskMutation.reset();
    setShowForm(true);
  }

  function openTask(task: Task) {
    setSelectedTaskId(task.id);
    setEditForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      tags: task.tags.join(", "),
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
    });
  }

  const mutationError =
    createTaskMutation.error instanceof Error ? createTaskMutation.error.message : null;
  const updateError =
    updateTaskMutation.error instanceof Error ? updateTaskMutation.error.message : null;
  const statusError = statusMutation.error instanceof Error ? statusMutation.error.message : null;

  return (
    <AppShell
      title="Tarefas"
      subtitle="Acompanhe e organize todas as demandas da empresa"
      actions={
        <button
          onClick={openForm}
          className="hidden md:inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-[var(--shadow-elegant)]"
        >
          <Plus className="h-4 w-4" /> Nova tarefa
        </button>
      }
    >
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex-1 min-w-[240px] flex items-center gap-2 px-3 h-10 rounded-lg bg-card border border-border focus-within:border-primary/40 transition-colors">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou descrição..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        <button className="h-10 px-3 rounded-lg bg-card border border-border text-sm font-medium inline-flex items-center gap-2 hover:bg-muted transition-colors">
          <Filter className="h-4 w-4" /> Filtros
        </button>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {filters.map((f) => {
          const count =
            f.key === "all" ? tasks.length : tasks.filter((t) => t.status === f.key).length;
          const isActive = active === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setActive(f.key)}
              className={cn(
                "px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap transition-all inline-flex items-center gap-2",
                isActive
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]"
                  : "bg-card border border-border text-foreground/70 hover:border-primary/40",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "text-[11px] px-1.5 rounded-full",
                  isActive ? "bg-white/20" : "bg-muted",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.map((t) => {
          const emp = getEmployee(t.responsibleId);
          const reviewer = t.reviewerId ? getEmployee(t.reviewerId) : null;
          const permissions = getTaskPermissions({
            task: t,
            currentUser,
            employees,
            departments,
            groups,
          });
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              aria-label={`Abrir atividade ${t.title}`}
              onClick={() => openTask(t)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openTask(t);
                }
              }}
              className={cn(
                "group cursor-pointer bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-card)] hover:shadow-md hover:border-primary/40 transition-all outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/15",
                selectedTaskId === t.id && "border-primary/60 ring-2 ring-primary/10",
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <PriorityBadge priority={t.priority} />
                <StatusBadge status={t.status} />
              </div>
              <h3 className="font-display font-semibold text-base text-foreground leading-snug group-hover:text-primary transition-colors">
                {t.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{t.description}</p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {t.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-accent text-accent-foreground font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-primary-foreground shrink-0"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    {emp?.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{emp?.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {t.target.label}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground text-xs">
                  {t.comments > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {t.comments}
                    </span>
                  )}
                  {t.attachments > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Paperclip className="h-3.5 w-3.5" />
                      {t.attachments}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs gap-3">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(`${t.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}
                </span>
                {reviewer && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground truncate">
                    <UserCircle2 className="h-3.5 w-3.5" /> Revisor: {reviewer.name.split(" ")[0]}
                  </span>
                )}
              </div>

              <label
                className="mt-4 block cursor-default"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <span className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                  Atualizar status
                </span>
                <select
                  value={t.status}
                  disabled={!permissions.canChangeStatus || statusMutation.isPending}
                  onChange={(event) =>
                    statusMutation.mutate({ id: t.id, status: event.target.value as TaskStatus })
                  }
                  className="w-full h-9 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          );
        })}
      </div>

      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[2px] transition-opacity duration-300",
          selectedTask ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={() => setSelectedTaskId(null)}
        aria-hidden={!selectedTask}
      />
      {/* Sliding right sidebar (drawer) */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-screen w-full sm:w-[420px] bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-out",
          selectedTask ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!selectedTask}
      >
        {selectedTask && selectedPermissions && (
          <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="flex items-start gap-3">
              <button
                type="button"
                disabled={!selectedPermissions.canComplete || statusMutation.isPending}
                onClick={() =>
                  statusMutation.mutate({
                    id: selectedTask.id,
                    status: selectedTask.status === "completed" ? "in_progress" : "completed",
                  })
                }
                className={cn(
                  "mt-0.5 h-7 w-7 rounded-full border-2 flex items-center justify-center transition shrink-0 disabled:opacity-50",
                  selectedTask.status === "completed"
                    ? "bg-success border-success text-white"
                    : "border-border hover:border-primary",
                )}
                aria-label={selectedTask.status === "completed" ? "Reabrir" : "Concluir"}
              >
                {selectedTask.status === "completed" && <Check className="h-4 w-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <input
                  value={editForm.title}
                  disabled={!selectedPermissions.canEditContent}
                  onChange={(e) =>
                    setEditForm((current) => ({ ...current, title: e.target.value }))
                  }
                  className={cn(
                    "w-full text-lg font-display font-bold bg-transparent border-b border-transparent focus:border-primary outline-none transition placeholder:text-muted-foreground",
                    selectedTask.status === "completed" && "line-through text-muted-foreground",
                  )}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedTask.status === "completed"
                    ? "Concluída"
                    : `Criada em ${new Date(`${selectedTask.createdAt}T00:00:00`).toLocaleDateString("pt-BR")}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskId(null)}
                className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center transition"
                aria-label="Fechar atividade"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selectedTask.status} />
              <PriorityBadge priority={selectedTask.priority} />
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-accent text-accent-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                {selectedPermissions.roleLabel}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                <Pencil className="h-3.5 w-3.5" /> Notas
              </div>
              <textarea
                value={editForm.description}
                disabled={!selectedPermissions.canEditContent}
                onChange={(e) =>
                  setEditForm((current) => ({ ...current, description: e.target.value }))
                }
                rows={5}
                placeholder="Adicionar uma nota..."
                className="w-full px-3 py-2 rounded-xl bg-background border border-input outline-none focus:border-primary text-sm resize-none disabled:opacity-60 transition"
                required
              />
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Detalhes
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-muted-foreground">Prazo</div>
                    {selectedPermissions.canEditContent ? (
                      <input
                        type="date"
                        value={editForm.dueDate}
                        onChange={(e) =>
                          setEditForm((current) => ({ ...current, dueDate: e.target.value }))
                        }
                        className="w-full bg-transparent outline-none text-sm font-medium"
                        required
                      />
                    ) : (
                      <div className="text-sm font-medium">
                        {new Date(`${selectedTask.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30">
                  <Flag className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-muted-foreground">Prioridade</div>
                    {selectedPermissions.canEditContent ? (
                      <select
                        value={editForm.priority}
                        onChange={(e) =>
                          setEditForm((current) => ({
                            ...current,
                            priority: e.target.value as Priority,
                          }))
                        }
                        className="w-full bg-transparent outline-none text-sm font-medium"
                      >
                        {Object.entries(priorityLabels).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm font-medium">
                        {priorityLabels[selectedTask.priority]}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30">
                  <Target className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-muted-foreground">Destino</div>
                    <div className="text-sm font-medium truncate">{selectedTask.target.label}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-muted-foreground">Responsável</div>
                    <div className="text-sm font-medium truncate">
                      {getEmployee(selectedTask.responsibleId)?.name}
                    </div>
                  </div>
                </div>

                {selectedTask.reviewerId && (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30">
                    <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-muted-foreground">Revisor</div>
                      <div className="text-sm font-medium truncate">
                        {getEmployee(selectedTask.reviewerId)?.name}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                <Tag className="h-3.5 w-3.5" /> Tags
              </div>
              {selectedPermissions.canEditContent ? (
                <input
                  value={editForm.tags}
                  onChange={(e) => setEditForm((current) => ({ ...current, tags: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm"
                  placeholder="Separadas por vírgula"
                />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedTask.tags.length > 0 ? (
                    selectedTask.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-accent text-accent-foreground font-medium"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Nenhuma tag</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {selectedTask.comments > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {selectedTask.comments} comentário{selectedTask.comments !== 1 ? "s" : ""}
                </span>
              )}
              {selectedTask.attachments > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5" />
                  {selectedTask.attachments} anexo{selectedTask.attachments !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {!selectedPermissions.canEditContent && (
              <p className="text-xs text-muted-foreground">
                Sua hierarquia permite alterar status/conclusão, mas não editar o texto.
              </p>
            )}
            {(updateError || statusError) && (
              <div className="text-sm text-destructive">{updateError ?? statusError}</div>
            )}

            {selectedPermissions.canEditContent && (
              <button
                type="submit"
                disabled={updateTaskMutation.isPending}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-[var(--shadow-elegant)] disabled:opacity-60"
              >
                {updateTaskMutation.isPending ? "Salvando..." : "Salvar alterações"}
              </button>
            )}
          </form>
        )}
      </aside>

      {list.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">Nenhuma tarefa encontrada.</div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <form
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2 className="text-xl font-display font-bold mb-1">Nova tarefa</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Preencha os dados abaixo para criar uma nova tarefa.
            </p>
            <div className="space-y-3.5">
              <Field label="Título">
                <input
                  value={form.title}
                  onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm"
                  placeholder="Ex: Criar campanha..."
                  required
                />
              </Field>
              <Field label="Descrição">
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm resize-none"
                  required
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Prioridade">
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, priority: e.target.value as Priority }))
                    }
                    className="w-full h-10 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm"
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
                      setForm((current) => ({ ...current, dueDate: e.target.value }))
                    }
                    className="w-full h-10 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm"
                    required
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Destino">
                  <select
                    value={form.targetKey}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, targetKey: e.target.value }))
                    }
                    className="w-full h-10 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm"
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
                      setForm((current) => ({ ...current, responsibleId: e.target.value }))
                    }
                    className="w-full h-10 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm"
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
                    setForm((current) => ({ ...current, requiresReview: e.target.checked }))
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
                      setForm((current) => ({ ...current, reviewerId: e.target.value }))
                    }
                    className="w-full h-10 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm"
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
                  onChange={(e) => setForm((current) => ({ ...current, tags: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm"
                  placeholder="Separadas por vírgula"
                />
              </Field>
              {mutationError && <div className="text-sm text-destructive">{mutationError}</div>}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="h-10 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createTaskMutation.isPending}
                className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-[var(--shadow-elegant)] disabled:opacity-60"
              >
                {createTaskMutation.isPending ? "Criando..." : "Criar tarefa"}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground/70 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
