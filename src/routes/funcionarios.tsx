import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { ErrorState, LoadingState } from "@/components/data-state";
import { createEmployee } from "@/lib/api/pop-organize.functions";
import { useWorkspaceData, workspaceQueryKey } from "@/lib/api/use-workspace";
import { Plus, Mail } from "lucide-react";

export const Route = createFileRoute("/funcionarios")({
  head: () => ({ meta: [{ title: "Funcionários - Pop Organize" }] }),
  component: FuncionariosPage,
});

function FuncionariosPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useWorkspaceData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "",
    departmentId: "",
    status: "active" as "active" | "inactive",
    password: "demo1234",
  });

  const createMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      email: string;
      role: string;
      departmentId: string;
      status: "active" | "inactive";
      password?: string;
    }) => createEmployee({ data: payload }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
      setShowForm(false);
    },
  });

  if (isLoading) {
    return (
      <AppShell title="Funcionários" subtitle="Carregando colaboradores">
        <LoadingState />
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="Funcionários" subtitle="Colaboradores cadastrados">
        <ErrorState />
      </AppShell>
    );
  }

  const { employees, departments, tasks } = data;
  const getDepartment = (id: string) => departments.find((department) => department.id === id);
  const mutationError = createMutation.error instanceof Error ? createMutation.error.message : null;

  function openForm() {
    setForm({
      name: "",
      email: "",
      role: "",
      departmentId: departments[0]?.id ?? "",
      status: "active",
      password: "demo1234",
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
      title="Funcionários"
      subtitle={`${employees.length} colaboradores cadastrados`}
      actions={
        <button
          onClick={openForm}
          className="hidden md:inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-[var(--shadow-elegant)]"
        >
          <Plus className="h-4 w-4" /> Novo funcionário
        </button>
      }
    >
      <div className="bg-card border border-border rounded-2xl shadow-[var(--shadow-card)] overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="bg-muted/40 border-b border-border">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-3.5">Nome</th>
              <th className="px-6 py-3.5">Cargo</th>
              <th className="px-6 py-3.5">Setor</th>
              <th className="px-6 py-3.5">Tarefas</th>
              <th className="px-6 py-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {employees.map((e) => {
              const dept = getDepartment(e.departmentId);
              const count = tasks.filter((t) => t.responsibleId === e.id).length;
              return (
                <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-semibold text-primary-foreground"
                        style={{ background: "var(--gradient-primary)" }}
                      >
                        {e.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{e.name}</div>
                        <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {e.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{e.role}</td>
                  <td className="px-6 py-4">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                      style={{ background: dept?.color }}
                    >
                      {dept?.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">{count}</td>
                  <td className="px-6 py-4">
                    <span
                      className={
                        e.status === "active"
                          ? "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/15 text-success"
                          : "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground"
                      }
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />{" "}
                      {e.status === "active" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
            <h2 className="text-xl font-display font-bold mb-1">Novo funcionário</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Cadastre um colaborador para receber tarefas e participar de grupos.
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
              <Field label="E-mail">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm"
                  required
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Cargo">
                  <input
                    value={form.role}
                    onChange={(e) => setForm((current) => ({ ...current, role: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm"
                    required
                  />
                </Field>
                <Field label="Setor">
                  <select
                    value={form.departmentId}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, departmentId: e.target.value }))
                    }
                    className="w-full h-10 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm"
                  >
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </Field>
                <Field label="Senha inicial">
                  <input
                    value={form.password}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, password: e.target.value }))
                    }
                    className="w-full h-10 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm"
                    minLength={6}
                  />
                </Field>
              </div>
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
                {createMutation.isPending ? "Criando..." : "Criar funcionário"}
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
