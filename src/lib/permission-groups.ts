import {
  allPermissionKeys,
  type CurrentUser,
  type Employee,
  type PermissionGroup,
  type PermissionKey,
} from "./domain";

export type PermissionSet = "all" | Set<PermissionKey>;

type PermissionEmployee = Pick<
  Employee,
  "id" | "role" | "permissionGroupId" | "canCreateTasks"
>;

function isAdminRole(role?: string) {
  return role?.toLowerCase().includes("admin") ?? false;
}

function hasAllPermissions(group?: PermissionGroup) {
  if (!group) return false;
  const permissions = new Set(group.permissions);
  return allPermissionKeys.every((permission) => permissions.has(permission));
}

/**
 * Resolves the effective permission set for a user.
 * - Admins (role contains "admin") always get full access.
 * - Users assigned to a group get exactly that group's permissions.
 * - Users without a valid group get no implicit access, so a missing or
 *   deleted group cannot expose company data.
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
  const canCreateTasks =
    employee?.canCreateTasks ?? (input.currentUser as PermissionEmployee)?.canCreateTasks;
  if (!groupId) return canCreateTasks ? new Set(["tasks.create"]) : new Set();

  const group = input.permissionGroups.find((item) => item.id === groupId);
  if (!group) return canCreateTasks ? new Set(["tasks.create"]) : new Set();

  // O grupo Administrador representa acesso total mesmo quando o cargo da
  // pessoa continua sendo, por exemplo, "Gestor" ou "Colaborador".
  if (hasAllPermissions(group)) {
    return canCreateTasks === false
      ? new Set(allPermissionKeys.filter((permission) => permission !== "tasks.create"))
      : "all";
  }

  const permissions = new Set(group.permissions);
  if (canCreateTasks === true) permissions.add("tasks.create");
  if (canCreateTasks === false) permissions.delete("tasks.create");
  return permissions;
}

export function hasPermission(set: PermissionSet, key: PermissionKey) {
  return set === "all" || set.has(key);
}

export function isAdminUser(input: {
  currentUser?: CurrentUser | PermissionEmployee | null;
  employees: PermissionEmployee[];
  permissionGroups?: PermissionGroup[];
}): boolean {
  if (isAdminRole(input.currentUser?.role)) return true;
  const employee = input.employees.find((item) => item.id === input.currentUser?.id);
  if (isAdminRole(employee?.role)) return true;

  const groupId =
    (input.currentUser as PermissionEmployee | undefined)?.permissionGroupId ??
    employee?.permissionGroupId;
  const group = input.permissionGroups?.find((item) => item.id === groupId);
  return hasAllPermissions(group);
}
