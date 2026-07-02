import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, StatusBadge, PriorityBadge } from "@/components/app-shell";
import { ErrorState, LoadingState } from "@/components/data-state";
import { useWorkspaceData } from "@/lib/api/use-workspace";
import { statusLabels } from "@/lib/domain";
import { Plus, TrendingUp, Clock, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard - Pop Organize" },
      {
        name: "description",
        content: "Visão geral de tarefas, setores e produtividade da empresa.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading, error } = useWorkspaceData();

  if (isLoading) {
    return (
      <AppShell title="Dashboard" subtitle="Carregando visão geral da empresa">
        <LoadingState />
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="Dashboard" subtitle="Visão geral da empresa">
        <ErrorState />
      </AppShell>
    );
  }

  const { tasks, departments, employees, groups, currentUser } = data;
  const getEmployee = (id: string) => employees.find((employee) => employee.id === id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const pending = tasks.filter((t) => t.status === "pending" || t.status === "in_progress").length;
  const review = tasks.filter((t) => t.status === "waiting_review").length;
  const overdue = tasks.filter(
    (t) => new Date(`${t.dueDate}T00:00:00`) < today && t.status !== "completed",
  ).length;

  const stats = [
    {
      label: "Total de tarefas",
      value: total,
      icon: TrendingUp,
      accent: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Concluídas",
      value: completed,
      icon: CheckCircle2,
      accent: "text-success",
      bg: "bg-success/15",
    },
    {
      label: "Em andamento",
      value: pending,
      icon: Clock,
      accent: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Atrasadas",
      value: overdue,
      icon: AlertTriangle,
      accent: "text-destructive",
      bg: "bg-destructive/10",
    },
  ];

  const byDept = departments.map((d) => {
    const dt = tasks.filter((t) => t.target.type === "department" && t.target.id === d.id);
    return {
      ...d,
      total: dt.length,
      done: dt.filter((t) => t.status === "completed").length,
    };
  });

  const recent = tasks.slice(0, 5);

  return (
    <AppShell
      title={`Bom dia, ${currentUser.name.split(" ")[0]}`}
      subtitle="Aqui está o que está acontecendo na sua empresa hoje."
      actions={
        <Link
          to="/tarefas"
          style={{ background: "var(--gradient-primary)" }}
          className="hidden md:inline-flex items-center gap-2 px-4 h-9 rounded-xl text-primary-foreground text-sm font-medium transition hover:-translate-y-0.5 hover:opacity-90 shadow-[var(--shadow-elegant)]"
        >
          <Plus className="h-4 w-4" /> Nova tarefa
        </Link>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="hover-lift bg-card border border-border rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                  <div className="text-2xl font-display font-bold text-foreground mt-2">
                    {s.value}
                  </div>
                </div>
                <div className={`h-9 w-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <Icon className={`h-4.5 w-4.5 ${s.accent}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent tasks */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-display font-semibold">Tarefas recentes</h2>
              <p className="text-sm text-muted-foreground">Atualizadas nas últimas horas</p>
            </div>
            <Link
              to="/tarefas"
              className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recent.map((t) => {
              const emp = getEmployee(t.responsibleId);
              return (
                <div
                  key={t.id}
                  className="py-3 flex items-center gap-3 hover:bg-muted/40 -mx-2 px-2 rounded-md transition-colors"
                >
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center text-primary-foreground font-semibold text-xs shrink-0"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    {emp?.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {emp?.name} • {t.target.label}
                    </div>
                  </div>
                  <PriorityBadge priority={t.priority} />
                  <div className="hidden sm:block">
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-5">
          <div className="hover-lift bg-card border border-border rounded-2xl p-5">
            <h2 className="text-base font-display font-semibold mb-1">Tarefas por setor</h2>
            <p className="text-sm text-muted-foreground mb-4">Distribuição atual</p>
            <div className="space-y-3.5">
              {byDept.map((d) => {
                const pct = d.total ? Math.round((d.done / d.total) * 100) : 0;
                return (
                  <div key={d.id}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium">{d.name}</span>
                      <span className="text-muted-foreground">
                        {d.done}/{d.total}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: d.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="hover-lift rounded-2xl p-5 text-primary-foreground shadow-[var(--shadow-elegant)]"
            style={{ background: "var(--gradient-hero)" }}
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/75">
              Aguardando revisão
            </div>
            <div className="text-3xl font-display font-bold mt-2">{review}</div>
            <p className="text-sm text-primary-foreground/80 mt-1">
              Tarefas precisam da sua atenção
            </p>
            <Link
              to="/tarefas"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium bg-white/15 hover:bg-white/25 transition-colors px-3 py-1.5 rounded-xl"
            >
              Revisar agora <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="hover-lift bg-card border border-border rounded-2xl p-5">
            <h2 className="text-base font-display font-semibold mb-1">Equipe</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {employees.length} funcionários • {groups.length} grupos
            </p>
            <div className="flex -space-x-2">
              {employees.slice(0, 6).map((e) => (
                <div
                  key={e.id}
                  className="h-8 w-8 rounded-full ring-2 ring-card flex items-center justify-center text-[11px] font-semibold text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                  title={e.name}
                >
                  {e.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
              ))}
              <div className="h-8 w-8 rounded-full ring-2 ring-card bg-muted text-muted-foreground flex items-center justify-center text-[11px] font-semibold">
                +{employees.length - 6}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status legend at bottom */}
      <div className="hover-lift mt-5 bg-card border border-border rounded-2xl p-5">
        <h2 className="text-base font-display font-semibold mb-4">Distribuição por status</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {(Object.keys(statusLabels) as Array<keyof typeof statusLabels>).map((k) => {
            const count = tasks.filter((t) => t.status === k).length;
            return (
              <div key={k} className="p-3 rounded-xl bg-muted/40 border border-border">
                <div className="text-xs text-muted-foreground">{statusLabels[k]}</div>
                <div className="text-xl font-display font-bold mt-1">{count}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
