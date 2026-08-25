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
import { createDepartment } from "@/lib/api/pop-organize.functions";
import { useWorkspaceData, workspaceQueryKey } from "@/lib/api/use-workspace";
import { departmentColors } from "@/lib/domain";
import { ClipboardList, Plus, UserRound, UsersRound } from "lucide-react";

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
            const pendingTasks = departmentTasks.filter((task) => task.status !== "done").length;
            const manager = getEmployee(department.managerId);

            return (
              <article
                key={department.id}
                className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className="absolute inset-y-0 left-0 w-1"
                  style={{ background: department.color }}
                />

                <div className="flex min-w-0 items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">{department.name}</h2>
                    <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-relaxed text-muted-foreground">
                      {department.description || "Sem descrição cadastrada."}
                    </p>
                  </div>
                  <span
                    className="mt-1 h-3 w-3 shrink-0 rounded-full ring-4 ring-muted/70"
                    style={{ background: department.color }}
                  />
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-xl bg-muted/45 px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Gestor
                    </div>
                    <div className="truncate text-xs font-semibold">
                      {manager?.name ?? "Não definido"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-border/70 bg-background/50 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <UsersRound className="h-3.5 w-3.5" /> Colaboradores
                    </div>
                    <div className="mt-1 text-lg font-bold">{members.length}</div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/50 p-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <ClipboardList className="h-3.5 w-3.5" /> Tarefas
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-lg font-bold">{departmentTasks.length}</span>
                      <span className="text-[10px] text-muted-foreground">
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
              <DialogTitle>Novo setor</DialogTitle>
              <DialogDescription>
                Crie uma divisão fixa para organizar equipe e tarefas.
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
                  onChange={(e) =>
                    setForm((current) => ({ ...current, managerId: e.target.value }))
                  }
                  className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
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
                disabled={createMutation.isPending}
                style={{ background: "var(--gradient-primary)" }}
                className="h-9 px-5 rounded-xl text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-60 shadow-[var(--shadow-elegant)]"
              >
                {createMutation.isPending ? "Criando..." : "Criar setor"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
