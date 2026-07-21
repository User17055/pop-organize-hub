import type {
  Company,
  CurrentUser,
  Department,
  Employee,
  Group,
  PermissionGroup,
  Task,
} from "./domain";
import { canViewTask } from "./permissions";

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

export function sanitizeDatabase(
  db: Database,
  currentUserId: string,
  workspaces: PlatformDatabase["workspaces"] = [db],
) {
  const employees = db.employees.map(withoutPassword);
  const currentEmployee = employees.find((employee) => employee.id === currentUserId);
  if (!currentEmployee) {
    throw Object.assign(new Error("Usuário da sessão não encontrado."), { statusCode: 401 });
  }
  const visibleTasks = db.tasks.filter((task) =>
    canViewTask({
      task,
      currentUser: currentEmployee,
      employees,
      departments: db.departments,
      groups: db.groups,
      permissionGroups: db.permissionGroups,
    }),
  );

  return {
    accessMode: db.accessMode,
    company: db.company,
    currentUser: toCurrentUser(currentEmployee),
    departments: db.departments,
    employees,
    groups: db.groups,
    tasks: visibleTasks,
    permissionGroups: db.permissionGroups,
    invitations: db.invitations.map(({ tokenHash, ...invitation }) => invitation),
    workspaces: workspaces
      .filter((workspace) =>
        workspace.employees.some(
          (employee) => employee.id === currentUserId && employee.status === "active",
        ),
      )
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
