import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/data-state";
import { useWorkspaceData } from "@/lib/api/use-workspace";
import type { Priority, Task, TaskStatus } from "@/lib/domain";
import { priorityLabels, statusLabels, unassignedResponsibleLabel } from "@/lib/domain";
import { cn } from "@/lib/utils";

type PrintSearch = { setor?: string };

export const Route = createFileRoute("/imprimir/setor")({
  validateSearch: (search: Record<string, unknown>): PrintSearch => ({
    setor:
      typeof search.setor === "string" && search.setor.trim() ? search.setor.trim() : undefined,
  }),
  head: () => ({ meta: [{ title: "Imprimir tarefas do setor - Pop Organize" }] }),
  component: PrintDepartmentPage,
});

type DueFilter = "any" | "overdue" | "today" | "week" | "range";

const statusOrder: TaskStatus[] = [
  "pending",
  "in_progress",
  "waiting_review",
  "reopened",
  "completed",
  "canceled",
];
const defaultStatuses: TaskStatus[] = ["pending", "in_progress", "waiting_review", "reopened"];
const priorityOrder: Priority[] = ["urgent", "high", "medium", "low"];
const priorityRank: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const dueFilterLabels: Record<DueFilter, string> = {
  any: "Qualquer prazo",
  overdue: "Atrasadas",
  today: "Vencem hoje",
  week: "Próximos 7 dias",
  range: "Período",
};
const NO_RESPONSIBLE = "__none__";

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : isoDate;
}

function isOpen(task: Task) {
  return task.status !== "completed" && task.status !== "canceled";
}

function responsibleIdsOf(task: Task) {
  return Array.from(new Set([task.responsibleId, ...(task.responsibleIds ?? [])].filter(Boolean)));
}

function PrintDepartmentPage() {
  const { setor } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data, isLoading, error } = useWorkspaceData();

  const [statuses, setStatuses] = useState<TaskStatus[]>(defaultStatuses);
  const [priorities, setPriorities] = useState<Priority[]>(priorityOrder);
  const [dueFilter, setDueFilter] = useState<DueFilter>("any");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [responsible, setResponsible] = useState("all");
  const [includeSubtasks, setIncludeSubtasks] = useState(true);

  const today = todayInSaoPaulo();
  const department = data?.departments.find((item) => item.id === setor);
  const employeeNames = useMemo(
    () => new Map((data?.employees ?? []).map((employee) => [employee.id, employee.name])),
    [data?.employees],
  );
  const departmentTasks = useMemo(
    () =>
      (data?.tasks ?? []).filter(
        (task) => task.target.type === "department" && task.target.id === setor,
      ),
    [data?.tasks, setor],
  );
  const responsibleOptions = useMemo(() => {
    const ids = new Set(departmentTasks.flatMap(responsibleIdsOf));
    return Array.from(ids)
      .map((id) => ({ id, name: employeeNames.get(id) ?? "Colaborador removido" }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [departmentTasks, employeeNames]);

  const rows = useMemo(() => {
    const weekEnd = addDays(today, 7);
    return departmentTasks
      .filter((task) => statuses.includes(task.status))
      .filter((task) => priorities.includes(task.priority))
      .filter((task) => {
        if (responsible === "all") return true;
        const ids = responsibleIdsOf(task);
        return responsible === NO_RESPONSIBLE ? ids.length === 0 : ids.includes(responsible);
      })
      .filter((task) => {
        if (dueFilter === "overdue") return isOpen(task) && task.dueDate < today;
        if (dueFilter === "today") return task.dueDate === today;
        if (dueFilter === "week") return task.dueDate >= today && task.dueDate <= weekEnd;
        if (dueFilter === "range") {
          return (!dueFrom || task.dueDate >= dueFrom) && (!dueTo || task.dueDate <= dueTo);
        }
        return true;
      })
      .sort((a, b) => {
        const aLate = isOpen(a) && a.dueDate < today ? 0 : 1;
        const bLate = isOpen(b) && b.dueDate < today ? 0 : 1;
        return (
          aLate - bLate ||
          a.dueDate.localeCompare(b.dueDate) ||
          priorityRank[a.priority] - priorityRank[b.priority] ||
          a.title.localeCompare(b.title, "pt-BR")
        );
      });
  }, [departmentTasks, statuses, priorities, responsible, dueFilter, dueFrom, dueTo, today]);

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState />;

  const toggle = <T,>(list: T[], value: T) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const filterSummary = [
    statuses.length === statusOrder.length
      ? "Todas as situações"
      : statuses.length === defaultStatuses.length &&
          defaultStatuses.every((status) => statuses.includes(status))
        ? "Em aberto"
        : statuses.map((status) => statusLabels[status]).join(", ") || "Nenhuma situação",
    priorities.length === priorityOrder.length
      ? null
      : `Prioridade: ${priorities.map((priority) => priorityLabels[priority]).join(", ")}`,
    dueFilter === "any"
      ? null
      : dueFilter === "range"
        ? `Prazo: ${dueFrom ? formatDate(dueFrom) : "início"} a ${dueTo ? formatDate(dueTo) : "fim"}`
        : `Prazo: ${dueFilterLabels[dueFilter]}`,
    responsible === "all"
      ? null
      : `Responsável: ${
          responsible === NO_RESPONSIBLE
            ? unassignedResponsibleLabel("department")
            : (employeeNames.get(responsible) ?? "Colaborador removido")
        }`,
  ]
    .filter(Boolean)
    .join(" · ");
  const printedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-background text-foreground/70 hover:border-primary/50",
    );

  return (
    <div className="min-h-screen bg-muted/40 print:bg-white">
      <style>{`
        @page { size: A4 portrait; margin: 14mm 12mm 16mm; @bottom-right { content: "Página " counter(page) " de " counter(pages); font-size: 9pt; color: #555; } }
        @media print { html, body { background: #fff !important; min-width: 0 !important; height: auto !important; overflow: visible !important; } }
      `}</style>

      <aside className="mx-auto max-w-4xl px-4 pt-6 print:hidden">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/tarefas"
              search={{ setor }}
              className="inline-flex items-center gap-2 text-xs font-bold text-foreground/70 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar para as tarefas
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!department}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" /> Imprimir
            </button>
          </div>

          <h1 className="mt-4 font-display text-lg font-bold">Filtros da impressão</h1>
          <p className="text-xs text-muted-foreground">
            Valem só para esta folha. A lista de tarefas não muda.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold">
              Setor
              <select
                value={setor ?? ""}
                onChange={(event) => {
                  setResponsible("all");
                  navigate({ search: { setor: event.target.value || undefined } });
                }}
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal"
              >
                <option value="">Escolha um setor</option>
                {data.departments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-bold">
              Responsável
              <select
                value={responsible}
                onChange={(event) => setResponsible(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal"
              >
                <option value="all">Todos</option>
                <option value={NO_RESPONSIBLE}>{unassignedResponsibleLabel("department")}</option>
                {responsibleOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="mt-4">
            <legend className="text-xs font-bold">Situação</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {statusOrder.map((status) => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={statuses.includes(status)}
                  onClick={() => setStatuses((current) => toggle(current, status))}
                  className={chip(statuses.includes(status))}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-4">
            <legend className="text-xs font-bold">Prioridade</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {priorityOrder.map((priority) => (
                <button
                  key={priority}
                  type="button"
                  aria-pressed={priorities.includes(priority)}
                  onClick={() => setPriorities((current) => toggle(current, priority))}
                  className={chip(priorities.includes(priority))}
                >
                  {priorityLabels[priority]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-4">
            <legend className="text-xs font-bold">Prazo</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {(Object.keys(dueFilterLabels) as DueFilter[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={dueFilter === key}
                  onClick={() => setDueFilter(key)}
                  className={chip(dueFilter === key)}
                >
                  {dueFilterLabels[key]}
                </button>
              ))}
            </div>
            {dueFilter === "range" && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <label className="flex items-center gap-2">
                  De
                  <input
                    type="date"
                    value={dueFrom}
                    onChange={(event) => setDueFrom(event.target.value)}
                    className="rounded-lg border border-input bg-background px-2 py-1"
                  />
                </label>
                <label className="flex items-center gap-2">
                  até
                  <input
                    type="date"
                    value={dueTo}
                    onChange={(event) => setDueTo(event.target.value)}
                    className="rounded-lg border border-input bg-background px-2 py-1"
                  />
                </label>
              </div>
            )}
          </fieldset>

          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeSubtasks}
              onChange={(event) => setIncludeSubtasks(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Imprimir subtarefas
          </label>
        </div>
      </aside>

      <main className="mx-auto my-6 max-w-4xl bg-white px-8 py-8 text-[11pt] text-neutral-900 shadow-sm print:m-0 print:max-w-none print:p-0 print:shadow-none">
        {!department ? (
          <p className="text-sm text-neutral-600">
            Escolha um setor nos filtros acima para montar a folha de impressão.
          </p>
        ) : (
          <>
            <header className="border-b-2 border-neutral-900 pb-3">
              <p className="text-[9pt] font-semibold uppercase tracking-widest text-neutral-600">
                {data.company.name}
              </p>
              <h2 className="mt-1 text-[16pt] font-bold leading-tight">
                Tarefas do setor {department.name}
              </h2>
              <p className="mt-1 text-[9pt] text-neutral-600">
                Impresso em {printedAt} · {rows.length} {rows.length === 1 ? "tarefa" : "tarefas"}
                {filterSummary ? ` · ${filterSummary}` : ""}
              </p>
            </header>

            {rows.length === 0 ? (
              <p className="mt-6 text-sm text-neutral-600">Nenhuma tarefa com esses filtros.</p>
            ) : (
              <table className="mt-4 w-full border-collapse text-left text-[10pt]">
                <thead className="table-header-group">
                  <tr className="border-b border-neutral-400 text-[8.5pt] uppercase tracking-wide text-neutral-600">
                    <th className="w-6 py-1.5 pr-2" aria-label="Marcar" />
                    <th className="py-1.5 pr-3">Tarefa</th>
                    <th className="w-[22%] py-1.5 pr-3">Responsáveis</th>
                    <th className="w-[13%] py-1.5 pr-3">Prazo</th>
                    <th className="w-[10%] py-1.5 pr-3">Prioridade</th>
                    <th className="w-[13%] py-1.5">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((task) => {
                    const late = isOpen(task) && task.dueDate < today;
                    const names = responsibleIdsOf(task).map(
                      (id) => employeeNames.get(id) ?? "Colaborador removido",
                    );
                    const subtasks = includeSubtasks ? (task.subtasks ?? []) : [];
                    return (
                      <tr
                        key={task.id}
                        className="break-inside-avoid border-b border-neutral-200 align-top"
                      >
                        <td className="py-2 pr-2">
                          <span className="mt-0.5 inline-block h-3.5 w-3.5 border border-neutral-700" />
                        </td>
                        <td className="py-2 pr-3">
                          <p className="font-semibold">{task.title}</p>
                          {task.description.trim() && (
                            <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-[9pt] text-neutral-600">
                              {task.description.trim()}
                            </p>
                          )}
                          {subtasks.length > 0 && (
                            <ul className="mt-1 space-y-0.5 text-[9pt]">
                              {subtasks.map((subtask) => (
                                <li key={subtask.id} className="flex items-start gap-1.5">
                                  <span className="mt-0.5 shrink-0">
                                    {subtask.done ? "☑" : "☐"}
                                  </span>
                                  <span className={subtask.done ? "line-through" : undefined}>
                                    {subtask.title}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          {names.length
                            ? names.join(", ")
                            : unassignedResponsibleLabel("department")}
                        </td>
                        <td className="py-2 pr-3">
                          {formatDate(task.dueDate)}
                          {late && <span className="block text-[8pt] font-bold">ATRASADA</span>}
                        </td>
                        <td className="py-2 pr-3">{priorityLabels[task.priority]}</td>
                        <td className="py-2">{statusLabels[task.status]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </main>
    </div>
  );
}
