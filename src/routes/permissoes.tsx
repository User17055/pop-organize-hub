import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Lock, Pencil, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AccessRestricted } from "@/components/access-restricted";
import { ErrorState, LoadingState } from "@/components/data-state";
import { Field } from "@/components/form-field";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  createPermissionGroup,
  deletePermissionGroup,
  updatePermissionGroup,
} from "@/lib/api/pop-organize.functions";
import { useWorkspaceData, workspaceQueryKey } from "@/lib/api/use-workspace";
import {
  adminOnlyPermissionKeys,
  permissionCatalog,
  type PermissionGroup,
  type PermissionKey,
} from "@/lib/domain";
import { hasPermission, resolvePermissionSet } from "@/lib/permission-groups";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/permissoes")({
  head: () => ({ meta: [{ title: "Permissões - Pop Organize" }] }),
  component: PermissoesPage,
});

type GroupFormState = {
  id: string | null;
  name: string;
  description: string;
  permissions: PermissionKey[];
  memberIds: string[];
  isSystem: boolean;
};

const emptyForm: GroupFormState = {
  id: null,
  name: "",
  description: "",
  permissions: [],
  memberIds: [],
  isSystem: false,
};

function PermissoesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useWorkspaceData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<GroupFormState>(emptyForm);

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });

  const createMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      description: string;
      permissions: PermissionKey[];
      memberIds: string[];
    }) => createPermissionGroup({ data: payload }),
    onSuccess: () => {
      setShowForm(false);
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      name: string;
      description: string;
      permissions: PermissionKey[];
      memberIds: string[];
    }) => updatePermissionGroup({ data: payload }),
    onSuccess: () => {
      setShowForm(false);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: { id: string }) => deletePermissionGroup({ data: payload }),
    onSuccess: invalidate,
  });

  if (isLoading) {
    return (
      <AppShell title="Permissões" subtitle="Carregando grupos de permissão">
        <LoadingState />
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="Permissões" subtitle="Grupos de permissão da empresa">
        <ErrorState />
      </AppShell>
    );
  }

  const { permissionGroups, employees, currentUser } = data;
  const permissionSet = resolvePermissionSet({ currentUser, employees, permissionGroups });

  if (!hasPermission(permissionSet, "manage.permissions")) {
    return (
      <AppShell title="Permissões" subtitle="Grupos de permissão da empresa">
        <AccessRestricted requiredLabel="quem pode gerenciar permissões" />
      </AppShell>
    );
  }

  const mutationError =
    createMutation.error instanceof Error
      ? createMutation.error.message
      : updateMutation.error instanceof Error
        ? updateMutation.error.message
        : null;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  function openCreate() {
    setForm(emptyForm);
    createMutation.reset();
    updateMutation.reset();
    setShowForm(true);
  }

  function openEdit(group: PermissionGroup) {
    setForm({
      id: group.id,
      name: group.name,
      description: group.description,
      permissions: [...group.permissions],
      memberIds: employees
        .filter((employee) => employee.permissionGroupId === group.id)
        .map((employee) => employee.id),
      isSystem: Boolean(group.isSystem),
    });
    createMutation.reset();
    updateMutation.reset();
    setShowForm(true);
  }

  function handleDelete(group: PermissionGroup) {
    const confirmed = window.confirm(
      `Excluir o grupo "${group.name}"? Os membros ficarão sem grupo (acesso padrão).`,
    );
    if (!confirmed) return;
    deleteMutation.mutate({ id: group.id });
  }

  function togglePermission(key: PermissionKey) {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(key)
        ? current.permissions.filter((item) => item !== key)
        : [...current.permissions, key],
    }));
  }

  function toggleMember(memberId: string) {
    setForm((current) => ({
      ...current,
      memberIds: current.memberIds.includes(memberId)
        ? current.memberIds.filter((id) => id !== memberId)
        : [...current.memberIds, memberId],
    }));
  }

  function toggleCategory(keys: PermissionKey[]) {
    setForm((current) => {
      const allSelected = keys.every((key) => current.permissions.includes(key));
      return {
        ...current,
        permissions: allSelected
          ? current.permissions.filter((key) => !keys.includes(key))
          : Array.from(new Set([...current.permissions, ...keys])),
      };
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      name: form.name,
      description: form.description,
      permissions: form.permissions,
      memberIds: form.memberIds,
    };
    if (form.id) {
      updateMutation.mutate({ id: form.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <AppShell
      title="Permissões"
      subtitle="Controle o que cada grupo de funcionários pode ver e fazer"
      actions={
        <button
          onClick={openCreate}
          style={{ background: "var(--gradient-primary)" }}
          className="hidden md:inline-flex items-center gap-2 px-4 h-9 rounded-xl text-primary-foreground text-sm font-medium transition hover:-translate-y-0.5 hover:opacity-90 shadow-[var(--shadow-elegant)]"
        >
          <Plus className="h-4 w-4" /> Novo grupo
        </button>
      }
    >
      <button
        onClick={openCreate}
        style={{ background: "var(--gradient-primary)" }}
        className="mb-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-primary-foreground shadow-[var(--shadow-elegant)] transition hover:opacity-90 md:hidden"
      >
        <Plus className="h-4 w-4" /> Novo grupo
      </button>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
        {permissionGroups.map((group) => {
          const members = employees.filter((employee) => employee.permissionGroupId === group.id);
          return (
            <div
              key={group.id}
              className="hover-lift rounded-2xl border border-border bg-card p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-primary-foreground"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    {group.isSystem ? (
                      <Lock className="h-5 w-5" />
                    ) : (
                      <ShieldCheck className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display font-semibold text-base truncate">{group.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {group.permissions.length} permiss
                      {group.permissions.length === 1 ? "ão" : "ões"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(group)}
                    className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                    aria-label={`Editar grupo ${group.name}`}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {!group.isSystem && (
                    <button
                      type="button"
                      onClick={() => handleDelete(group)}
                      disabled={deleteMutation.isPending}
                      className="h-8 w-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center transition-colors disabled:opacity-50"
                      aria-label={`Excluir grupo ${group.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  )}
                </div>
              </div>

              <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{group.description}</p>

              <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">
                  {members.length} {members.length === 1 ? "membro" : "membros"}
                </span>
                <div className="ml-auto flex -space-x-1.5">
                  {members.slice(0, 4).map((member) => (
                    <span
                      key={member.id}
                      title={member.name}
                      className="flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-card text-[9px] font-semibold text-primary-foreground"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                  ))}
                  {members.length > 4 && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-card bg-muted text-[9px] font-semibold text-muted-foreground">
                      +{members.length - 4}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {permissionCatalog
                  .flatMap((category) => category.items)
                  .filter((item) => group.permissions.includes(item.key))
                  .slice(0, 4)
                  .map((item) => (
                    <span
                      key={item.key}
                      className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                    >
                      {item.label}
                    </span>
                  ))}
                {group.permissions.length > 4 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    +{group.permissions.length - 4} mais
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent
          side="left"
          className="w-full gap-0 overflow-hidden border-r border-primary/15 bg-card p-0 shadow-[24px_0_60px_-32px_rgba(15,92,190,0.45)] sm:max-w-[620px]"
        >
          <form
            onSubmit={handleSubmit}
            className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto]"
          >
            <SheetHeader className="border-b border-border/70 bg-primary/[0.035] px-5 pb-5 pt-6 text-left sm:px-6">
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {form.isSystem ? <Lock className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
              </div>
              <SheetTitle className="font-display text-2xl font-bold">
                {form.id ? "Editar grupo de permissão" : "Criar grupo de permissão"}
              </SheetTitle>
              <SheetDescription className="max-w-lg leading-relaxed">
                Escolha o que os membros deste grupo podem ver e fazer no sistema.
              </SheetDescription>
            </SheetHeader>

            <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nome">
                  <input
                    value={form.name}
                    onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                    className="task-create-input h-11 w-full rounded-xl border px-3.5 text-sm outline-none transition"
                    placeholder="Ex: Financeiro - somente tarefas"
                    required
                  />
                </Field>
                <Field label="Descrição">
                  <input
                    value={form.description}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, description: e.target.value }))
                    }
                    className="task-create-input h-11 w-full rounded-xl border px-3.5 text-sm outline-none transition"
                    placeholder="O que este grupo pode fazer"
                  />
                </Field>
              </div>

              {form.isSystem && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs text-primary flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  Este é o grupo Administrador: as permissões são fixas, mas você pode renomear e
                  gerenciar os membros.
                </div>
              )}

              <div className="space-y-3">
                {permissionCatalog.map((category) => {
                  const keys = category.items.map((item) => item.key);
                  const editableKeys = form.isSystem
                    ? keys
                    : keys.filter((key) => !adminOnlyPermissionKeys.includes(key));
                  const allSelected = editableKeys.every((key) => form.permissions.includes(key));
                  return (
                    <div
                      key={category.category}
                      className="rounded-2xl border border-border bg-background/55 p-3.5"
                    >
                      <div className="mb-2.5 flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {category.category}
                        </span>
                        <button
                          type="button"
                          disabled={form.isSystem}
                          onClick={() => toggleCategory(editableKeys)}
                          className="text-xs font-medium text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                        >
                          {allSelected ? "Desmarcar tudo" : "Marcar tudo"}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {category.items.map((item) => {
                          const adminOnly = adminOnlyPermissionKeys.includes(item.key);
                          const disabled = form.isSystem || adminOnly;
                          return (
                            <label
                              key={item.key}
                              className={cn(
                                "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors",
                                form.permissions.includes(item.key)
                                  ? "border-primary/25 bg-primary/[0.055]"
                                  : "border-transparent",
                                disabled ? "opacity-60" : "cursor-pointer hover:bg-muted/60",
                              )}
                            >
                              <Checkbox
                                checked={form.permissions.includes(item.key)}
                                disabled={disabled}
                                onCheckedChange={() => {
                                  if (!disabled) togglePermission(item.key);
                                }}
                                className="mt-0.5"
                              />
                              <span className="min-w-0">
                                <span className="block text-sm font-medium leading-tight">
                                  {item.label}
                                </span>
                                <span className="block text-[11px] text-muted-foreground">
                                  {item.hint}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-border bg-background/55 p-3.5">
                <div className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Membros ({form.memberIds.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {employees.map((employee) => {
                    const currentGroup = permissionGroups.find(
                      (group) => group.id === employee.permissionGroupId,
                    );
                    const inAnotherGroup =
                      currentGroup && currentGroup.id !== form.id ? currentGroup.name : null;
                    return (
                      <label
                        key={employee.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors",
                          form.memberIds.includes(employee.id)
                            ? "border-primary/25 bg-primary/[0.055]"
                            : "border-transparent hover:bg-muted/60",
                        )}
                      >
                        <Checkbox
                          checked={form.memberIds.includes(employee.id)}
                          onCheckedChange={() => toggleMember(employee.id)}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium leading-tight truncate">
                            {employee.name}
                          </span>
                          <span className="block text-[11px] text-muted-foreground truncate">
                            {employee.role}
                            {inAnotherGroup ? ` • hoje em: ${inAnotherGroup}` : ""}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

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
                disabled={isSaving}
                style={{ background: "var(--gradient-primary)" }}
                className="h-11 flex-1 rounded-xl px-5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition hover:opacity-90 disabled:opacity-60 sm:flex-none"
              >
                {isSaving ? "Salvando..." : form.id ? "Salvar grupo" : "Criar grupo"}
              </button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
