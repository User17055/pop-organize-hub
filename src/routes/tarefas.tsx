import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, StatusBadge, PriorityBadge } from "@/components/app-shell";
import { tasks as initialTasks, getEmployee, statusLabels, priorityLabels, type TaskStatus } from "@/lib/mock-data";
import { Plus, Filter, Search, Calendar, MessageSquare, Paperclip, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tarefas")({
  head: () => ({
    meta: [
      { title: "Tarefas — Pop Organize" },
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

function TasksPage() {
  const [active, setActive] = useState<TaskStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const list = useMemo(
    () =>
      initialTasks.filter(
        (t) =>
          (active === "all" || t.status === active) &&
          (search === "" || t.title.toLowerCase().includes(search.toLowerCase()))
      ),
    [active, search]
  );

  return (
    <AppShell
      title="Tarefas"
      subtitle="Acompanhe e organize todas as demandas da empresa"
      actions={
        <button
          onClick={() => setShowForm(true)}
          className="hidden md:inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-[var(--shadow-elegant)]"
        >
          <Plus className="h-4 w-4" /> Nova tarefa
        </button>
      }
    >
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex-1 min-w-[240px] flex items-center gap-2 px-3 h-10 rounded-lg bg-card border border-border focus-within:border-primary/40 transition-colors">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        <button className="h-10 px-3 rounded-lg bg-card border border-border text-sm font-medium inline-flex items-center gap-2 hover:bg-muted transition-colors">
          <Filter className="h-4 w-4" /> Filtros
        </button>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {filters.map((f) => {
          const count = f.key === "all" ? initialTasks.length : initialTasks.filter((t) => t.status === f.key).length;
          const isActive = active === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setActive(f.key)}
              className={cn(
                "px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap transition-all inline-flex items-center gap-2",
                isActive
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]"
                  : "bg-card border border-border text-foreground/70 hover:border-primary/40"
              )}
            >
              {f.label}
              <span className={cn("text-[11px] px-1.5 rounded-full", isActive ? "bg-white/20" : "bg-muted")}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.map((t) => {
          const emp = getEmployee(t.responsibleId);
          const reviewer = t.reviewerId ? getEmployee(t.reviewerId) : null;
          return (
            <div
              key={t.id}
              className="group bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-card)] hover:shadow-md hover:border-primary/40 transition-all cursor-pointer"
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
                  <span key={tag} className="text-[11px] px-2 py-0.5 rounded-md bg-accent text-accent-foreground font-medium">
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
                    {emp?.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{emp?.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{t.target.label}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground text-xs">
                  {t.comments > 0 && (
                    <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{t.comments}</span>
                  )}
                  {t.attachments > 0 && (
                    <span className="inline-flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" />{t.attachments}</span>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(t.dueDate).toLocaleDateString("pt-BR")}
                </span>
                {reviewer && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <UserCircle2 className="h-3.5 w-3.5" /> Revisor: {reviewer.name.split(" ")[0]}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {list.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          Nenhuma tarefa encontrada.
        </div>
      )}

      {/* New Task Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-display font-bold mb-1">Nova tarefa</h2>
            <p className="text-sm text-muted-foreground mb-5">Preencha os dados abaixo para criar uma nova tarefa.</p>
            <div className="space-y-3.5">
              <Field label="Título">
                <input className="w-full h-10 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm" placeholder="Ex: Criar campanha..." />
              </Field>
              <Field label="Descrição">
                <textarea rows={3} className="w-full px-3 py-2 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm resize-none" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prioridade">
                  <select className="w-full h-10 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm">
                    {Object.entries(priorityLabels).map(([k, v]) => <option key={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Prazo">
                  <input type="date" className="w-full h-10 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm" />
                </Field>
              </div>
              <Field label="Destino">
                <select className="w-full h-10 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm">
                  <option>Empresa inteira</option>
                  <option>Setor: Marketing</option>
                  <option>Grupo: Campanha Junho Violeta</option>
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="h-10 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-[var(--shadow-elegant)]"
              >
                Criar tarefa
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground/70 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
