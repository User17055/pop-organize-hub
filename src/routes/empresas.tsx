import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { ErrorState, LoadingState } from "@/components/data-state";
import { updateCompany } from "@/lib/api/pop-organize.functions";
import { useWorkspaceData, workspaceQueryKey } from "@/lib/api/use-workspace";
import { Building2, Pencil, Users, Layers, FolderKanban, CheckSquare } from "lucide-react";

export const Route = createFileRoute("/empresas")({
  head: () => ({ meta: [{ title: "Empresas - Pop Organize" }] }),
  component: EmpresasPage,
});

function EmpresasPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useWorkspaceData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    document: "",
    status: "active" as "active" | "inactive",
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { name: string; document: string; status: "active" | "inactive" }) =>
      updateCompany({ data: payload }),
    onSuccess: () => {
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  if (isLoading) {
    return (
      <AppShell title="Empresas" subtitle="Carregando cadastro da empresa">
        <LoadingState />
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="Empresas" subtitle="Gerencie as empresas da plataforma">
        <ErrorState />
      </AppShell>
    );
  }

  const { company, employees, departments, groups, tasks } = data;
  const stats = [
    { label: "Funcionários", value: employees.length, icon: Users },
    { label: "Setores", value: departments.length, icon: Layers },
    { label: "Grupos", value: groups.length, icon: FolderKanban },
    { label: "Tarefas", value: tasks.length, icon: CheckSquare },
  ];
  const mutationError = updateMutation.error instanceof Error ? updateMutation.error.message : null;

  function openForm() {
    setForm({
      name: company.name,
      document: company.document,
      status: company.status,
    });
    updateMutation.reset();
    setShowForm(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    updateMutation.mutate(form);
  }

  return (
    <AppShell
      title="Empresas"
      subtitle="Gerencie a empresa da plataforma"
      actions={
        <button
          onClick={openForm}
          className="hidden md:inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-[var(--shadow-elegant)]"
        >
          <Pencil className="h-4 w-4" /> Editar empresa
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
            <span
              className={
                company.status === "active"
                  ? "inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-success/15 text-success"
                  : "inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground"
              }
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />{" "}
              {company.status === "active" ? "Ativa" : "Inativa"}
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

      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <form
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2 className="text-xl font-display font-bold mb-1">Editar empresa</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Atualize os dados usados em toda a organização.
            </p>
            <div className="space-y-3.5">
              <Field label="Nome">
                <input
                  value={form.name}
                  onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm"
                  required
                />
              </Field>
              <Field label="CNPJ">
                <input
                  value={form.document}
                  onChange={(e) => setForm((current) => ({ ...current, document: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm"
                  required
                />
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      status: e.target.value as "active" | "inactive",
                    }))
                  }
                  className="w-full h-10 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm"
                >
                  <option value="active">Ativa</option>
                  <option value="inactive">Inativa</option>
                </select>
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
                disabled={updateMutation.isPending}
                className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-[var(--shadow-elegant)] disabled:opacity-60"
              >
                {updateMutation.isPending ? "Salvando..." : "Salvar empresa"}
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
