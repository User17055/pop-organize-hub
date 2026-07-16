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
import { createEmployee } from "@/lib/api/pop-organize.functions";
import { useWorkspaceData, workspaceQueryKey } from "@/lib/api/use-workspace";
import { Check, Copy, Link2, Mail, Plus } from "lucide-react";

export const Route = createFileRoute("/funcionarios")({
  head: () => ({ meta: [{ title: "Funcionários - Pop Organize" }] }),
  component: FuncionariosPage,
});

function FuncionariosPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useWorkspaceData();
  const [showForm, setShowForm] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "",
    departmentId: "",
    status: "active" as "active" | "inactive",
    permissionGroupId: "",
    ownerEmail: "",
    ownerPassword: "",
  });

  const createMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      email: string;
      role: string;
      departmentId: string;
      status: "active" | "inactive";
      permissionGroupId?: string;
      ownerEmail?: string;
      ownerPassword?: string;
    }) => createEmployee({ data: payload }),
    onSuccess: ({ invitationToken }) => {
      setInviteLink(`${window.location.origin}/aceitar-convite?token=${invitationToken}`);
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
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

  const { accessMode, employees, departments, invitations, tasks, currentUser, permissionGroups } =
    data;
  const permissionSet = resolvePermissionSet({ currentUser, employees, permissionGroups });
  if (!hasPermission(permissionSet, "pages.employees")) {
    return (
      <AppShell title="Funcionários" subtitle="Colaboradores cadastrados">
        <AccessRestricted requiredLabel="quem tem a permissão “Ver Funcionários”" />
      </AppShell>
    );
  }
  const canManage = hasPermission(permissionSet, "manage.employees");

  const getDepartment = (id: string) => departments.find((department) => department.id === id);
  const getPermissionGroup = (id?: string) => permissionGroups.find((group) => group.id === id);
  const mutationError = createMutation.error instanceof Error ? createMutation.error.message : null;

  function openForm() {
    setForm({
      name: "",
      email: "",
      role: "",
      departmentId: departments[0]?.id ?? "",
      status: "active",
      permissionGroupId: "",
      ownerEmail: "",
      ownerPassword: "",
    });
    setInviteLink("");
    setCopied(false);
    createMutation.reset();
    setShowForm(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createMutation.mutate({
      ...form,
      ownerEmail: accessMode === "personal" ? form.ownerEmail : undefined,
      ownerPassword: accessMode === "personal" ? form.ownerPassword : undefined,
    });
  }

  async function copyInviteLink() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
  }

  return (
    <AppShell
      title="Funcionários"
      subtitle={`${employees.length} colaboradores cadastrados`}
      actions={
        canManage ? (
          <button
            onClick={openForm}
            style={{ background: "var(--gradient-primary)" }}
            className="hidden md:inline-flex items-center gap-2 px-4 h-9 rounded-xl text-primary-foreground text-sm font-medium transition hover:-translate-y-0.5 hover:opacity-90 shadow-[var(--shadow-elegant)]"
          >
            <Plus className="h-4 w-4" /> Novo funcionário
          </button>
        ) : undefined
      }
    >
      {invitations.length > 0 && (
        <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 font-medium">
            <Link2 className="h-4 w-4 text-primary" /> Convites pendentes
          </div>
          <div className="mt-3 space-y-2">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-col gap-1 rounded-xl bg-background/80 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium">{invitation.name}</span>
                <span className="text-muted-foreground">
                  {invitation.email} · aguardando aceite
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-card border border-border rounded-2xl overflow-x-auto">
        <Table className="min-w-[820px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Permissões</TableHead>
              <TableHead className="text-right">Tarefas</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((e) => {
              const dept = getDepartment(e.departmentId);
              const count = tasks.filter((t) => t.responsibleId === e.id).length;
              return (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold text-primary-foreground bg-primary shrink-0">
                        {e.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{e.name}</div>
                        <div className="text-xs text-muted-foreground inline-flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 shrink-0" /> {e.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{e.role}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ background: dept?.color }}
                      />
                      <span className="text-xs text-foreground/80">{dept?.name}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary whitespace-nowrap">
                      {getPermissionGroup(e.permissionGroupId)?.name ?? "Padrão"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">{count}</TableCell>
                  <TableCell>
                    <span
                      className={
                        e.status === "active"
                          ? "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-success/15 text-success"
                          : "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground"
                      }
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />{" "}
                      {e.status === "active" ? "Ativo" : "Inativo"}
                    </span>
                  </TableCell>
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
              <DialogTitle>{inviteLink ? "Convite pronto" : "Convidar funcionário"}</DialogTitle>
              <DialogDescription>
                {inviteLink
                  ? "Envie este link ao funcionário. Ele definirá a própria senha ao aceitar."
                  : "Informe os dados do colaborador. A senha será criada por ele no aceite."}
              </DialogDescription>
            </DialogHeader>
            {inviteLink ? (
              <div className="mt-5 space-y-3">
                <div className="break-all rounded-xl border border-border bg-muted/40 p-3 text-sm">
                  {inviteLink}
                </div>
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Link copiado" : "Copiar link do convite"}
                </button>
              </div>
            ) : (
              <div className="space-y-3.5 mt-4">
                {accessMode === "personal" && (
                  <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <div>
                      <div className="text-sm font-medium">Ative seu espaço compartilhado</div>
                      <div className="text-xs text-muted-foreground">
                        Crie sua conta de administrador antes do primeiro convite.
                      </div>
                    </div>
                    <Field label="Seu e-mail">
                      <input
                        type="email"
                        value={form.ownerEmail}
                        onChange={(e) =>
                          setForm((current) => ({ ...current, ownerEmail: e.target.value }))
                        }
                        className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
                        required
                      />
                    </Field>
                    <Field label="Sua senha">
                      <input
                        type="password"
                        value={form.ownerPassword}
                        onChange={(e) =>
                          setForm((current) => ({ ...current, ownerPassword: e.target.value }))
                        }
                        className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
                        minLength={8}
                        required
                      />
                    </Field>
                  </div>
                )}
                <Field label="Nome">
                  <input
                    value={form.name}
                    onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                    className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
                    required
                  />
                </Field>
                <Field label="E-mail">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                    className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
                    required
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Cargo">
                    <input
                      value={form.role}
                      onChange={(e) => setForm((current) => ({ ...current, role: e.target.value }))}
                      className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
                      required
                    />
                  </Field>
                  <Field label="Setor">
                    <select
                      value={form.departmentId}
                      onChange={(e) =>
                        setForm((current) => ({ ...current, departmentId: e.target.value }))
                      }
                      className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
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
                      className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </select>
                  </Field>
                </div>
                <Field label="Grupo de permissão">
                  <select
                    value={form.permissionGroupId}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, permissionGroupId: e.target.value }))
                    }
                    className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
                  >
                    <option value="">Padrão (sem restrições)</option>
                    {permissionGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {mutationError && <div className="text-sm text-destructive">{mutationError}</div>}
              </div>
            )}
            <DialogFooter className="mt-6">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="h-9 px-4 rounded-md border border-border text-sm font-medium hover:bg-muted transition"
              >
                Cancelar
              </button>
              {!inviteLink && (
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  style={{ background: "var(--gradient-primary)" }}
                  className="h-9 px-5 rounded-xl text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-60 shadow-[var(--shadow-elegant)]"
                >
                  {createMutation.isPending ? "Criando convite..." : "Criar convite"}
                </button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
