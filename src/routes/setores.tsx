import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { ErrorState, LoadingState } from "@/components/data-state";
import { createDepartment } from "@/lib/api/pop-organize.functions";
import { useWorkspaceData, workspaceQueryKey } from "@/lib/api/use-workspace";
import { departmentColors } from "@/lib/domain";
import { Plus, Users, CheckSquare } from "lucide-react";

export const Route = createFileRoute("/setores")({
  head: () => ({ meta: [{ title: "Setores - Pop Organize" }] }),
  component: SetoresPage,
});

function SetoresPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useWorkspaceData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    managerId: "",
    color: departmentColors[0],
  });

  const createMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      description: string;
      managerId: string;
      color?: string;
    }) => createDepartment({ data: payload }),
    onSuccess: () => {
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  if (isLoading) {
    return (
      <AppShell title="Setores" subtitle="Carregando divisões da empresa">
        <LoadingState />
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="Setores" subtitle="Divisões fixas da empresa">
        <ErrorState />
      </AppShell>
    );
  }

  const { departments, employees, tasks } = data;
  const getEmployee = (id: string) => employees.find((employee) => employee.id === id);
  const mutationError = createMutation.error instanceof Error ? createMutation.error.message : null;

  function openForm() {
    setForm({
      name: "",
      description: "",
      managerId: employees[0]?.id ?? "",
      color: departmentColors[departments.length % departmentColors.length],
    });
    createMutation.reset();
    setShowForm(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createMutation.mutate(form);
  }

  return (
    <AppShell
      title="Setores"
      subtitle="Divisões fixas da empresa"
      actions={
        <button
          onClick={openForm}
          className="hidden md:inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-[var(--shadow-elegant)]"
        >
          <Plus className="h-4 w-4" /> Novo setor
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((d) => {
          const members = employees.filter((e) => e.departmentId === d.id);
          const dTasks = tasks.filter(
            (t) => t.target.type === "department" && t.target.id === d.id,
          );
          const manager = getEmployee(d.managerId);
          return (
            <div
              key={d.id}
              className="bg-card border border-border rounded-2xl p-6 shadow-[var(--shadow-card)] hover:shadow-md transition-shadow"
            >
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
                  {manager?.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
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
            <h2 className="text-xl font-display font-bold mb-1">Novo setor</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Crie uma divisão fixa para organizar equipe e tarefas.
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
              <Field label="Gestor">
                <select
                  value={form.managerId}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, managerId: e.target.value }))
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
              <Field label="Cor">
                <div className="flex flex-wrap gap-2">
                  {departmentColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, color }))}
                      className="h-8 w-8 rounded-full border-2"
                      style={{
                        background: color,
                        borderColor: form.color === color ? "currentColor" : "transparent",
                      }}
                      aria-label={`Selecionar cor ${color}`}
                    />
                  ))}
                </div>
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
                disabled={createMutation.isPending}
                className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-[var(--shadow-elegant)] disabled:opacity-60"
              >
                {createMutation.isPending ? "Criando..." : "Criar setor"}
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
