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
import { createGroup } from "@/lib/api/pop-organize.functions";
import { useWorkspaceData, workspaceQueryKey } from "@/lib/api/use-workspace";
import type { PermissionKey } from "@/lib/domain";
import { hasPermission, isAdminUser, resolvePermissionSet } from "@/lib/permission-groups";
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
    onSuccess: () => {
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
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

  const { groups, employees, tasks, currentUser, permissionGroups } = data;
  const permissionSet = resolvePermissionSet({ currentUser, employees, permissionGroups });
  const canManageGroups =
    isAdminUser({ currentUser, employees }) ||
    (["manage.groups", "pages.employees", "pages.reports"] as PermissionKey[]).some((key) =>
      hasPermission(permissionSet, key),
    );
  const visibleGroups = canManageGroups
    ? groups
    : groups.filter(
        (group) => group.leaderId === currentUser.id || group.memberIds.includes(currentUser.id),
      );
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
        canManageGroups ? (
          <button
            onClick={openForm}
            style={{ background: "var(--gradient-primary)" }}
            className="hidden md:inline-flex items-center gap-2 px-4 h-9 rounded-xl text-primary-foreground text-sm font-medium transition hover:-translate-y-0.5 hover:opacity-90 shadow-[var(--shadow-elegant)]"
          >
            <Plus className="h-4 w-4" /> Novo grupo
          </button>
        ) : null
      }
    >
      {canManageGroups && (
        <button
          type="button"
          onClick={openForm}
          style={{ background: "var(--gradient-primary)" }}
          className="mb-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-primary-foreground shadow-[var(--shadow-elegant)] transition active:scale-[0.99] md:hidden"
        >
          <Plus className="h-4 w-4" /> Novo grupo
        </button>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {visibleGroups.map((g) => {
          const leader = getEmployee(g.leaderId);
          const members = g.memberIds.map(getEmployee).filter(Boolean);
          const gTasks = tasks.filter((t) => t.target.type === "group" && t.target.id === g.id);
          return (
            <div
              key={g.id}
              className="hover-lift rounded-2xl border border-border bg-card p-4 sm:p-5"
            >
              <div className="mb-3 flex items-start justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-base">{g.name}</h3>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                    {g.description}
                  </p>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary whitespace-nowrap">
                  {gTasks.length} {gTasks.length === 1 ? "tarefa" : "tarefas"}
                </span>
              </div>

              {canManageGroups ? (
                <div className="flex items-center gap-2 mt-4 p-2.5 rounded-md bg-accent/40">
                  <Crown className="h-4 w-4 text-warning-foreground" />
                  <span className="text-xs text-muted-foreground">Líder:</span>
                  <span className="text-sm font-medium">
                    {leader?.name ?? "Sem líder definido"}
                  </span>
                </div>
              ) : (
                <div className="mt-4 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Grupo em que você participa
                </div>
              )}

              {canManageGroups && (
                <div className="mt-4">
                  <div className="text-xs text-muted-foreground mb-2">
                    Membros ({members.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {members.map((m) => (
                      <div
                        key={m!.id}
                        className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-muted"
                      >
                        <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-primary-foreground bg-primary">
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
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Novo grupo</DialogTitle>
              <DialogDescription>
                Monte uma equipe flexível para campanhas, projetos ou plantões.
              </DialogDescription>
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
              <Field label="Descrição">
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 rounded-md bg-background border border-input outline-none focus:border-primary text-sm resize-none"
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
                  className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
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
                      className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
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
                disabled={createMutation.isPending}
                style={{ background: "var(--gradient-primary)" }}
                className="h-9 px-5 rounded-xl text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-60 shadow-[var(--shadow-elegant)]"
              >
                {createMutation.isPending ? "Criando..." : "Criar grupo"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
