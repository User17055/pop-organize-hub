import type { CurrentUser, Department, Employee, Group } from "./domain";

export type AccessLevel = "collaborator" | "manager" | "admin";

const LEVEL_RANK: Record<AccessLevel, number> = {
  collaborator: 0,
  manager: 1,
  admin: 2,
};

export function meetsAccess(level: AccessLevel, required: AccessLevel) {
  return LEVEL_RANK[level] >= LEVEL_RANK[required];
}

export function getAccessLevel(input: {
  currentUser?: CurrentUser | Pick<Employee, "id" | "role"> | null;
  departments: Array<Pick<Department, "managerId">>;
  groups: Array<Pick<Group, "leaderId">>;
}): AccessLevel {
  const userId = input.currentUser?.id;
  if (!userId) return "collaborator";

  if (input.currentUser?.role?.toLowerCase().includes("admin")) return "admin";

  const managesDepartment = input.departments.some((department) => department.managerId === userId);
  const leadsGroup = input.groups.some((group) => group.leaderId === userId);
  if (managesDepartment || leadsGroup) return "manager";

  return "collaborator";
}

export const accessLevelLabels: Record<AccessLevel, string> = {
  admin: "Admin da empresa",
  manager: "Gestor",
  collaborator: "Colaborador",
};
