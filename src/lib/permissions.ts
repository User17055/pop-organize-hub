import type { CurrentUser, Department, Employee, Group, PermissionGroup, Task } from "./domain";
import { hasPermission, isAdminUser, resolvePermissionSet } from "./permission-groups";

type PermissionEmployee =
  | Pick<
      Employee,
      | "id"
      | "role"
      | "departmentId"
      | "permissionGroupId"
      | "departmentAccessMode"
      | "visibleDepartmentIds"
    >
  | CurrentUser;

export type TaskPermissions = {
  canEditContent: boolean;
  canChangeStatus: boolean;
  canComplete: boolean;
  canCompleteAnytime: boolean;
  canReopen: boolean;
  canApproveReview: boolean;
  canRejectReview: boolean;
  canDelete: boolean;
  canComment: boolean;
  canAttach: boolean;
  canManageChecklist: boolean;
  canMove: boolean;
  canAssign: boolean;
  canManageRecurrence: boolean;
  reviewManagerId?: string;
  roleLabel: string;
};

type PermissionInput = {
  task: Task;
  currentUser?: PermissionEmployee | null;
  employees: Array<
    Pick<
      Employee,
      | "id"
      | "role"
      | "departmentId"
      | "permissionGroupId"
      | "departmentAccessMode"
      | "visibleDepartmentIds"
    >
  >;
  departments: Array<Pick<Department, "id" | "managerId" | "memberIds">>;
  groups: Array<Pick<Group, "id" | "leaderId" | "memberIds">>;
  permissionGroups?: PermissionGroup[];
};

export function resolveTaskReviewManagerId(input: {
  target: Pick<Task["target"], "type" | "id">;
  responsibleId?: string;
  responsibleIds?: string[];
  employees: Array<Pick<Employee, "id" | "departmentId">>;
  departments: Array<Pick<Department, "id" | "managerId">>;
  groups: Array<Pick<Group, "id" | "leaderId">>;
}) {
  const employeeIds = new Set(input.employees.map((employee) => employee.id));
  const validManager = (id?: string) => (id && employeeIds.has(id) ? id : undefined);
  const departmentManager = (departmentId?: string) =>
    validManager(input.departments.find((department) => department.id === departmentId)?.managerId);
  const employeeManager = (employeeId?: string) => {
    const employee = input.employees.find((item) => item.id === employeeId);
    return departmentManager(employee?.departmentId);
  };

  if (input.target.type === "group") {
    const group = input.groups.find((item) => item.id === input.target.id);
    const leaderId = validManager(group?.leaderId);
    if (leaderId) return leaderId;
  }

  if (input.target.type === "department") {
    const managerId = departmentManager(input.target.id);
    if (managerId) return managerId;
  }

  if (input.target.type === "user") {
    const managerId = employeeManager(input.target.id);
    if (managerId) return managerId;
  }

  const responsibleIds = [input.responsibleId, ...(input.responsibleIds ?? [])].filter(
    (id): id is string => Boolean(id),
  );
  for (const responsibleId of responsibleIds) {
    const managerId = employeeManager(responsibleId);
    if (managerId) return managerId;
  }

  return undefined;
}

export function isReviewManagerCandidateId(input: {
  id?: string;
  employees: Array<Pick<Employee, "id" | "role">>;
  departments: Array<Pick<Department, "managerId">>;
  groups: Array<Pick<Group, "leaderId">>;
}) {
  if (!input.id) return false;
  if (input.departments.some((department) => department.managerId === input.id)) return true;
  if (input.groups.some((group) => group.leaderId === input.id)) return true;
  const employee = input.employees.find((item) => item.id === input.id);
  return Boolean(employee && /gestor|administrador/i.test(employee.role));
}

function effectiveReviewManagerId(input: PermissionInput) {
  if (!input.task.requiresReview) return undefined;
  const automaticManagerId = resolveTaskReviewManagerId({
    target: input.task.target,
    responsibleId: input.task.responsibleId,
    responsibleIds: input.task.responsibleIds,
    employees: input.employees,
    departments: input.departments,
    groups: input.groups,
  });
  if (automaticManagerId) return automaticManagerId;
  return isReviewManagerCandidateId({
    id: input.task.reviewerId,
    employees: input.employees,
    departments: input.departments,
    groups: input.groups,
  })
    ? input.task.reviewerId
    : undefined;
}

function isAdmin(input: PermissionInput) {
  return isAdminUser({
    currentUser: input.currentUser,
    employees: input.employees,
    permissionGroups: input.permissionGroups,
  });
}

export function getManagerDepartmentAccess(input: {
  currentUser?: PermissionEmployee | null;
  employees: PermissionInput["employees"];
  departments: PermissionInput["departments"];
}) {
  const userId = input.currentUser?.id;
  if (!userId) return null;
  const employee = input.employees.find((item) => item.id === userId);
  const role = employee?.role ?? input.currentUser?.role;
  if (role?.toLocaleLowerCase("pt-BR").includes("admin")) return null;

  const managedDepartmentIds = input.departments
    .filter((department) => department.managerId === userId)
    .map((department) => department.id);
  if (managedDepartmentIds.length === 0) return null;

  const mode = employee?.departmentAccessMode ?? "own";
  const departmentIds = new Set(
    [
      employee?.departmentId,
      ...managedDepartmentIds,
      ...(mode === "selected" ? (employee?.visibleDepartmentIds ?? []) : []),
    ].filter((id): id is string => Boolean(id)),
  );
  return { mode, departmentIds };
}

/**
 * Setores que podem ser expostos nas telas de estrutura/equipe.
 *
 * Administradores recebem `null` (sem recorte). Um colaborador comum recebe apenas o setor em
 * que está cadastrado. Um gestor recebe também todos os setores que representa, além dos setores
 * adicionais que um administrador tenha liberado explicitamente.
 */
export function getVisibleDepartmentIds(input: {
  currentUser?: PermissionEmployee | null;
  employees: PermissionInput["employees"];
  departments: PermissionInput["departments"];
  permissionGroups?: PermissionGroup[];
}) {
  const userId = input.currentUser?.id;
  if (!userId) return new Set<string>();
  if (
    isAdminUser({
      currentUser: input.currentUser,
      employees: input.employees,
      permissionGroups: input.permissionGroups,
    })
  ) {
    return null;
  }

  const employee = input.employees.find((item) => item.id === userId);
  const managedDepartmentIds = input.departments
    .filter((department) => department.managerId === userId)
    .map((department) => department.id);
  const isManager = managedDepartmentIds.length > 0;
  const mode = isManager ? (employee?.departmentAccessMode ?? "own") : "own";
  if (mode === "all") return null;

  return new Set(
    [
      employee?.departmentId,
      ...managedDepartmentIds,
      ...(mode === "selected" ? (employee?.visibleDepartmentIds ?? []) : []),
    ].filter((id): id is string => Boolean(id)),
  );
}

/** Grupos de trabalho que podem ser expostos ao usuario atual. */
export function getVisibleGroupIds(input: {
  currentUser?: PermissionEmployee | null;
  employees: PermissionInput["employees"];
  groups: PermissionInput["groups"];
  permissionGroups?: PermissionGroup[];
}) {
  const userId = input.currentUser?.id;
  if (!userId) return new Set<string>();
  if (
    isAdminUser({
      currentUser: input.currentUser,
      employees: input.employees,
      permissionGroups: input.permissionGroups,
    })
  ) {
    return null;
  }
  const permissionSet = resolvePermissionSet({
    currentUser: input.currentUser,
    employees: input.employees,
    permissionGroups: input.permissionGroups ?? [],
  });
  if (hasPermission(permissionSet, "tasks.viewAll")) return null;
  return new Set(
    input.groups
      .filter((group) => group.leaderId === userId || group.memberIds.includes(userId))
      .map((group) => group.id),
  );
}

export function canViewTask(input: PermissionInput) {
  const userId = input.currentUser?.id;
  if (!userId) return false;

  const currentEmployee = input.employees.find((item) => item.id === userId);
  const responsibleIds = new Set(
    [input.task.responsibleId, ...(input.task.responsibleIds ?? [])].filter(Boolean),
  );
  if (isAdmin(input)) return true;

  if (input.permissionGroups) {
    const set = resolvePermissionSet({
      currentUser: input.currentUser,
      employees: input.employees,
      permissionGroups: input.permissionGroups,
    });
    if (hasPermission(set, "tasks.viewAll")) return true;
  }

  const managerAccess = getManagerDepartmentAccess({
    currentUser: input.currentUser,
    employees: input.employees,
    departments: input.departments,
  });
  if (managerAccess?.mode === "all") return true;
  if (managerAccess) {
    if (responsibleIds.has(userId) || effectiveReviewManagerId(input) === userId) return true;
    if (
      [...responsibleIds].some((id) => {
        const responsible = input.employees.find((employee) => employee.id === id);
        return responsible ? managerAccess.departmentIds.has(responsible.departmentId) : false;
      })
    ) {
      return true;
    }
    if (input.task.target.type === "department") {
      return managerAccess.departmentIds.has(input.task.target.id);
    }
    if (input.task.target.type === "user") {
      const targetEmployee = input.employees.find(
        (employee) => employee.id === input.task.target.id,
      );
      return targetEmployee ? managerAccess.departmentIds.has(targetEmployee.departmentId) : false;
    }
    if (input.task.target.type === "group") {
      const group = input.groups.find((item) => item.id === input.task.target.id);
      return (
        group?.leaderId === userId ||
        (responsibleIds.size === 0 && group?.memberIds.includes(userId)) ||
        false
      );
    }
    if (input.task.target.type === "company") return responsibleIds.size === 0;
    return false;
  }

  if (effectiveReviewManagerId(input) === userId) return true;

  if (input.task.responsibleId === userId || (input.task.responsibleIds ?? []).includes(userId)) {
    return true;
  }

  // Tarefa com responsavel individual nao e compartilhada com colegas so porque o destino
  // estrutural e empresa, setor ou grupo. Gestores e revisores autorizados foram tratados acima.
  if (responsibleIds.size > 0) return false;

  if (input.task.target.type === "company") return true;
  if (input.task.target.type === "user") return input.task.target.id === userId;
  if (input.task.target.type === "department") {
    const department = input.departments.find((item) => item.id === input.task.target.id);
    return (
      input.task.target.id === currentEmployee?.departmentId ||
      department?.managerId === userId ||
      department?.memberIds?.includes(userId) ||
      false
    );
  }
  if (input.task.target.type === "group") {
    const group = input.groups.find((item) => item.id === input.task.target.id);
    return group?.leaderId === userId || group?.memberIds.includes(userId) || false;
  }

  return false;
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
  if (!userId || !canViewTask(input)) {
    return {
      canEditContent: false,
      canChangeStatus: false,
      canComplete: false,
      canDelete: false,
      roleLabel: "Sem acesso",
    };
  }

  if (isAdmin(input)) {
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

  if (effectiveReviewManagerId(input) === userId) {
    return {
      canEditContent: false,
      canChangeStatus: true,
      canComplete: true,
      canDelete: false,
      roleLabel: "Revisor",
    };
  }

  const responsibleIds = new Set(
    [input.task.responsibleId, ...(input.task.responsibleIds ?? [])].filter(Boolean),
  );

  if (responsibleIds.has(userId)) {
    return {
      canEditContent: false,
      canChangeStatus: true,
      canComplete: true,
      canDelete: false,
      roleLabel: "Responsável",
    };
  }

  if (responsibleIds.size === 0) {
    const roleLabel =
      input.task.target.type === "company"
        ? "Membro da empresa"
        : input.task.target.type === "department"
          ? "Membro do setor"
          : input.task.target.type === "group"
            ? "Membro do grupo"
            : "Destinatário";
    return {
      canEditContent: false,
      canChangeStatus: true,
      canComplete: true,
      canDelete: false,
      roleLabel,
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
  const reviewManagerId = effectiveReviewManagerId(input);
  const isAssignedReviewer = reviewManagerId === input.currentUser?.id;
  const isAdministrator = isAdmin(input);
  const canManageReview = isAssignedReviewer || isAdministrator;
  const isWaitingReview = input.task.status === "waiting_review";

  const set = resolvePermissionSet({
    currentUser: input.currentUser,
    employees: input.employees,
    permissionGroups: input.permissionGroups ?? [],
  });
  const allowed = input.permissionGroups
    ? (key: Parameters<typeof hasPermission>[1]) => hasPermission(set, key)
    : () => true;

  const canComplete = base.canComplete && allowed("tasks.complete");
  const canCompleteAnytime = isAdministrator && allowed("tasks.completeAnytime");
  const canReopen = base.canComplete && allowed("tasks.reopen");

  return {
    canEditContent: base.canEditContent && allowed("tasks.edit"),
    canChangeStatus:
      base.canChangeStatus &&
      allowed("tasks.changeStatus") &&
      (!isWaitingReview || canManageReview),
    canComplete: canComplete && (!isWaitingReview || canManageReview),
    canCompleteAnytime,
    canReopen: canReopen && (!isWaitingReview || canManageReview),
    canApproveReview: isWaitingReview && canManageReview && canComplete,
    canRejectReview: isWaitingReview && canManageReview && canReopen,
    canDelete: base.canDelete && allowed("tasks.delete"),
    canComment: base.canChangeStatus && allowed("tasks.comment"),
    canAttach: base.canChangeStatus && allowed("tasks.attach"),
    canManageChecklist: (base.canChangeStatus || base.canEditContent) && allowed("tasks.checklist"),
    canMove: base.canEditContent && allowed("tasks.move"),
    canAssign: base.canEditContent && allowed("tasks.assign"),
    canManageRecurrence: base.canEditContent && allowed("tasks.recurrence"),
    reviewManagerId,
    roleLabel: base.roleLabel,
  };
}
