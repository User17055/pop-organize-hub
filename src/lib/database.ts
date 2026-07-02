import type {
  Company,
  CurrentUser,
  Department,
  Employee,
  Group,
  PermissionGroup,
  Task,
} from "./domain";

export const DEMO_PASSWORD = "demo1234";

export type EmployeeRecord = Employee & {
  passwordHash: string;
};

export type SessionRecord = {
  id: string;
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

export type Database = {
  company: Company;
  employees: EmployeeRecord[];
  departments: Department[];
  groups: Group[];
  tasks: Task[];
  permissionGroups: PermissionGroup[];
  sessions: SessionRecord[];
};

export function withoutPassword(employee: EmployeeRecord): Employee {
  const { passwordHash, ...safeEmployee } = employee;
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

export function sanitizeDatabase(db: Database, currentUserId = "u3") {
  const employees = db.employees.map(withoutPassword);
  const currentEmployee =
    employees.find((employee) => employee.id === currentUserId) ?? employees[0];
  return {
    company: db.company,
    currentUser: toCurrentUser(currentEmployee),
    departments: db.departments,
    employees,
    groups: db.groups,
    tasks: db.tasks,
    permissionGroups: db.permissionGroups,
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
