import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { company, employees, departments, groups, tasks } from "@/lib/mock-data";
import { Building2, Plus, Users, Layers, FolderKanban, CheckSquare } from "lucide-react";

export const Route = createFileRoute("/empresas")({
  head: () => ({ meta: [{ title: "Empresas — Pop Organize" }] }),
  component: EmpresasPage,
});

function EmpresasPage() {
  const stats = [
    { label: "Funcionários", value: employees.length, icon: Users },
    { label: "Setores", value: departments.length, icon: Layers },
    { label: "Grupos", value: groups.length, icon: FolderKanban },
    { label: "Tarefas", value: tasks.length, icon: CheckSquare },
  ];
  return (
    <AppShell
      title="Empresas"
      subtitle="Gerencie as empresas da plataforma"
      actions={
        <button className="hidden md:inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-[var(--shadow-elegant)]">
          <Plus className="h-4 w-4" /> Nova empresa
        </button>
      }
    >
      <div className="bg-card border border-border rounded-2xl p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-5">
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-[var(--shadow-elegant)]"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-display font-bold">{company.name}</h2>
            <p className="text-sm text-muted-foreground">CNPJ: {company.document}</p>
            <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-success/15 text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-current" /> Ativa
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="p-4 rounded-xl bg-muted/50 border border-border">
                <Icon className="h-5 w-5 text-primary mb-2" />
                <div className="text-2xl font-display font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
