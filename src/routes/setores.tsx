import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { AccessRestricted } from "@/components/access-restricted";
import { ErrorState, LoadingState } from "@/components/data-state";
import { Field } from "@/components/form-field";
import { hasPermission, resolvePermissionSet } from "@/lib/permission-groups";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createDepartment, updateDepartmentDetails } from "@/lib/api/pop-organize.functions";
import { useWorkspaceData, workspaceQueryKey } from "@/lib/api/use-workspace";
import { departmentColors, type Department } from "@/lib/domain";
import { ClipboardList, Pencil, Plus, UserRound, UsersRound } from "lucide-react";

export const Route = createFileRoute("/setores")({
  head: () => ({ meta: [{ title: "Setores - Pop Organize" }] }),
  component: SetoresPage,
});

function SetoresPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useWorkspaceData();
  const [showForm, setShowForm] = useState(false);
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    managerId: "",
    color: departmentColors[0],
    managerAccessMode: "own" as "own" | "selected" | "all",
    managerVisibleDepartmentIds: [] as string[],
  });

  const createMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      description: string;
      managerId: string;
      color?: string;
      managerAccessMode?: "own" | "selected" | "all";
      managerVisibleDepartmentIds: string[];
    }) => createDepartment({ data: payload }),
    onSuccess: () => {
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      departmentId: string;
      name: string;
      description: string;
      managerId?: string;
      color?: string;
      managerAccessMode?: "own" | "selected" | "all";
      managerVisibleDepartmentIds?: string[];
    }) => updateDepartmentDetails({ data: payload }),
    onSuccess: () => {
      setShowForm(false);
      setEditingDepartmentId(null);
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

  const { departments, employees, tasks, currentUser, permissionGroups } = data;
  const permissionSet = resolvePermissionSet({ currentUser, employees, permissionGroups });
  if (!hasPermission(permissionSet, "pages.departments")) {
    return (
      <AppShell title="Setores" subtitle="Divisões fixas da empresa">
        <AccessRestricted requiredLabel="quem tem a permissão “Ver Setores”" />
      </AppShell>
    );
  }
  const canManage = hasPermission(permissionSet, "manage.departments");
  const canConfigureManagerAccess =
    data.company.ownerId === currentUser.id ||
    currentUser.role.toLocaleLowerCase("pt-BR").includes("admin");

  const getEmployee = (id: string) => employees.find((employee) => employee.id === id);
  const mutationError =
    createMutation.error instanceof Error
      ? createMutation.error.message
      : updateMutation.error instanceof Error
        ? updateMutation.error.message
        : null;

  function openForm() {
    const manager = employees[0];
    setEditingDepartmentId(null);
    setForm({
      name: "",
      description: "",
      managerId: manager?.id ?? "",
      color: departmentColors[departments.length % departmentColors.length],
      managerAccessMode: manager?.departmentAccessMode ?? "own",
      managerVisibleDepartmentIds: manager?.visibleDepartmentIds ?? [],
    });
    createMutation.reset();
    updateMutation.reset();
    setShowForm(true);
  }

  function openEditForm(department: Department) {
    const manager = getEmployee(department.managerId);
    setEditingDepartmentId(department.id);
    setForm({
      name: department.name,
      description: department.description,
      managerId: department.managerId,
      color: department.color,
      managerAccessMode: manager?.departmentAccessMode ?? "own",
      managerVisibleDepartmentIds: manager?.visibleDepartmentIds ?? [],
    });
    createMutation.reset();
    updateMutation.reset();
    setShowForm(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (editingDepartmentId) {
      updateMutation.mutate({
        departmentId: editingDepartmentId,
        name: form.name,
        description: form.description,
        color: form.color,
        ...(canConfigureManagerAccess
          ? {
              managerId: form.managerId,
              managerAccessMode: form.managerAccessMode,
              managerVisibleDepartmentIds: form.managerVisibleDepartmentIds,
            }
          : {}),
      });
      return;
    }
    createMutation.mutate({
      name: form.name,
      description: form.description,
      managerId: form.managerId,
      color: form.color,
      ...(canConfigureManagerAccess
        ? {
            managerAccessMode: form.managerAccessMode,
            managerVisibleDepartmentIds: form.managerVisibleDepartmentIds,
          }
        : { managerVisibleDepartmentIds: [] }),
    });
  }

  return (
    <AppShell
      title="Setores"
      subtitle="Divisões fixas da empresa"
      actions={
        canManage ? (
          <button
            onClick={openForm}
            style={{ background: "var(--gradient-primary)" }}
            className="hidden md:inline-flex items-center gap-2 px-4 h-9 rounded-xl text-primary-foreground text-sm font-medium transition hover:-translate-y-0.5 hover:opacity-90 shadow-[var(--shadow-elegant)]"
          >
            <Plus className="h-4 w-4" /> Novo setor
          </button>
        ) : undefined
      }
    >
      {canManage && (
        <button
          type="button"
          onClick={openForm}
          style={{ background: "var(--gradient-primary)" }}
          className="mb-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-primary-foreground shadow-[var(--shadow-elegant)] transition active:scale-[0.99] md:hidden"
        >
          <Plus className="h-4 w-4" /> Novo setor
        </button>
      )}

      {departments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
          <h2 className="text-base font-semibold">Nenhum setor cadastrado</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie o primeiro setor para organizar colaboradores e tarefas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((department) => {
            const members = employees.filter((employee) => employee.departmentId === department.id);
            const departmentTasks = tasks.filter(
              (task) => task.target.type === "department" && task.target.id === department.id,
            );
            const pendingTasks = departmentTasks.filter(
              (task) => task.status !== "completed",
            ).length;
            const manager = getEmployee(department.managerId);
            const canEdit = canManage || department.managerId === currentUser.id;
            const managerAccessLabel =
              manager?.departmentAccessMode === "all"
                ? "Todos os setores"
                : manager?.departmentAccessMode === "selected"
                  ? `${manager.visibleDepartmentIds?.length ?? 0} setores adicionais`
                  : "Setor próprio e setores gerenciados";

            return (
              <article
                key={department.id}
                className="rounded-2xl border border-border/55 bg-card px-5 py-4 shadow-sm transition hover:border-border"
              >
                <div className="flex min-w-0 items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">{department.name}</h2>
                    <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-relaxed text-muted-foreground">
                      {department.description || "Sem descrição cadastrada."}
                    </p>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => openEditForm(department)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      aria-label={`Editar ${department.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Gestor
                    </div>
                    <div className="truncate text-xs font-semibold">
                      {manager?.name ?? "Não definido"}
                    </div>
                    {manager && (
                      <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        Acesso: {managerAccessLabel}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 border-t border-border/55 pt-3">
                  <div className="pr-4">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <UsersRound className="h-3.5 w-3.5" /> Colaboradores
                    </div>
                    <div className="mt-1 text-xl font-semibold">{members.length}</div>
                  </div>
                  <div className="border-l border-border/55 pl-4">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <ClipboardList className="h-3.5 w-3.5" /> Tarefas
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-xl font-semibold">{departmentTasks.length}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {pendingTasks} pendentes
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingDepartmentId ? "Editar setor" : "Novo setor"}</DialogTitle>
              <DialogDescription>
                {editingDepartmentId
                  ? "Atualize o setor, o gestor e quais informações ele pode visualizar."
                  : "Crie uma divisão fixa para organizar equipe e tarefas."}
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
              <Field label="Gestor">
                <select
                  value={form.managerId}
                  onChange={(e) => {
                    const manager = getEmployee(e.target.value);
                    setForm((current) => ({
                      ...current,
                      managerId: e.target.value,
                      managerAccessMode: manager?.departmentAccessMode ?? "own",
                      managerVisibleDepartmentIds: manager?.visibleDepartmentIds ?? [],
                    }));
                  }}
                  className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
                  disabled={!canConfigureManagerAccess && Boolean(editingDepartmentId)}
                >
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </Field>
              {canConfigureManagerAccess && (
                <div className="space-y-3 rounded-xl border border-border/70 bg-muted/25 p-3.5">
                  <Field label="Setores que o gestor pode visualizar">
                    <select
                      value={form.managerAccessMode}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          managerAccessMode: event.target.value as "own" | "selected" | "all",
                        }))
                      }
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                    >
                      <option value="own">Setor original + setores que gerencia</option>
                      <option value="selected">Parcialmente: escolher setores</option>
                      <option value="all">Todos os setores</option>
                    </select>
                  </Field>
                  {form.managerAccessMode === "selected" && (
                    <div className="grid max-h-44 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                      {departments.map((department) => {
                        const checked = form.managerVisibleDepartmentIds.includes(department.id);
                        return (
                          <label
                            key={department.id}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-xs font-medium"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setForm((current) => ({
                                  ...current,
                                  managerVisibleDepartmentIds: checked
                                    ? current.managerVisibleDepartmentIds.filter(
                                        (id) => id !== department.id,
                                      )
                                    : [...current.managerVisibleDepartmentIds, department.id],
                                }))
                              }
                              className="h-4 w-4 accent-primary"
                            />
                            <span className="truncate">{department.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Tarefas atribuídas diretamente ao gestor continuam visíveis. O acesso aos demais
                    colaboradores e tarefas respeita os setores definidos aqui.
                  </p>
                </div>
              )}
              <Field label="Cor">
                <div className="flex flex-wrap gap-2">
                  {departmentColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, color }))}
                      className="h-7 w-7 rounded-full border-2"
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
                disabled={createMutation.isPending || updateMutation.isPending}
                style={{ background: "var(--gradient-primary)" }}
                className="h-9 px-5 rounded-xl text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-60 shadow-[var(--shadow-elegant)]"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Salvando..."
                  : editingDepartmentId
                    ? "Salvar alterações"
                    : "Criar setor"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
