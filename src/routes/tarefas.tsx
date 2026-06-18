import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  useDeferredValue,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { AppShell, StatusBadge, PriorityBadge } from "@/components/app-shell";
import { ErrorState, LoadingState } from "@/components/data-state";
import {
  addTaskAttachment,
  addTaskComment,
  createTask,
  deleteTask,
  updateTaskDetails,
  updateTaskStatus,
} from "@/lib/api/pop-organize.functions";
import { useWorkspaceData, workspaceQueryKey, type WorkspaceResult } from "@/lib/api/use-workspace";
import {
  priorityLabels,
  statusLabels,
  type Task,
  type Priority,
  type TargetType,
  type TaskStatus,
  type TaskRecurrence,
  type RecurrenceFrequency,
  type RecurrenceCustomUnit,
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
  Trash2,
  ChevronDown,
  Archive,
  Send,
  FileText,
  Repeat,
  Star,
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
  recurrence: RecurrenceFormState;
};

type TaskEditState = {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
  tags: string;
  recurrence: RecurrenceFormState;
};

type RecurrenceFormState = {
  frequency: RecurrenceFrequency | "none";
  interval: string;
  customUnit: RecurrenceCustomUnit;
  dayOfMonth: string;
  monthOfYear: string;
  endDate: string;
};

type RecurrenceInput =
  | {
      frequency: RecurrenceFrequency;
      interval?: number;
      intervalDays?: number;
      customUnit?: RecurrenceCustomUnit;
      dayOfMonth?: number;
      monthOfYear?: number;
      endDate?: string;
    }
  | undefined;

function getDefaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

const recurrenceOptions: Array<{ value: RecurrenceFormState["frequency"]; label: string }> = [
  { value: "none", label: "Sem recorrência" },
  { value: "daily", label: "Diária" },
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "monthly", label: "Mensal" },
  { value: "yearly", label: "Anual" },
  { value: "custom", label: "Personalizada" },
];

const customUnitOptions: Array<{ value: RecurrenceCustomUnit; label: string }> = [
  { value: "days", label: "dias" },
  { value: "weeks", label: "semanas" },
  { value: "months", label: "meses" },
  { value: "years", label: "anos" },
];

const monthOptions = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
].map((label, index) => ({ value: String(index + 1), label }));

function clampNumber(
  value: string | number | undefined,
  min: number,
  max: number,
  fallback: number,
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function getDueDateAnchor(dueDate?: string) {
  const [, month, day] = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate ?? "") ?? [];
  return {
    dayOfMonth: day ? String(Number(day)) : "1",
    monthOfYear: month ? String(Number(month)) : "1",
  };
}

function formatFileSizeMb(sizeInBytes: number) {
  if (sizeInBytes <= 0) return "0 MB";
  const sizeInMb = sizeInBytes / 1_048_576;
  const precision = sizeInMb >= 1 ? 1 : sizeInMb >= 0.1 ? 2 : 3;
  return `${sizeInMb.toFixed(precision).replace(".", ",")} MB`;
}

function isOverdue(task: Task) {
  if (task.status === "completed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${task.dueDate}T00:00:00`);
  return due < today;
}

function getDefaultRecurrence(dueDate?: string): RecurrenceFormState {
  const anchor = getDueDateAnchor(dueDate);
  return {
    frequency: "none",
    interval: "1",
    customUnit: "days",
    dayOfMonth: anchor.dayOfMonth,
    monthOfYear: anchor.monthOfYear,
    endDate: "",
  };
}

function recurrenceToForm(recurrence?: TaskRecurrence, dueDate?: string): RecurrenceFormState {
  const anchor = getDueDateAnchor(dueDate);
  return {
    frequency: recurrence?.frequency ?? "none",
    interval: String(recurrence?.interval ?? recurrence?.intervalDays ?? 1),
    customUnit: recurrence?.customUnit ?? "days",
    dayOfMonth: String(recurrence?.dayOfMonth ?? anchor.dayOfMonth),
    monthOfYear: String(recurrence?.monthOfYear ?? anchor.monthOfYear),
    endDate: recurrence?.endDate ?? "",
  };
}

function recurrenceFromForm(recurrence: RecurrenceFormState): RecurrenceInput {
  if (recurrence.frequency === "none") return undefined;

  const endDate = recurrence.endDate || undefined;
  const dayOfMonth = clampNumber(recurrence.dayOfMonth, 1, 31, 1);
  const monthOfYear = clampNumber(recurrence.monthOfYear, 1, 12, 1);

  if (recurrence.frequency === "monthly") {
    return { frequency: recurrence.frequency, dayOfMonth, endDate };
  }

  if (recurrence.frequency === "yearly") {
    return { frequency: recurrence.frequency, dayOfMonth, monthOfYear, endDate };
  }

  if (recurrence.frequency === "custom") {
    const interval = clampNumber(recurrence.interval, 1, 120, 1);
    return {
      frequency: recurrence.frequency,
      interval,
      intervalDays: recurrence.customUnit === "days" ? interval : undefined,
      customUnit: recurrence.customUnit,
      dayOfMonth:
        recurrence.customUnit === "months" || recurrence.customUnit === "years"
          ? dayOfMonth
          : undefined,
      monthOfYear: recurrence.customUnit === "years" ? monthOfYear : undefined,
      endDate,
    };
  }

  return { frequency: recurrence.frequency, endDate };
}

function recurrenceLabel(recurrence?: TaskRecurrence) {
  if (!recurrence) return "Sem recorrência";

  const interval = recurrence.interval ?? recurrence.intervalDays ?? 1;
  const unit = recurrence.customUnit ?? "days";
  const hasDayOfMonth = recurrence.dayOfMonth != null;
  const hasMonthOfYear = recurrence.monthOfYear != null;
  const dayOfMonth = recurrence.dayOfMonth ?? 1;
  const monthName = monthOptions[(recurrence.monthOfYear ?? 1) - 1]?.label ?? "Janeiro";
  const plural = (value: number, singular: string, pluralText: string) =>
    value === 1 ? singular : pluralText;

  const label =
    recurrence.frequency === "daily"
      ? "Diária"
      : recurrence.frequency === "weekly"
        ? "Semanal"
        : recurrence.frequency === "biweekly"
          ? "Quinzenal"
          : recurrence.frequency === "monthly"
            ? hasDayOfMonth
              ? `Mensal no dia ${dayOfMonth}`
              : "Mensal pelo dia do prazo"
            : recurrence.frequency === "yearly"
              ? hasDayOfMonth && hasMonthOfYear
                ? `Anual em ${dayOfMonth} de ${monthName.toLowerCase()}`
                : "Anual pelo dia do prazo"
              : unit === "weeks"
                ? `A cada ${interval} ${plural(interval, "semana", "semanas")}`
                : unit === "months"
                  ? hasDayOfMonth
                    ? `A cada ${interval} ${plural(interval, "mês", "meses")} no dia ${dayOfMonth}`
                    : `A cada ${interval} ${plural(interval, "mês", "meses")}`
                  : unit === "years"
                    ? hasDayOfMonth && hasMonthOfYear
                      ? `A cada ${interval} ${plural(interval, "ano", "anos")} em ${dayOfMonth} de ${monthName.toLowerCase()}`
                      : `A cada ${interval} ${plural(interval, "ano", "anos")}`
                    : `A cada ${interval} ${plural(interval, "dia", "dias")}`;

  return recurrence.endDate
    ? `${label} até ${new Date(`${recurrence.endDate}T00:00:00`).toLocaleDateString("pt-BR")}`
    : label;
}

function RecurrenceFields({
  value,
  onChange,
  compact = false,
}: {
  value: RecurrenceFormState;
  onChange: (value: RecurrenceFormState) => void;
  compact?: boolean;
}) {
  const inputClass = compact
    ? "h-8 w-full rounded-lg border border-input bg-background px-2 text-xs outline-none focus:border-primary"
    : "w-full h-10 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm";
  const update = (patch: Partial<RecurrenceFormState>) => onChange({ ...value, ...patch });
  const isActive = value.frequency !== "none";
  const showMonthlyDay =
    value.frequency === "monthly" ||
    (value.frequency === "custom" && value.customUnit === "months");
  const showYearlyDate =
    value.frequency === "yearly" || (value.frequency === "custom" && value.customUnit === "years");

  return (
    <div className={cn("grid grid-cols-1 gap-3", !compact && "sm:grid-cols-2")}>
      <Field label="Frequência">
        <select
          value={value.frequency}
          onChange={(event) =>
            update({ frequency: event.target.value as RecurrenceFormState["frequency"] })
          }
          className={inputClass}
        >
          {recurrenceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      {value.frequency === "custom" && (
        <Field label="Repetir a cada">
          <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2">
            <input
              type="number"
              min={1}
              max={120}
              value={value.interval}
              onChange={(event) => update({ interval: event.target.value })}
              className={inputClass}
            />
            <select
              value={value.customUnit}
              onChange={(event) =>
                update({ customUnit: event.target.value as RecurrenceCustomUnit })
              }
              className={inputClass}
            >
              {customUnitOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </Field>
      )}

      {showMonthlyDay && (
        <Field label="Dia do mês">
          <input
            type="number"
            min={1}
            max={31}
            value={value.dayOfMonth}
            onChange={(event) => update({ dayOfMonth: event.target.value })}
            className={inputClass}
          />
        </Field>
      )}

      {showYearlyDate && (
        <>
          <Field label="Mês">
            <select
              value={value.monthOfYear}
              onChange={(event) => update({ monthOfYear: event.target.value })}
              className={inputClass}
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Dia">
            <input
              type="number"
              min={1}
              max={31}
              value={value.dayOfMonth}
              onChange={(event) => update({ dayOfMonth: event.target.value })}
              className={inputClass}
            />
          </Field>
        </>
      )}

      {isActive && (
        <Field label="Parar em">
          <input
            type="date"
            value={value.endDate}
            onChange={(event) => update({ endDate: event.target.value })}
            className={inputClass}
            aria-label="Data final da recorrência"
          />
        </Field>
      )}
    </div>
  );
}

function TasksPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useWorkspaceData();
  const [active, setActive] = useState<TaskStatus | "all">("all");
  const [search, setSearch] = useState("");
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

  function updateTaskInWorkspace(updatedTask: Task) {
    queryClient.setQueryData<WorkspaceResult>(workspaceQueryKey, (current) =>
      current
        ? {
            ...current,
            tasks: current.tasks.map((task) =>
              task.id === updatedTask.id ? { ...task, ...updatedTask } : task,
            ),
          }
        : current,
    );
  }

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
      recurrence?: RecurrenceInput;
    }) => createTask({ data: payload }),
    onSuccess: () => {
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { id: string; status: TaskStatus }) =>
      updateTaskStatus({ data: payload }),
    onSuccess: (updatedTask) => {
      if (updatedTask.status === "completed") {
        setSelectedTaskId(null);
      }
      updateTaskInWorkspace(updatedTask);
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
      recurrence?: RecurrenceInput;
    }) => updateTaskDetails({ data: payload }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (payload: { id: string }) => deleteTask({ data: payload }),
    onSuccess: (_result, variables) => {
      setSelectedTaskId(null);
      queryClient.setQueryData<WorkspaceResult>(workspaceQueryKey, (current) =>
        current
          ? {
              ...current,
              tasks: current.tasks.filter((task) => task.id !== variables.id),
            }
          : current,
      );
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (payload: { taskId: string; body: string }) => addTaskComment({ data: payload }),
    onSuccess: (updatedTask) => {
      setCommentBody("");
      updateTaskInWorkspace(updatedTask);
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  const attachmentMutation = useMutation({
    mutationFn: (payload: { taskId: string; name: string; sizeLabel?: string }) =>
      addTaskAttachment({ data: payload }),
    onSuccess: (updatedTask) => {
      updateTaskInWorkspace(updatedTask);
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

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
            t.description.toLowerCase().includes(normalizedSearch)),
      ),
    [active, normalizedSearch, taskRows],
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

  function handleCommentSubmit(event: FormEvent) {
    event.preventDefault();
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
            f.key === "all"
              ? activeTaskRows.length
              : activeTaskRows.filter((t) => t.status === f.key).length;
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

      <div className="flex flex-col gap-3">
        {list.map((t) => {
          const emp = getEmployee(t.responsibleId);
          const overdue = isOverdue(t);
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
                "group flex items-center gap-3 cursor-pointer bg-card border rounded-2xl p-3.5 sm:p-4 shadow-[var(--shadow-card)] hover:shadow-md hover:border-primary/40 transition-all outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/15",
                overdue ? "border-destructive/40 bg-destructive/[0.03]" : "border-border",
                selectedTaskId === t.id && "border-primary/60 ring-2 ring-primary/10",
              )}
            >
              {/* Checkbox */}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (!permissions.canChangeStatus || statusMutation.isPending) return;
                  statusMutation.mutate({ id: t.id, status: "completed" });
                }}
                disabled={!permissions.canChangeStatus || statusMutation.isPending}
                className={cn(
                  "shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition disabled:opacity-40",
                  overdue
                    ? "border-destructive/50 text-destructive hover:border-destructive"
                    : "border-muted-foreground/30 text-primary hover:border-primary",
                )}
                aria-label="Concluir tarefa"
              >
                <Check className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition" />
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-[15px] sm:text-base text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {t.title}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(`${t.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <PriorityBadge priority={t.priority} />
                  {overdue && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-semibold">
                      Atrasada
                    </span>
                  )}
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

              {/* Avatar (right side, centered) */}
              <div
                className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-xs font-semibold text-primary-foreground ring-2 ring-background"
                style={{ background: "var(--gradient-primary)" }}
                title={emp?.name}
              >
                {emp?.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </div>
            </div>
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
        <section className="mt-6 rounded-2xl border border-dashed border-border bg-card/60 shadow-[var(--shadow-card)]">
          <button
            type="button"
            onClick={() => setShowCompleted((current) => !current)}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
          >
            <span className="inline-flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Archive className="h-4 w-4" />
              </span>
              <span>
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
                "h-4 w-4 text-muted-foreground transition-transform",
                showCompleted && "rotate-180",
              )}
            />
          </button>

          {showCompleted && (
            <div className="grid grid-cols-1 gap-3 border-t border-border/70 p-4 md:grid-cols-2 xl:grid-cols-3 animate-in fade-in slide-in-from-top-1 duration-150">
              {completedTasks.map((task) => {
                const emp = getEmployee(task.responsibleId);
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => openTask(task)}
                    className="rounded-xl border border-border/70 bg-background/70 p-4 text-left opacity-65 transition hover:border-primary/30 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 shrink-0 text-success" />
                          <h3 className="truncate text-sm font-semibold text-foreground line-through">
                            {task.title}
                          </h3>
                        </div>
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
                    <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                      <span className="truncate">{emp?.name}</span>
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

      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300",
          selectedTask ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={() => setSelectedTaskId(null)}
        aria-hidden={!selectedTask}
      />
      {/* Sliding right sidebar (drawer) */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-screen w-full sm:w-[460px] bg-background border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-out",
          selectedTask ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!selectedTask}
      >
        {selectedTask && selectedPermissions && (
          <form onSubmit={handleEditSubmit} className="flex h-full flex-col">
            {/* Sticky header */}
            <header className="sticky top-0 z-10 border-b border-border bg-card px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {selectedPermissions.roleLabel}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTaskId(null)}
                  className="h-9 w-9 rounded-lg bg-muted hover:bg-muted/70 text-foreground flex items-center justify-center transition"
                  aria-label="Fechar atividade"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex items-start gap-3">
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
                    "mt-1 h-6 w-6 rounded-full border-2 flex items-center justify-center transition shrink-0 disabled:opacity-50",
                    selectedTask.status === "completed"
                      ? "bg-success border-success text-white"
                      : "border-muted-foreground/40 hover:border-foreground",
                  )}
                  aria-label={selectedTask.status === "completed" ? "Reabrir" : "Concluir"}
                >
                  {selectedTask.status === "completed" && <Check className="h-3.5 w-3.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <input
                    value={editForm.title}
                    disabled={!selectedPermissions.canEditContent}
                    onChange={(e) =>
                      setEditForm((current) => ({ ...current, title: e.target.value }))
                    }
                    className={cn(
                      "w-full text-lg font-display font-semibold bg-transparent border-b border-transparent focus:border-border outline-none transition text-foreground placeholder:text-muted-foreground",
                      selectedTask.status === "completed" && "line-through text-muted-foreground",
                    )}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedTask.status === "completed"
                      ? "Concluída"
                      : `Criada em ${new Date(`${selectedTask.createdAt}T00:00:00`).toLocaleDateString("pt-BR")}`}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <StatusBadge status={selectedTask.status} />
                <PriorityBadge priority={selectedTask.priority} />
              </div>
            </header>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                <Pencil className="h-3.5 w-3.5" /> Notas
              </div>
              <textarea
                value={editForm.description}
                disabled={!selectedPermissions.canEditContent}
                onChange={(e) =>
                  setEditForm((current) => ({ ...current, description: e.target.value }))
                }
                rows={4}
                placeholder="Adicionar uma nota..."
                className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-transparent outline-none focus:border-primary focus:bg-background text-sm resize-none disabled:opacity-60 transition"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Detalhes
              </div>
              <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition">
                  <div className="h-8 w-8 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-muted-foreground">Prazo</div>
                    {selectedPermissions.canEditContent ? (
                      <input
                        type="date"
                        value={editForm.dueDate}
                        onChange={(e) =>
                          setEditForm((current) => ({ ...current, dueDate: e.target.value }))
                        }
                        className="w-full bg-transparent outline-none text-[15px] font-semibold text-foreground"
                        required
                      />
                    ) : (
                      <div className="text-[15px] font-semibold text-foreground">
                        {new Date(`${selectedTask.dueDate}T00:00:00`).toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition">
                  <div className="h-8 w-8 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
                    <Repeat className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-muted-foreground">Recorrência</div>
                    {selectedPermissions.canEditContent ? (
                      <div className="mt-1.5">
                        <RecurrenceFields
                          compact
                          value={editForm.recurrence}
                          onChange={(recurrence) =>
                            setEditForm((current) => ({
                              ...current,
                              recurrence,
                            }))
                          }
                        />
                      </div>
                    ) : (
                      <div className="text-[15px] font-semibold text-foreground">
                        {recurrenceLabel(selectedTask.recurrence)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition">
                  <div className="h-8 w-8 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
                    <Flag className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-muted-foreground">Prioridade</div>
                    {selectedPermissions.canEditContent ? (
                      <select
                        value={editForm.priority}
                        onChange={(e) =>
                          setEditForm((current) => ({
                            ...current,
                            priority: e.target.value as Priority,
                          }))
                        }
                        className="w-full bg-transparent outline-none text-[15px] font-semibold text-foreground"
                      >
                        {Object.entries(priorityLabels).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-[15px] font-semibold text-foreground">
                        {priorityLabels[selectedTask.priority]}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition">
                  <div className="h-8 w-8 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
                    <Target className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-muted-foreground">Destino</div>
                    <div className="text-[15px] font-semibold text-foreground truncate">{selectedTask.target.label}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                    {getEmployee(selectedTask.responsibleId)?.name?.charAt(0) ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-muted-foreground">Responsável</div>
                    <div className="text-[15px] font-semibold text-foreground truncate">
                      {getEmployee(selectedTask.responsibleId)?.name}
                    </div>
                  </div>
                </div>

                {selectedTask.reviewerId && (
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition">
                    <div className="h-8 w-8 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-muted-foreground">Revisor</div>
                      <div className="text-[15px] font-semibold text-foreground truncate">
                        {getEmployee(selectedTask.reviewerId)?.name}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                <Tag className="h-3.5 w-3.5" /> Tags
              </div>
              {selectedPermissions.canEditContent ? (
                <input
                  value={editForm.tags}
                  onChange={(e) => setEditForm((current) => ({ ...current, tags: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-muted/40 border border-transparent outline-none focus:border-primary focus:bg-background text-sm transition"
                  placeholder="Separadas por vírgula"
                />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedTask.tags.length > 0 ? (
                    selectedTask.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium"
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

            <div className="space-y-4">
              <section className="rounded-xl border border-border bg-card p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Comentários
                  </div>
                  <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {selectedTask.comments}
                  </span>
                </div>

                <div className="space-y-2">
                  {(selectedTask.commentItems ?? []).map((comment) => {
                    const author = getEmployee(comment.authorId);
                    return (
                      <div key={comment.id} className="rounded-lg bg-muted/40 p-2.5">
                        <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {author?.name ?? "Usuario"}
                          </span>
                          <span>
                            {new Date(comment.createdAt).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/85">{comment.body}</p>
                      </div>
                    );
                  })}
                  {selectedTask.comments > (selectedTask.commentItems?.length ?? 0) && (
                    <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                      {selectedTask.comments - (selectedTask.commentItems?.length ?? 0)} comentário
                      {selectedTask.comments - (selectedTask.commentItems?.length ?? 0) === 1
                        ? ""
                        : "s"}{" "}
                      no histórico.
                    </div>
                  )}
                </div>

                {selectedPermissions.canChangeStatus && (
                  <form onSubmit={handleCommentSubmit} className="mt-3 flex gap-2">
                    <input
                      value={commentBody}
                      onChange={(event) => setCommentBody(event.target.value)}
                      placeholder="Escrever comentário..."
                      className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                    />
                    <button
                      type="submit"
                      disabled={commentMutation.isPending || !commentBody.trim()}
                      className="h-9 w-9 rounded-lg bg-primary text-primary-foreground disabled:opacity-60 inline-flex items-center justify-center hover:opacity-90 transition"
                      aria-label="Enviar comentário"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </section>

              <section className="rounded-xl border border-border bg-card p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <Paperclip className="h-3.5 w-3.5" />
                    Anexos
                  </div>
                  <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {selectedTask.attachments}
                  </span>
                </div>

                <div className="space-y-2">
                  {(selectedTask.attachmentItems ?? []).map((attachment) => {
                    const author = getEmployee(attachment.uploadedById);
                    return (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 rounded-lg bg-muted/40 p-2.5"
                      >
                        <div className="h-8 w-8 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{attachment.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {attachment.sizeLabel} · {author?.name ?? "Usuario"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {selectedTask.attachments > (selectedTask.attachmentItems?.length ?? 0) && (
                    <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                      {selectedTask.attachments - (selectedTask.attachmentItems?.length ?? 0)} anexo
                      {selectedTask.attachments - (selectedTask.attachmentItems?.length ?? 0) === 1
                        ? ""
                        : "s"}{" "}
                      no histórico.
                    </div>
                  )}
                </div>

                {selectedPermissions.canChangeStatus && (
                  <div className="mt-3">
                    <label
                      className={cn(
                        "flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 text-sm font-medium transition hover:bg-muted hover:border-primary/50 hover:text-primary",
                        attachmentMutation.isPending && "pointer-events-none opacity-60",
                      )}
                    >
                      <Paperclip className="h-4 w-4" />
                      {attachmentMutation.isPending ? "Anexando..." : "Adicionar arquivo"}
                      <input type="file" onChange={handleAttachmentFile} className="sr-only" />
                    </label>
                  </div>
                )}
              </section>
            </div>

            {!selectedPermissions.canEditContent && (
              <p className="text-xs text-muted-foreground">
                Sua hierarquia permite alterar status/conclusão, mas não editar o texto.
              </p>
            )}
            {(updateError || statusError || deleteError || commentError || attachmentError) && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {updateError ?? statusError ?? deleteError ?? commentError ?? attachmentError}
              </div>
            )}
            </div>

            {/* Sticky footer */}
            {(selectedPermissions.canEditContent || selectedPermissions.canDelete) && (
              <footer className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur px-5 py-3 flex gap-2">
                {selectedPermissions.canDelete && (
                  <button
                    type="button"
                    onClick={handleDeleteSelectedTask}
                    disabled={deleteTaskMutation.isPending}
                    className="h-10 w-10 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 transition disabled:opacity-60 inline-flex items-center justify-center shrink-0"
                    aria-label="Excluir tarefa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                {selectedPermissions.canEditContent && (
                  <button
                    type="submit"
                    disabled={updateTaskMutation.isPending}
                    className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition shadow-[var(--shadow-elegant)] disabled:opacity-60"
                  >
                    {updateTaskMutation.isPending ? "Salvando..." : "Salvar alterações"}
                  </button>
                )}
              </footer>
            )}
          </form>
        )}
      </aside>


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
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Repeat className="h-3.5 w-3.5" />
                  Recorrência
                </div>
                <RecurrenceFields
                  value={form.recurrence}
                  onChange={(recurrence) =>
                    setForm((current) => ({
                      ...current,
                      recurrence,
                    }))
                  }
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
