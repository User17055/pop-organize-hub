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
import {
  createEmployee,
  deleteEmployee,
  resendEmployeeInvitation,
  updateEmployee,
} from "@/lib/api/pop-organize.functions";
import { useWorkspaceData, workspaceQueryKey } from "@/lib/api/use-workspace";
import { getAvatarGradient } from "@/lib/avatar-colors";
import type { Employee } from "@/lib/domain";
import { Check, Copy, Link2, Mail, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/funcionarios")({
  head: () => ({ meta: [{ title: "Funcionários - Pop Organize" }] }),
  component: FuncionariosPage,
});

function EmployeeAvatar({ employee, compact = false }: { employee: Employee; compact?: boolean }) {
  const initials = employee.name
    .split(" ")
    .map((name) => name[0])
    .slice(0, 2)
    .join("");

  return (
    <div
      className={
        compact
          ? "relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white"
          : "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white"
      }
      style={{ background: getAvatarGradient(employee.id) }}
    >
      <span aria-hidden="true">{initials}</span>
      {employee.avatar && (
        <img
          src={employee.avatar}
          alt={`Foto de ${employee.name}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
    </div>
  );
}

function FuncionariosPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useWorkspaceData();
  const [showForm, setShowForm] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [inviteEmailSent, setInviteEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resentInvitationId, setResentInvitationId] = useState("");
  const [editingEmployeeId, setEditingEmployeeId] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "",
    departmentId: "",
    status: "active" as "active" | "inactive",
    permissionGroupId: "",
    canCreateTasks: true,
  });

  const createMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      email: string;
      role: string;
      departmentId: string;
      status: "active" | "inactive";
      permissionGroupId?: string;
      canCreateTasks?: boolean;
    }) => createEmployee({ data: payload }),
    onSuccess: ({ invitationUrl, emailSent }) => {
      setInviteLink(invitationUrl);
      setInviteEmailSent(emailSent);
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });
  const resendMutation = useMutation({
    mutationFn: (invitationId: string) => resendEmployeeInvitation({ data: { id: invitationId } }),
    onSuccess: ({ invitationId }) => {
      setResentInvitationId(invitationId);
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });
  const updateMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      name: string;
      role: string;
      departmentId: string;
      status: "active" | "inactive";
      permissionGroupId?: string;
      canCreateTasks?: boolean;
    }) => updateEmployee({ data: payload }),
    onSuccess: () => {
      setShowForm(false);
      setEditingEmployeeId("");
      void queryClient.invalidateQueries({ queryKey: workspaceQueryKey });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEmployee({ data: { id } }),
    onSuccess: () => {
      setShowForm(false);
      setEditingEmployeeId("");
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

  const { employees, departments, invitations, tasks, currentUser, permissionGroups } = data;
  const permissionSet = resolvePermissionSet({ currentUser, employees, permissionGroups });
  if (!hasPermission(permissionSet, "pages.employees")) {
    return (
      <AppShell title="Funcionários" subtitle="Colaboradores cadastrados">
        <AccessRestricted requiredLabel="quem tem a permissão “Ver Funcionários”" />
      </AppShell>
    );
  }
  const canManage = hasPermission(permissionSet, "manage.employees");
  const canEdit = hasPermission(permissionSet, "manage.employees.edit");
  const canDelete = hasPermission(permissionSet, "manage.employees.delete");
  const ownerId = data.company.ownerId;

  const getDepartment = (id: string) => departments.find((department) => department.id === id);
  const getPermissionGroup = (id?: string) => permissionGroups.find((group) => group.id === id);
  const mutationError = createMutation.error instanceof Error ? createMutation.error.message : null;
  const resendError = resendMutation.error instanceof Error ? resendMutation.error.message : null;
  const editingEmployee = employees.find((employee) => employee.id === editingEmployeeId);
  const employeeFormReadOnly = Boolean(editingEmployeeId) && !canEdit;

  function openForm() {
    setForm({
      name: "",
      email: "",
      role: "",
      departmentId: departments[0]?.id ?? "",
      status: "active",
      permissionGroupId:
        permissionGroups.find((group) => group.name.toLowerCase() === "colaborador")?.id ?? "",
      canCreateTasks: true,
    });
    setInviteLink("");
    setInviteEmailSent(false);
    setCopied(false);
    setEditingEmployeeId("");
    createMutation.reset();
    setShowForm(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (editingEmployeeId) {
      if (!canEdit) return;
      updateMutation.mutate({
        id: editingEmployeeId,
        name: form.name,
        role: form.role,
        departmentId: form.departmentId,
        status: form.status,
        permissionGroupId: form.permissionGroupId || undefined,
        canCreateTasks: form.canCreateTasks,
      });
    } else {
      createMutation.mutate(form);
    }
  }

  function openEdit(employee: (typeof employees)[number]) {
    if (employee.id === ownerId || (!canEdit && !canDelete)) return;
    updateMutation.reset();
    deleteMutation.reset();
    setEditingEmployeeId(employee.id);
    setInviteLink("");
    setForm({
      name: employee.name,
      email: employee.email,
      role: employee.role,
      departmentId: employee.departmentId,
      status: employee.status,
      permissionGroupId: employee.permissionGroupId ?? "",
      canCreateTasks: hasPermission(
        resolvePermissionSet({ currentUser: employee, employees, permissionGroups }),
        "tasks.create",
      ),
    });
    setShowForm(true);
  }

  function removeEmployee(employee: (typeof employees)[number]) {
    if (window.confirm(`Excluir ${employee.name} da empresa?`)) {
      deleteMutation.mutate(employee.id);
    }
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
      {canManage && (
        <button
          type="button"
          onClick={openForm}
          style={{ background: "var(--gradient-primary)" }}
          className="mb-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-primary-foreground shadow-[var(--shadow-elegant)] transition hover:opacity-90 active:scale-[0.99] md:hidden"
        >
          <Plus className="h-4 w-4" /> Novo funcionário
        </button>
      )}

      {invitations.length > 0 && (
        <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 font-medium">
            <Link2 className="h-4 w-4 text-primary" /> Convites pendentes
          </div>
          <div className="mt-3 space-y-2">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-col gap-2 rounded-xl bg-background/80 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="font-medium">{invitation.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {invitation.email} · aguardando aceite
                  </div>
                </div>
                {canManage && (
                  <button
                    type="button"
                    disabled={
                      resendMutation.isPending && resendMutation.variables === invitation.id
                    }
                    onClick={() => {
                      setResentInvitationId("");
                      resendMutation.reset();
                      resendMutation.mutate(invitation.id);
                    }}
                    className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-primary/25 px-3 text-xs font-medium text-primary transition hover:bg-primary/10 disabled:opacity-50"
                  >
                    {resentInvitationId === invitation.id ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Mail className="h-3.5 w-3.5" />
                    )}
                    {resendMutation.isPending && resendMutation.variables === invitation.id
                      ? "Enviando..."
                      : resentInvitationId === invitation.id
                        ? "E-mail enviado"
                        : "Reenviar e-mail"}
                  </button>
                )}
              </div>
            ))}
            {resendError && <div className="text-sm text-destructive">{resendError}</div>}
          </div>
        </div>
      )}
      <div className="md:hidden">
        {employees.map((employee) => {
          const department = getDepartment(employee.departmentId);
          const taskCount = tasks.filter((task) =>
            [task.responsibleId, ...(task.responsibleIds ?? [])].includes(employee.id),
          ).length;
          const isOwner = employee.id === ownerId;
          return (
            <button
              type="button"
              key={employee.id}
              onClick={() => openEdit(employee)}
              disabled={isOwner || (!canEdit && !canDelete)}
              className="w-full border-b border-border/70 px-1 py-4 text-left transition enabled:hover:bg-muted/30 disabled:cursor-default"
            >
              <div className="flex min-w-0 items-start gap-3">
                <EmployeeAvatar employee={employee} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{employee.name}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {employee.email}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium">
                      {isOwner ? "Proprietário" : employee.role}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
                      {getPermissionGroup(employee.permissionGroupId)?.name ?? "Sem grupo"}
                    </span>
                  </div>
                </div>
                <span
                  className={
                    employee.status === "active"
                      ? "shrink-0 rounded-full bg-success/15 px-2 py-1 text-[10px] font-semibold text-success"
                      : "shrink-0 rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground"
                  }
                >
                  {employee.status === "active" ? "Ativo" : "Inativo"}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs">
                <span className="min-w-0 truncate text-muted-foreground">
                  Setor: <strong className="text-foreground">{department?.name ?? "—"}</strong>
                </span>
                <span className="shrink-0 font-semibold">
                  {taskCount} {taskCount === 1 ? "tarefa" : "tarefas"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
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
          <TableBody className="[&_tr:last-child]:border-b">
            {employees.map((e) => {
              const dept = getDepartment(e.departmentId);
              const count = tasks.filter((t) => t.responsibleId === e.id).length;
              const isOwner = e.id === ownerId;
              return (
                <TableRow
                  key={e.id}
                  tabIndex={!isOwner && (canEdit || canDelete) ? 0 : undefined}
                  onClick={() => openEdit(e)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openEdit(e);
                    }
                  }}
                  className={
                    !isOwner && (canEdit || canDelete)
                      ? "cursor-pointer border-border/70 hover:bg-muted/30"
                      : "border-border/70 hover:bg-transparent"
                  }
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <EmployeeAvatar employee={e} compact />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{e.name}</div>
                        <div className="text-xs text-muted-foreground inline-flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 shrink-0" /> {e.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{isOwner ? "Proprietário" : e.role}</TableCell>
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
                      {getPermissionGroup(e.permissionGroupId)?.name ?? "Sem grupo"}
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
              <DialogTitle>
                {inviteLink
                  ? inviteEmailSent
                    ? "Convite enviado"
                    : "Convite pronto"
                  : editingEmployeeId
                    ? "Editar funcionário"
                    : "Convidar funcionário"}
              </DialogTitle>
              <DialogDescription>
                {inviteLink
                  ? inviteEmailSent
                    ? `Enviamos o convite para ${form.email}. O link abaixo fica disponível como alternativa.`
                    : "Copie o link abaixo e envie ao funcionário. Ele definirá a própria senha ao aceitar."
                  : editingEmployeeId
                    ? "Atualize os dados e as permissões do colaborador."
                    : "Informe os dados do colaborador. A senha será criada por ele no aceite."}
              </DialogDescription>
            </DialogHeader>
            {inviteLink ? (
              <div className="mt-5 space-y-3">
                {inviteEmailSent && (
                  <div className="flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2.5 text-sm font-medium text-success">
                    <Mail className="h-4 w-4" /> E-mail enviado com sucesso
                  </div>
                )}
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
                <Field label="Nome">
                  <input
                    value={form.name}
                    onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                    className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
                    required
                    disabled={employeeFormReadOnly}
                  />
                </Field>
                <Field label="E-mail">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                    className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
                    required
                    disabled={Boolean(editingEmployeeId)}
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Cargo">
                    <input
                      value={form.role}
                      onChange={(e) => setForm((current) => ({ ...current, role: e.target.value }))}
                      className="w-full h-9 px-3 rounded-md bg-background border border-input outline-none focus:border-primary text-sm"
                      disabled={employeeFormReadOnly}
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
                      disabled={employeeFormReadOnly}
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
                      disabled={employeeFormReadOnly}
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
                    disabled={employeeFormReadOnly}
                  >
                    <option value="">Sem grupo (sem permissões)</option>
                    {permissionGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <label className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <input
                    type="checkbox"
                    checked={form.canCreateTasks}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        canCreateTasks: event.target.checked,
                      }))
                    }
                    disabled={employeeFormReadOnly}
                    className="mt-1 h-4 w-4 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-medium">Cadastrar atividades</span>
                    <span className="block text-xs text-muted-foreground">
                      Exibe o botão azul e permite que este funcionário crie atividades.
                    </span>
                  </span>
                </label>
                {mutationError && <div className="text-sm text-destructive">{mutationError}</div>}
                {updateMutation.error instanceof Error && (
                  <div className="text-sm text-destructive">{updateMutation.error.message}</div>
                )}
                {deleteMutation.error instanceof Error && (
                  <div className="text-sm text-destructive">{deleteMutation.error.message}</div>
                )}
              </div>
            )}
            <DialogFooter className="mt-6 sm:justify-between">
              <div>
                {editingEmployee && canDelete && (
                  <button
                    type="button"
                    onClick={() => removeEmployee(editingEmployee)}
                    disabled={deleteMutation.isPending}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-destructive/25 px-4 text-sm font-medium text-destructive transition hover:bg-destructive/5 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleteMutation.isPending ? "Excluindo..." : "Excluir funcionário"}
                  </button>
                )}
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="h-9 px-4 rounded-md border border-border text-sm font-medium hover:bg-muted transition"
                >
                  Cancelar
                </button>
                {!inviteLink && (!editingEmployeeId || canEdit) && (
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    style={{ background: "var(--gradient-primary)" }}
                    className="h-9 px-5 rounded-xl text-primary-foreground text-sm font-medium hover:opacity-90 transition disabled:opacity-60 shadow-[var(--shadow-elegant)]"
                  >
                    {updateMutation.isPending
                      ? "Salvando..."
                      : editingEmployeeId
                        ? "Salvar alterações"
                        : createMutation.isPending
                          ? "Enviando convite..."
                          : "Criar e enviar convite"}
                  </button>
                )}
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
