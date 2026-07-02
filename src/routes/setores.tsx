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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createDepartment } from "@/lib/api/pop-organize.functions";
import { useWorkspaceData, workspaceQueryKey } from "@/lib/api/use-workspace";
import { departmentColors } from "@/lib/domain";
import { Plus } from "lucide-react";

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
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Setor</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Gestor</TableHead>
              <TableHead className="text-right">Funcionários</TableHead>
              <TableHead className="text-right">Tarefas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((d) => {
              const members = employees.filter((e) => e.departmentId === d.id);
              const dTasks = tasks.filter(
                (t) => t.target.type === "department" && t.target.id === d.id,
              );
              const manager = getEmployee(d.managerId);
              return (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ background: d.color }}
                      />
                      <span className="font-medium text-sm">{d.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {d.description}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-foreground/80">{manager?.name ?? "—"}</span>
                  </TableCell>
                  <TableCell className="text-right text-sm">{members.length}</TableCell>
                  <TableCell className="text-right text-sm">{dTasks.length}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

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
