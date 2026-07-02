import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { ErrorState, LoadingState } from "@/components/data-state";
import { Field } from "@/components/form-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
          className="hidden md:inline-flex items-center gap-2 px-4 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
        >
          <Pencil className="h-4 w-4" /> Editar empresa
        </button>
      }
    >
      <div className="bg-card border border-border rounded-md p-5">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-md flex items-center justify-center bg-primary/10 border border-primary/20 shrink-0">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-display font-semibold">{company.name}</h2>
            <p className="text-sm text-muted-foreground">CNPJ: {company.document}</p>
            <span
              className={
                company.status === "active"
                  ? "inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-md text-xs font-medium bg-success/15 text-success"
                  : "inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground"
              }
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />{" "}
              {company.status === "active" ? "Ativa" : "Inativa"}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="p-3.5 rounded-md bg-muted/50 border border-border">
                <Icon className="h-4.5 w-4.5 text-primary mb-2" />
                <div className="text-xl font-display font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Editar empresa</DialogTitle>
              <DialogDescription>Atualize os dados usados em toda a organização.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3.5 mt-4">
              <Field label="Nome">
                <input
                  value={form.name}
                  onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                  className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
                  required
                />
              </Field>
              <Field label="CNPJ">
                <input
                  value={form.document}
                  onChange={(e) => setForm((current) => ({ ...current, document: e.target.value }))}
                  className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
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
                  className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
                >
                  <option value="active">Ativa</option>
                  <option value="inactive">Inativa</option>
                </select>
              </Field>
              {mutationError && <div className="text-sm text-destructive">{mutationError}</div>}
            </div>
            <DialogFooter className="mt-6">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="h-9 px-4 rounded-md border border-border text-sm font-medium hover:bg-muted transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="h-9 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-60"
              >
                {updateMutation.isPending ? "Salvando..." : "Salvar empresa"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
