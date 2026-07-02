import type { CurrentUser, Department, Employee, Group, PermissionGroup, Task } from "./domain";
import { hasPermission, resolvePermissionSet } from "./permission-groups";

type PermissionEmployee =
  | Pick<Employee, "id" | "role" | "departmentId" | "permissionGroupId">
  | CurrentUser;

export type TaskPermissions = {
  canEditContent: boolean;
  canChangeStatus: boolean;
  canComplete: boolean;
  canReopen: boolean;
  canDelete: boolean;
  canComment: boolean;
  canAttach: boolean;
  canManageChecklist: boolean;
  roleLabel: string;
};

type PermissionInput = {
  task: Task;
  currentUser?: PermissionEmployee | null;
  employees: Array<Pick<Employee, "id" | "role" | "departmentId" | "permissionGroupId">>;
  departments: Array<Pick<Department, "id" | "managerId">>;
  groups: Array<Pick<Group, "id" | "leaderId">>;
  permissionGroups?: PermissionGroup[];
};

function isAdmin(role?: string) {
  return role?.toLowerCase().includes("admin") ?? false;
}

function getDepartmentManagedByUser(input: PermissionInput) {
  if (input.task.target.type === "department") {
    const department = input.departments.find((item) => item.id === input.task.target.id);
    return department?.managerId === input.currentUser?.id;
  }

  if (input.task.target.type === "user") {
    const employee = input.employees.find((item) => item.id === input.task.target.id);
    const department = input.departments.find((item) => item.id === employee?.departmentId);
    return department?.managerId === input.currentUser?.id;
  }

  return false;
}

function getGroupLedByUser(input: PermissionInput) {
  if (input.task.target.type !== "group") return false;
  const group = input.groups.find((item) => item.id === input.task.target.id);
  return group?.leaderId === input.currentUser?.id;
}

type HierarchyPermissions = {
  canEditContent: boolean;
  canChangeStatus: boolean;
  canComplete: boolean;
  canDelete: boolean;
  roleLabel: string;
};

function getHierarchyPermissions(input: PermissionInput): HierarchyPermissions {
  const userId = input.currentUser?.id;
  if (!userId) {
    return {
      canEditContent: false,
      canChangeStatus: false,
      canComplete: false,
      canDelete: false,
      roleLabel: "Sem acesso",
    };
  }

  if (isAdmin(input.currentUser?.role)) {
    return {
      canEditContent: true,
      canChangeStatus: true,
      canComplete: true,
      canDelete: true,
      roleLabel: "Admin da empresa",
    };
  }

  if (getDepartmentManagedByUser(input)) {
    return {
      canEditContent: true,
      canChangeStatus: true,
      canComplete: true,
      canDelete: false,
      roleLabel: "Gestor do setor",
    };
  }

  if (getGroupLedByUser(input)) {
    return {
      canEditContent: true,
      canChangeStatus: true,
      canComplete: true,
      canDelete: false,
      roleLabel: "Líder do grupo",
    };
  }

  if (input.task.reviewerId === userId) {
    return {
      canEditContent: false,
      canChangeStatus: true,
      canComplete: true,
      canDelete: false,
      roleLabel: "Revisor",
    };
  }

  if (input.task.responsibleId === userId) {
    return {
      canEditContent: false,
      canChangeStatus: true,
      canComplete: true,
      canDelete: false,
      roleLabel: "Responsável",
    };
  }

  return {
    canEditContent: false,
    canChangeStatus: false,
    canComplete: false,
    canDelete: false,
    roleLabel: "Somente leitura",
  };
}

/**
 * Effective task permissions = hierarchy (what tasks the user can act on)
 * AND permission group (what kinds of action the user may perform at all).
 * When `permissionGroups` is omitted the group cap is skipped (legacy callers).
 */
export function getTaskPermissions(input: PermissionInput): TaskPermissions {
  const base = getHierarchyPermissions(input);

  const set = resolvePermissionSet({
    currentUser: input.currentUser,
    employees: input.employees,
    permissionGroups: input.permissionGroups ?? [],
  });
  const allowed = input.permissionGroups
    ? (key: Parameters<typeof hasPermission>[1]) => hasPermission(set, key)
    : () => true;

  return {
    canEditContent: base.canEditContent && allowed("tasks.edit"),
    canChangeStatus: base.canChangeStatus && allowed("tasks.changeStatus"),
    canComplete: base.canComplete && allowed("tasks.complete"),
    canReopen: base.canComplete && allowed("tasks.reopen"),
    canDelete: base.canDelete && allowed("tasks.delete"),
    canComment: base.canChangeStatus && allowed("tasks.comment"),
    canAttach: base.canChangeStatus && allowed("tasks.attach"),
    canManageChecklist:
      (base.canChangeStatus || base.canEditContent) && allowed("tasks.checklist"),
    roleLabel: base.roleLabel,
  };
}
