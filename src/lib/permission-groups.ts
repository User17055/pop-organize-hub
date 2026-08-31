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

export function isAdminUser(input: {
  currentUser?: CurrentUser | PermissionEmployee | null;
  employees: PermissionEmployee[];
}): boolean {
  if (isAdminRole(input.currentUser?.role)) return true;
  const employee = input.employees.find((item) => item.id === input.currentUser?.id);
  return isAdminRole(employee?.role);
}
