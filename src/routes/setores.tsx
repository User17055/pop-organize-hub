import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { departments, employees, tasks, getEmployee } from "@/lib/mock-data";
import { Plus, Users, CheckSquare } from "lucide-react";

export const Route = createFileRoute("/setores")({
  head: () => ({ meta: [{ title: "Setores — Pop Organize" }] }),
  component: SetoresPage,
});

function SetoresPage() {
  return (
    <AppShell
      title="Setores"
      subtitle="Divisões fixas da empresa"
      actions={
        <button className="hidden md:inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-[var(--shadow-elegant)]">
          <Plus className="h-4 w-4" /> Novo setor
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((d) => {
          const members = employees.filter((e) => e.departmentId === d.id);
          const dTasks = tasks.filter((t) => t.target.type === "department" && t.target.id === d.id);
          const manager = getEmployee(d.managerId);
          return (
            <div key={d.id} className="bg-card border border-border rounded-2xl p-6 shadow-[var(--shadow-card)] hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-display font-bold text-lg"
                  style={{ background: d.color }}
                >
                  {d.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-lg">{d.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{d.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-muted/50">
                  <Users className="h-4 w-4 text-primary mb-1" />
                  <div className="text-xl font-bold">{members.length}</div>
                  <div className="text-xs text-muted-foreground">Funcionários</div>
                </div>
                <div className="p-3 rounded-xl bg-muted/50">
                  <CheckSquare className="h-4 w-4 text-primary mb-1" />
                  <div className="text-xl font-bold">{dTasks.length}</div>
                  <div className="text-xs text-muted-foreground">Tarefas</div>
                </div>
              </div>
              <div className="pt-4 border-t border-border flex items-center gap-2">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {manager?.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Gestor</div>
                  <div className="text-sm font-medium truncate">{manager?.name}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
