import type {
  Company,
  CurrentUser,
  Department,
  Employee,
  Group,
  PermissionGroup,
  Task,
  TaskFolder,
  TaskListDefinition,
} from "./domain";
import { canViewTask, getVisibleDepartmentIds } from "./permissions";

export type EmployeeRecord = Employee & {
  passwordHash: string;
  googleSubject?: string;
};

export type AccountRecord = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  passwordHash: string;
  googleSubject?: string;
  appleSubject?: string;
  emailVerifiedAt?: string;
  createdAt: string;
};

export type EmailChallengeRecord = {
  id: string;
  email: string;
  codeHash: string;
  attempts: number;
  createdAt: string;
  expiresAt: string;
  consumedAt?: string;
};

export type SessionRecord = {
  id: string;
  tokenHash: string;
  userId: string;
  activeCompanyId: string;
  createdAt: string;
  expiresAt: string;
};

export type InvitationRecord = {
  id: string;
  tokenHash: string;
  name: string;
  email: string;
  role: string;
  departmentId: string;
  status: "active" | "inactive";
  permissionGroupId?: string;
  groupIds?: string[];
  invitedById: string;
  createdAt: string;
  expiresAt: string;
};

export type Database = {
  accessMode: "personal" | "team";
  company: Company;
  employees: EmployeeRecord[];
  departments: Department[];
  groups: Group[];
  tasks: Task[];
  taskFolders: TaskFolder[];
  taskLists: TaskListDefinition[];
  permissionGroups: PermissionGroup[];
  sessions: SessionRecord[];
  invitations: InvitationRecord[];
};

export type PlatformDatabase = {
  version: 2;
  accounts: AccountRecord[];
  workspaces: Database[];
  sessions: SessionRecord[];
  emailChallenges: EmailChallengeRecord[];
};

type TaskWithNativeAssignment = Task & {
  nativeData?: {
    assignmentTargetId?: string;
    assignees?: string[];
    [key: string]: unknown;
  };
};

/**
 * Convites usam um id provisório enquanto a pessoa ainda não possui vínculo
 * com a empresa. Ao aceitar, todas as referências passam para o id real da
 * conta para que as tarefas já atribuídas apareçam imediatamente.
 */
export function transferInvitationAssignments(
  workspace: Database,
  invitationId: string,
  employeeId: string,
) {
  for (const rawTask of workspace.tasks) {
    const task = rawTask as TaskWithNativeAssignment;
    if (task.target.type === "user" && task.target.id === invitationId) {
      task.target.id = employeeId;
    }
    if (task.responsibleId === invitationId) task.responsibleId = employeeId;
    if (task.responsibleIds?.includes(invitationId)) {
      task.responsibleIds = Array.from(
        new Set(task.responsibleIds.map((id) => (id === invitationId ? employeeId : id))),
      );
    }
    if (task.reviewerId === invitationId) task.reviewerId = employeeId;
    if (task.nativeData?.assignmentTargetId === invitationId) {
      task.nativeData.assignmentTargetId = employeeId;
    }
  }
}

export function withoutPassword(employee: EmployeeRecord): Employee {
  const { passwordHash, googleSubject, ...safeEmployee } = employee;
  return safeEmployee;
}

export function toCurrentUser(employee: Employee): CurrentUser {
  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    role: employee.role,
  };
}

export function formatDepartmentName(name: string) {
  const normalized = name.trim().toLocaleLowerCase("pt-BR");
  return normalized ? normalized[0]!.toLocaleUpperCase("pt-BR") + normalized.slice(1) : "";
}

export function sanitizeDatabase(
  db: Database,
  currentUserId: string,
  workspaces: PlatformDatabase["workspaces"] = [db],
) {
  const allEmployees =
    db.company.kind === "personal"
      ? db.employees.filter((employee) => employee.id === currentUserId).map(withoutPassword)
      : db.employees.map(withoutPassword);
  const currentEmployee = allEmployees.find((employee) => employee.id === currentUserId);
  if (!currentEmployee) {
    throw Object.assign(new Error("Usuário da sessão não encontrado."), { statusCode: 401 });
  }
  const visibleDepartmentIds = getVisibleDepartmentIds({
    currentUser: currentEmployee,
    employees: allEmployees,
    departments: db.departments,
    permissionGroups: db.permissionGroups,
  });
  const employees = visibleDepartmentIds
    ? allEmployees.filter(
        (employee) =>
          employee.id === currentUserId || visibleDepartmentIds.has(employee.departmentId),
      )
    : allEmployees;
  const departmentNames = new Map(
    db.departments.map((department) => [department.id, formatDepartmentName(department.name)]),
  );
  const employeeNames = new Map(db.employees.map((employee) => [employee.id, employee.name]));
  for (const invitation of db.invitations) employeeNames.set(invitation.id, invitation.name);
  const groupNames = new Map(db.groups.map((group) => [group.id, group.name]));
  const departments = db.departments
    .filter((department) => !visibleDepartmentIds || visibleDepartmentIds.has(department.id))
    .map((department) => ({
      ...department,
      name: departmentNames.get(department.id)!,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR", { sensitivity: "base" }));
  const visibleTasks = db.tasks
    .filter((task) =>
      canViewTask({
        task,
        currentUser: currentEmployee,
        employees: allEmployees,
        departments: db.departments,
        groups: db.groups,
        permissionGroups: db.permissionGroups,
      }),
    )
    .map((task) => {
      const label =
        task.target.type === "department"
          ? (departmentNames.get(task.target.id) ?? formatDepartmentName(task.target.label))
          : task.target.type === "user"
            ? (employeeNames.get(task.target.id) ?? task.target.label)
            : task.target.type === "group"
              ? (groupNames.get(task.target.id) ?? task.target.label)
              : db.company.name;
      return { ...task, target: { ...task.target, label } };
    });

  return {
    accessMode: db.accessMode,
    company: db.company,
    currentUser: toCurrentUser(currentEmployee),
    departments,
    employees,
    groups: db.groups,
    tasks: visibleTasks,
    taskFolders: (db.taskFolders ?? [])
      .filter((folder) => folder.ownerId === currentUserId)
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "pt-BR")),
    taskLists: (db.taskLists ?? [])
      .filter((list) => list.ownerId === currentUserId)
      .map((list) => ({
        ...list,
        taskIds: list.taskIds.filter((taskId) => visibleTasks.some((task) => task.id === taskId)),
      }))
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "pt-BR")),
    permissionGroups: db.permissionGroups,
    invitations:
      db.company.kind === "personal"
        ? []
        : db.invitations
            .filter(
              (invitation) =>
                !visibleDepartmentIds || visibleDepartmentIds.has(invitation.departmentId),
            )
            .map(({ tokenHash, ...invitation }) => invitation),
    workspaces: workspaces
      .filter((workspace) => {
        if (workspace.company.kind === "personal") {
          return workspace.company.ownerId === currentUserId;
        }
        return workspace.employees.some(
          (employee) => employee.id === currentUserId && employee.status === "active",
        );
      })
      .map((workspace) => {
        const membership = workspace.employees.find((employee) => employee.id === currentUserId)!;
        return {
          id: workspace.company.id,
          name: workspace.company.name,
          description: workspace.company.description,
          kind: workspace.company.kind ?? "company",
          isOwner: workspace.company.ownerId === currentUserId,
          role: membership.role,
        };
      })
      .sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "personal" ? -1 : 1;
        return a.name.localeCompare(b.name, "pt-BR");
      }),
    canLeaveCompany:
      (db.company.kind ?? "company") === "company" && db.company.ownerId !== currentUserId,
  };
}

export function nextId(prefix: string, items: Array<{ id: string }>) {
  const max = items.reduce((current, item) => {
    const match = item.id.match(new RegExp(`^${prefix}(\\d+)$`));
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);
  return `${prefix}${max + 1}`;
}

export function defaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
