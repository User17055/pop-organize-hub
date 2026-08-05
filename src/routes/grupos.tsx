import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { ErrorState, LoadingState } from "@/components/data-state";
import { AccessRestricted } from "@/components/access-restricted";
import { Field } from "@/components/form-field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { GlassSelect } from "@/components/tasks/recurrence-fields";
import { createGroup, deleteGroup, updateGroup } from "@/lib/api/pop-organize.functions";
import { useWorkspaceData, workspaceQueryKey } from "@/lib/api/use-workspace";
import type { PermissionKey } from "@/lib/domain";
import { hasPermission, isAdminUser, resolvePermissionSet } from "@/lib/permission-groups";
import { Check, Crown, Pencil, Plus, Trash2, Users } from "lucide-react";

export const Route = createFileRoute("/grupos")({
  head: () => ({ meta: [{ title: "Grupos - Pop Organize" }] }),
  component: GruposPage,
});

function GruposPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useWorkspaceData();
  const [showForm, setShowForm] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState("");
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
  const updateMutation = useMutation({
    mutationFn: (payload: typeof form & { id: string }) => updateGroup({ data: payload }),
    onSuccess: () => {
      setShowForm(false);
      setEditingGroupId("");
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGroup({ data: { id } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: workspaceQueryKey }),
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
  if (!hasPermission(permissionSet, "pages.groups")) {
    return (
      <AppShell title="Grupos" subtitle="Equipes flexíveis para projetos e campanhas">
        <AccessRestricted requiredLabel="quem pode visualizar grupos" />
      </AppShell>
    );
  }
  const canManageGroups =
    isAdminUser({ currentUser, employees }) ||
    (["manage.groups", "pages.employees", "pages.reports"] as PermissionKey[]).some((key) =>
      hasPermission(permissionSet, key),
    );
  const canCreateGroups = hasPermission(permissionSet, "manage.groups");
  const canEditGroups = hasPermission(permissionSet, "manage.groups.edit");
  const canDeleteGroups = hasPermission(permissionSet, "manage.groups.delete");
  const visibleGroups = canManageGroups
    ? groups
    : groups.filter(
        (group) => group.leaderId === currentUser.id || group.memberIds.includes(currentUser.id),
      );
  const getEmployee = (id?: string) => employees.find((employee) => employee.id === id);
  const mutationError =
    createMutation.error instanceof Error
      ? createMutation.error.message
      : updateMutation.error instanceof Error
        ? updateMutation.error.message
        : deleteMutation.error instanceof Error
          ? deleteMutation.error.message
          : null;

  function openForm() {
    setForm({
      name: "",
      description: "",
      leaderId: "",
      memberIds: [],
    });
    setEditingGroupId("");
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
    if (editingGroupId) updateMutation.mutate({ ...form, id: editingGroupId });
    else createMutation.mutate(form);
  }

  function openEdit(group: (typeof groups)[number]) {
    setEditingGroupId(group.id);
    setForm({
      name: group.name,
      description: group.description,
      leaderId: group.leaderId ?? "",
      memberIds: [...group.memberIds],
    });
    setShowForm(true);
  }

  function removeGroup(group: (typeof groups)[number]) {
    if (window.confirm(`Excluir o grupo ${group.name}?`)) deleteMutation.mutate(group.id);
  }

  return (
    <AppShell
      title="Grupos"
      subtitle="Equipes flexíveis para projetos e campanhas"
      actions={
        canCreateGroups ? (
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
      {canCreateGroups && (
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
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary whitespace-nowrap">
                    {gTasks.length} {gTasks.length === 1 ? "tarefa" : "tarefas"}
                  </span>
                  {canEditGroups && (
                    <button
                      type="button"
                      onClick={() => openEdit(g)}
                      className="glass-icon-button inline-flex h-8 w-8 items-center justify-center rounded-lg"
                      aria-label={`Editar ${g.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canDeleteGroups && (
                    <button
                      type="button"
                      onClick={() => removeGroup(g)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
                      aria-label={`Excluir ${g.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
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

      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent
          side="left"
          className="w-full gap-0 overflow-hidden border-r border-primary/15 bg-card p-0 shadow-[24px_0_60px_-32px_rgba(15,92,190,0.45)] sm:max-w-[460px]"
        >
          <form onSubmit={handleSubmit} className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto]">
            <SheetHeader className="border-b border-border/70 bg-primary/[0.035] px-5 pb-5 pt-6 text-left sm:px-6">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <SheetTitle className="font-display text-2xl font-bold">
                {editingGroupId ? "Editar grupo" : "Criar novo grupo"}
              </SheetTitle>
              <SheetDescription className="max-w-sm leading-relaxed">
                Monte uma equipe flexível para campanhas, projetos ou plantões.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              <Field label="Nome">
                <input
                  value={form.name}
                  onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                  className="task-create-input h-11 w-full rounded-xl border px-3.5 text-sm outline-none transition"
                  placeholder="Ex: Equipe de marketing"
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
                  className="task-create-input min-h-28 w-full resize-none rounded-xl border px-3.5 py-3 text-sm leading-relaxed outline-none transition"
                  placeholder="Qual é o objetivo deste grupo?"
                  required
                />
              </Field>
              <Field label="Líder">
                <GlassSelect
                  value={form.leaderId}
                  options={[
                    { value: "", label: "Sem líder definido" },
                    ...employees.map((employee) => ({
                      value: employee.id,
                      label: employee.name,
                    })),
                  ]}
                  onChange={(leaderId) => {
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
                />
              </Field>
              <Field label="Membros">
                <div className="space-y-2">
                  {employees.map((employee) => (
                    <button
                      type="button"
                      key={employee.id}
                      onClick={() => toggleMember(employee.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                        form.memberIds.includes(employee.id)
                          ? "border-primary/35 bg-primary/[0.065]"
                          : "border-border bg-background hover:border-primary/25 hover:bg-muted/50"
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {employee.name
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{employee.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {employee.role}
                        </span>
                      </span>
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${
                          form.memberIds.includes(employee.id)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background"
                        }`}
                      >
                        {form.memberIds.includes(employee.id) && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  ))}
                </div>
              </Field>
              {mutationError && <div className="text-sm text-destructive">{mutationError}</div>}
            </div>
            <SheetFooter className="border-t border-border/70 bg-card/95 px-5 py-4 backdrop-blur sm:px-6">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="h-11 rounded-xl border border-border px-5 text-sm font-semibold transition hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                style={{ background: "var(--gradient-primary)" }}
                className="h-11 flex-1 rounded-xl px-5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition hover:opacity-90 disabled:opacity-60 sm:flex-none"
              >
                {updateMutation.isPending
                  ? "Salvando..."
                  : editingGroupId
                    ? "Salvar alterações"
                    : createMutation.isPending
                      ? "Criando..."
                      : "Criar grupo"}
              </button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
