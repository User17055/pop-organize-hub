import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { ErrorState, LoadingState } from "@/components/data-state";
import { createGroup } from "@/lib/api/pop-organize.functions";
import { useWorkspaceData, workspaceQueryKey } from "@/lib/api/use-workspace";
import { Plus, Crown } from "lucide-react";

export const Route = createFileRoute("/grupos")({
  head: () => ({ meta: [{ title: "Grupos - Pop Organize" }] }),
  component: GruposPage,
});

function GruposPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useWorkspaceData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    leaderId: "",
    memberIds: [] as string[],
  });

  const createMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      description: string;
      leaderId?: string;
      memberIds: string[];
    }) => createGroup({ data: payload }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
      setShowForm(false);
    },
  });

  if (isLoading) {
    return (
      <AppShell title="Grupos" subtitle="Carregando equipes flexíveis">
        <LoadingState />
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="Grupos" subtitle="Equipes flexíveis para projetos e campanhas">
        <ErrorState />
      </AppShell>
    );
  }

  const { groups, employees, tasks } = data;
  const getEmployee = (id?: string) => employees.find((employee) => employee.id === id);
  const mutationError = createMutation.error instanceof Error ? createMutation.error.message : null;

  function openForm() {
    setForm({
      name: "",
      description: "",
      leaderId: "",
      memberIds: [],
    });
    createMutation.reset();
    setShowForm(true);
  }

  function toggleMember(memberId: string) {
    setForm((current) => ({
      ...current,
      memberIds: current.memberIds.includes(memberId)
        ? current.memberIds.filter((id) => id !== memberId)
        : [...current.memberIds, memberId],
    }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createMutation.mutate(form);
  }

  return (
    <AppShell
      title="Grupos"
      subtitle="Equipes flexíveis para projetos e campanhas"
      actions={
        <button
          onClick={openForm}
          className="hidden md:inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition shadow-[var(--shadow-elegant)]"
        >
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
            <div
              key={g.id}
              className="bg-card border border-border rounded-2xl p-6 shadow-[var(--shadow-card)] hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3 gap-4">
                <div>
                  <h3 className="font-display font-bold text-lg">{g.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{g.description}</p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary whitespace-nowrap">
                  {gTasks.length} {gTasks.length === 1 ? "tarefa" : "tarefas"}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-accent/40">
                <Crown className="h-4 w-4 text-warning-foreground" />
                <span className="text-xs text-muted-foreground">Líder:</span>
                <span className="text-sm font-medium">{leader?.name ?? "Sem líder definido"}</span>
              </div>

              <div className="mt-4">
                <div className="text-xs text-muted-foreground mb-2">Membros ({members.length})</div>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => (
                    <div
                      key={m!.id}
                      className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-muted"
                    >
                      <div
                        className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-primary-foreground"
                        style={{ background: "var(--gradient-primary)" }}
                      >
                        {m!.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
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

      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowForm(false)}
        >
          <form
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <h2 className="text-xl font-display font-bold mb-1">Novo grupo</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Monte uma equipe flexível para campanhas, projetos ou plantões.
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
              <Field label="Líder">
                <select
                  value={form.leaderId}
                  onChange={(e) => {
                    const leaderId = e.target.value;
                    setForm((current) => ({
                      ...current,
                      leaderId,
                      memberIds:
                        leaderId && current.memberIds.includes(leaderId)
                          ? current.memberIds
                          : leaderId
                            ? [...current.memberIds, leaderId]
                            : current.memberIds,
                    }));
                  }}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-input outline-none focus:border-primary text-sm"
                >
                  <option value="">Sem líder</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Membros">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {employees.map((employee) => (
                    <label
                      key={employee.id}
                      className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.memberIds.includes(employee.id)}
                        onChange={() => toggleMember(employee.id)}
                        className="rounded border-input accent-primary"
                      />
                      <span>{employee.name}</span>
                    </label>
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
                {createMutation.isPending ? "Criando..." : "Criar grupo"}
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
