import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { groups, getEmployee, tasks } from "@/lib/mock-data";
import { Plus, Crown } from "lucide-react";

export const Route = createFileRoute("/grupos")({
  head: () => ({ meta: [{ title: "Grupos — Pop Organize" }] }),
  component: GruposPage,
});

function GruposPage() {
  return (
    <AppShell
      title="Grupos"
      subtitle="Equipes flexíveis para projetos e campanhas"
      actions={
        <button className="hidden md:inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-[var(--shadow-elegant)]">
          <Plus className="h-4 w-4" /> Novo grupo
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((g) => {
          const leader = getEmployee(g.leaderId);
          const members = g.memberIds.map(getEmployee).filter(Boolean);
          const gTasks = tasks.filter((t) => t.target.type === "group" && t.target.id === g.id);
          return (
            <div key={g.id} className="bg-card border border-border rounded-2xl p-6 shadow-[var(--shadow-card)] hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-display font-bold text-lg">{g.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{g.description}</p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {gTasks.length} {gTasks.length === 1 ? "tarefa" : "tarefas"}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-accent/40">
                <Crown className="h-4 w-4 text-warning-foreground" />
                <span className="text-xs text-muted-foreground">Líder:</span>
                <span className="text-sm font-medium">{leader?.name}</span>
              </div>

              <div className="mt-4">
                <div className="text-xs text-muted-foreground mb-2">Membros ({members.length})</div>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => (
                    <div key={m!.id} className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-muted">
                      <div
                        className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-primary-foreground"
                        style={{ background: "var(--gradient-primary)" }}
                      >
                        {m!.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </div>
                      <span className="text-xs font-medium">{m!.name.split(" ")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
