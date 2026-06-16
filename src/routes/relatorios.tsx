import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { tasks, departments, employees } from "@/lib/mock-data";
import { TrendingUp, Award, Clock } from "lucide-react";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Pop Organize" }] }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const byDept = departments.map((d) => {
    const dt = tasks.filter((t) => t.target.type === "department" && t.target.id === d.id);
    return {
      ...d,
      total: dt.length,
      done: dt.filter((t) => t.status === "completed").length,
      late: dt.filter((t) => new Date(t.dueDate) < new Date("2026-06-16") && t.status !== "completed").length,
    };
  });

  const ranking = employees
    .map((e) => ({ ...e, done: tasks.filter((t) => t.responsibleId === e.id && t.status === "completed").length, total: tasks.filter((t) => t.responsibleId === e.id).length }))
    .sort((a, b) => b.done - a.done)
    .slice(0, 5);

  return (
    <AppShell title="Relatórios" subtitle="Indicadores de produtividade da empresa">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="font-display font-bold text-lg">Tarefas por setor</h2>
          </div>
          <div className="space-y-5">
            {byDept.map((d) => {
              const pct = d.total ? (d.done / d.total) * 100 : 0;
              return (
                <div key={d.id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{d.name}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-success">{d.done} concluídas</span>
                      {d.late > 0 && <span className="text-destructive">{d.late} atrasadas</span>}
                      <span className="text-muted-foreground">{d.total} total</span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: d.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 mb-5">
            <Award className="h-5 w-5 text-primary" />
            <h2 className="font-display font-bold text-lg">Top produtividade</h2>
          </div>
          <div className="space-y-3">
            {ranking.map((e, i) => (
              <div key={e.id} className="flex items-center gap-3">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground"}`}>
                  {i + 1}
                </div>
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center text-[11px] font-semibold text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {e.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{e.name}</div>
                  <div className="text-xs text-muted-foreground">{e.role}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-success">{e.done}</div>
                  <div className="text-[10px] text-muted-foreground">de {e.total}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="lg:col-span-3 rounded-2xl p-6 text-primary-foreground shadow-[var(--shadow-elegant)] flex items-center justify-between flex-wrap gap-4"
          style={{ background: "var(--gradient-primary)" }}
        >
          <div className="flex items-center gap-4">
            <Clock className="h-10 w-10 opacity-80" />
            <div>
              <div className="text-sm opacity-90">Tempo médio de conclusão</div>
              <div className="text-3xl font-display font-bold">3,2 dias</div>
            </div>
          </div>
          <div className="text-sm opacity-90 max-w-md">
            A equipe está concluindo tarefas 12% mais rápido que o mês anterior. Continue assim!
          </div>
        </div>
      </div>
    </AppShell>
  );
}
