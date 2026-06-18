import type { CurrentUser, Department, Employee, Group, Task } from "./domain";

type PermissionEmployee = Pick<Employee, "id" | "role" | "departmentId"> | CurrentUser;

export type TaskPermissions = {
  canEditContent: boolean;
  canChangeStatus: boolean;
  canComplete: boolean;
  canDelete: boolean;
  roleLabel: string;
};

type PermissionInput = {
  task: Task;
  currentUser?: PermissionEmployee | null;
  employees: Array<Pick<Employee, "id" | "role" | "departmentId">>;
  departments: Array<Pick<Department, "id" | "managerId">>;
  groups: Array<Pick<Group, "id" | "leaderId">>;
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

export function getTaskPermissions(input: PermissionInput): TaskPermissions {
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
