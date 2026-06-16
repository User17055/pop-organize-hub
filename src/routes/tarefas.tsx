import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { AppShell, StatusBadge, PriorityBadge } from "@/components/app-shell";
import { ErrorState, LoadingState } from "@/components/data-state";
import { createTask, updateTaskStatus } from "@/lib/api/pop-organize.functions";
import { useWorkspaceData, workspaceQueryKey } from "@/lib/api/use-workspace";
import {
  priorityLabels,
  statusLabels,
  type Priority,
  type TargetType,
  type TaskStatus,
} from "@/lib/domain";
import {
  Plus,
  Filter,
  Search,
  Calendar,
  MessageSquare,
  Paperclip,
  UserCircle2,
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
      setShowForm(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { id: string; status: TaskStatus }) =>
      updateTaskStatus({ data: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceQueryKey }),
  });

  const taskRows = useMemo(() => data?.tasks ?? [], [data?.tasks]);
  const list = useMemo(
    () =>
      taskRows.filter(
        (t) =>
          (active === "all" || t.status === active) &&
          (search === "" ||
            t.title.toLowerCase().includes(search.toLowerCase()) ||
            t.description.toLowerCase().includes(search.toLowerCase())),
      ),
    [active, search, taskRows],
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

  const { company, departments, employees, groups, tasks } = data;
  const getEmployee = (id: string) => employees.find((employee) => employee.id === id);
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

  const mutationError =
    createTaskMutation.error instanceof Error ? createTaskMutation.error.message : null;

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
          return (
            <div
              key={t.id}
              className="group bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-card)] hover:shadow-md hover:border-primary/40 transition-all"
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

              <label className="mt-4 block">
                <span className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                  Atualizar status
                </span>
                <select
                  value={t.status}
                  onChange={(event) =>
                    statusMutation.mutate({ id: t.id, status: event.target.value as TaskStatus })
                  }
                  className="w-full h-9 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-xs"
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
