import type { CurrentUser, Employee, PermissionGroup, PermissionKey } from "./domain";

export type PermissionSet = "all" | Set<PermissionKey>;

type PermissionEmployee = Pick<Employee, "id" | "role" | "permissionGroupId">;

function isAdminRole(role?: string) {
  return role?.toLowerCase().includes("admin") ?? false;
}

/**
 * Resolves the effective permission set for a user.
 * - Admins (role contains "admin") always get full access.
 * - Users assigned to a group get exactly that group's permissions.
 * - Users without a group (or with a dangling group id) get full access,
 *   so misconfiguration never locks anyone out — restriction is opt-in.
 */
export function resolvePermissionSet(input: {
  currentUser?: CurrentUser | PermissionEmployee | null;
  employees: PermissionEmployee[];
  permissionGroups: PermissionGroup[];
}): PermissionSet {
  const userId = input.currentUser?.id;
  if (!userId) return new Set();

  if (isAdminRole(input.currentUser?.role)) return "all";

  const employee = input.employees.find((item) => item.id === userId);
  if (isAdminRole(employee?.role)) return "all";

  const groupId =
    (input.currentUser as PermissionEmployee)?.permissionGroupId ?? employee?.permissionGroupId;
  if (!groupId) return "all";

  const group = input.permissionGroups.find((item) => item.id === groupId);
  if (!group) return "all";

  return new Set(group.permissions);
}

export function hasPermission(set: PermissionSet, key: PermissionKey) {
  return set === "all" || set.has(key);
}

/**
 * Chaves que permitem a quem as possui conceder poder a outra pessoa -- ou a si mesmo. Quem pode
 * reescrever grupo de permissao, cadastrar ou editar funcionario alcanca acesso total em um passo,
 * entao conceder qualquer uma delas equivale a conceder administracao.
 */
const escalationKeys: PermissionKey[] = [
  "manage.permissions",
  "manage.employees",
  "manage.employees.edit",
];

/**
 * Diz se um cargo/grupo de permissao concede poder administrativo.
 *
 * Existe para que a regra "so o dono cria outro administrador" tenha **uma** definicao. Ela estava
 * escrita a mao em um unico dos quatro caminhos que gravam cargo (updateEmployee do mobile), e
 * ausente nos outros tres -- convite pelo mobile, e edicao e convite pelo painel web.
 *
 * O texto do cargo conta porque e ele que decide o acesso em `isAdminRole` aqui e em
 * `defaultPermissionGroupId` no database.server.ts: um cargo contendo "admin" recebe o grupo pg1
 * (todas as permissoes) automaticamente.
 */
export function grantsAdministrativePower(input: {
  role?: string;
  permissionGroupId?: string;
  permissionGroups: PermissionGroup[];
}): boolean {
  if (isAdminRole(input.role)) return true;
  if (!input.permissionGroupId) return false;
  const group = input.permissionGroups.find((item) => item.id === input.permissionGroupId);
  if (!group) return false;
  return escalationKeys.some((key) => group.permissions.includes(key));
}

export function isAdminUser(input: {
  currentUser?: CurrentUser | PermissionEmployee | null;
  employees: PermissionEmployee[];
}): boolean {
  if (isAdminRole(input.currentUser?.role)) return true;
  const employee = input.employees.find((item) => item.id === input.currentUser?.id);
  return isAdminRole(employee?.role);
}
