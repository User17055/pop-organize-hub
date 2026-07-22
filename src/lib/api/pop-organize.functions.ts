import { createServerFn } from "@tanstack/react-start";
import {
  deleteCookie,
  getCookie,
  getRequestHeader,
  getRequestIP,
  getRequestProtocol,
  setCookie,
} from "@tanstack/react-start/server";
import { z } from "zod";

import {
  defaultDueDate,
  nextId,
  sanitizeDatabase,
  today,
  toCurrentUser,
  type AccountRecord,
  type Database,
  type PlatformDatabase,
  type SessionRecord,
  withoutPassword,
} from "../database";
import {
  allPermissionKeys,
  departmentColors,
  type PermissionKey,
  type Task,
  type TargetType,
} from "../domain";
import { hasPermission, isAdminUser, resolvePermissionSet } from "../permission-groups";
import { getTaskPermissions } from "../permissions";

const SESSION_COOKIE = "pop_organize_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const INVITATION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPT_MAP_LIMIT = 5_000;

type LoginAttempt = { count: number; resetAt: number };
const loginAttempts = new Map<string, LoginAttempt>();

const prioritySchema = z.enum(["low", "medium", "high", "urgent"]);
const statusSchema = z.enum([
  "pending",
  "in_progress",
  "waiting_review",
  "reopened",
  "completed",
  "canceled",
]);
const targetSchema = z.object({
  type: z.enum(["company", "department", "group", "user"]),
  id: z.string().min(1),
});
const recurrenceSchema = z
  .object({
    frequency: z
      .enum(["none", "daily", "weekly", "biweekly", "monthly", "yearly", "custom"])
      .default("none"),
    interval: z.coerce.number().int().min(1).max(120).optional(),
    intervalDays: z.coerce.number().int().min(1).max(3650).optional(),
    customUnit: z.enum(["days", "weeks", "months", "years"]).optional(),
    dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
    monthOfYear: z.coerce.number().int().min(1).max(12).optional(),
    endDate: z
      .union([z.literal(""), z.string().min(10)])
      .optional()
      .transform((value) => value || undefined),
  })
  .optional()
  .superRefine((value, ctx) => {
    if (value?.frequency === "custom" && !value.interval && !value.intervalDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o intervalo personalizado.",
        path: ["interval"],
      });
    }
  });

const createTaskSchema = z.object({
  title: z.string().trim().min(3, "Informe um título"),
  description: z.string().trim().min(3, "Informe uma descrição"),
  priority: prioritySchema.default("medium"),
  dueDate: z.string().min(10).default(defaultDueDate()),
  target: targetSchema,
  responsibleId: z.string().default(""),
  reviewerId: z.string().optional(),
  requiresReview: z.boolean().default(false),
  tags: z.array(z.string().trim().min(1)).default([]),
  recurrence: recurrenceSchema,
});

const createDepartmentSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().min(3),
  managerId: z.string().min(1),
  color: z.string().min(3).optional(),
});

const createEmployeeSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  role: z.string().trim().min(2),
  departmentId: z.string().min(1),
  status: z.enum(["active", "inactive"]).default("active"),
  permissionGroupId: z
    .union([z.literal(""), z.string().min(1)])
    .optional()
    .transform((value) => value || undefined),
});

const resendEmployeeInvitationSchema = z.object({
  id: z.string().min(1, "Convite inválido."),
});

const acceptInvitationSchema = z.object({
  token: z.string().min(20, "Convite inválido."),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});

const permissionKeySchema = z.enum(allPermissionKeys as [PermissionKey, ...PermissionKey[]]);

const createPermissionGroupSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome"),
  description: z.string().trim().max(200).default(""),
  permissions: z.array(permissionKeySchema).default([]),
  memberIds: z.array(z.string().min(1)).default([]),
});

const updatePermissionGroupSchema = createPermissionGroupSchema.extend({
  id: z.string().min(1),
});

const deletePermissionGroupSchema = z.object({
  id: z.string().min(1),
});

const createGroupSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().min(3),
  leaderId: z
    .union([z.literal(""), z.string().min(1)])
    .optional()
    .transform((value) => value || undefined),
  memberIds: z.array(z.string().min(1)).default([]),
});

const updateCompanySchema = z.object({
  name: z.string().trim().min(2),
  document: z.string().trim().min(8),
  status: z.enum(["active", "inactive"]).default("active"),
});

const updateTaskStatusSchema = z.object({
  id: z.string().min(1),
  status: statusSchema,
});

const updateTaskDetailsSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(3, "Informe um título"),
  description: z.string().trim().min(3, "Informe uma descrição"),
  priority: prioritySchema,
  dueDate: z.string().min(10),
  tags: z.array(z.string().trim().min(1)).default([]),
  recurrence: recurrenceSchema,
});

const deleteTaskSchema = z.object({
  id: z.string().min(1),
});

const addTaskCommentSchema = z.object({
  taskId: z.string().min(1),
  body: z.string().trim().min(1, "Escreva um comentário").max(1000),
});

const addTaskAttachmentSchema = z.object({
  taskId: z.string().min(1),
  name: z.string().trim().min(1, "Informe o nome do anexo").max(120),
  sizeLabel: z.string().trim().max(40).optional(),
});

const addTaskSubtaskSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().trim().min(1, "Informe o item").max(200),
});

const toggleTaskSubtaskSchema = z.object({
  taskId: z.string().min(1),
  subtaskId: z.string().min(1),
  done: z.boolean(),
});

const updateTaskSubtaskSchema = z.object({
  taskId: z.string().min(1),
  subtaskId: z.string().min(1),
  title: z.string().trim().min(1, "Informe o item").max(200),
});

const deleteTaskSubtaskSchema = z.object({
  taskId: z.string().min(1),
  subtaskId: z.string().min(1),
});

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome"),
    avatar: z
      .string()
      .trim()
      .max(200_000)
      .optional()
      .transform((value) => value || undefined),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, "A nova senha deve ter pelo menos 8 caracteres").optional(),
  })
  .refine((data) => !data.newPassword || Boolean(data.currentPassword), {
    message: "Informe a senha atual.",
    path: ["currentPassword"],
  });

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const googleLoginSchema = z.object({
  credential: z.string().min(20, "Credencial do Google inválida."),
});

const emailCodeRequestSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
});

const emailCodeLoginSchema = emailCodeRequestSchema.extend({
  code: z.string().regex(/^\d{6}$/, "Digite os 6 números do código."),
});

function createHttpError(message: string, status = 400) {
  return Object.assign(new Error(message), { statusCode: status });
}

function getLoginRateLimitKey(email: string) {
  const ip = getRequestHeader("x-real-ip") || getRequestIP() || "unknown";
  return `${ip}:${email}`;
}

function assertLoginAllowed(key: string) {
  const now = Date.now();
  const attempt = loginAttempts.get(key);
  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.delete(key);
    return;
  }
  if (attempt.count >= LOGIN_ATTEMPT_LIMIT) {
    throw createHttpError("Muitas tentativas. Aguarde 15 minutos e tente novamente.", 429);
  }
}

function recordFailedLogin(key: string) {
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_ATTEMPT_WINDOW_MS });
  } else {
    current.count += 1;
  }

  if (loginAttempts.size > LOGIN_ATTEMPT_MAP_LIMIT) {
    for (const [attemptKey, attempt] of loginAttempts) {
      if (attempt.resetAt <= now) loginAttempts.delete(attemptKey);
    }
    while (loginAttempts.size > LOGIN_ATTEMPT_MAP_LIMIT) {
      const oldestKey = loginAttempts.keys().next().value;
      if (!oldestKey) break;
      loginAttempts.delete(oldestKey);
    }
  }
}

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: getRequestProtocol() === "https",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

function getApplicationOrigin() {
  const configuredOrigin = process.env.APP_URL?.trim();
  if (configuredOrigin) {
    try {
      return new URL(configuredOrigin).origin;
    } catch {
      throw createHttpError("APP_URL possui um endereço inválido.", 500);
    }
  }

  if (process.env.NODE_ENV === "production") return "https://app.poporganize.com.br";

  const forwardedHost = getRequestHeader("x-forwarded-host")?.split(",")[0]?.trim();
  const requestHost = forwardedHost || getRequestHeader("host")?.trim();
  const safeHost = requestHost && /^[a-z0-9.-]+(?::\d+)?$/i.test(requestHost)
    ? requestHost
    : "localhost:8080";
  return `${getRequestProtocol()}://${safeHost}`;
}

async function dbServer() {
  return import("../database.server");
}

type SessionContext = {
  account: AccountRecord;
  session?: SessionRecord;
  workspace: Database;
};

function resolveSessionContext(
  platform: PlatformDatabase,
  tokenHash?: string,
): SessionContext | null {
  const now = Date.now();
  const session = tokenHash
    ? platform.sessions.find(
        (item) => item.tokenHash === tokenHash && new Date(item.expiresAt).getTime() > now,
      )
    : undefined;
  const account = session
    ? platform.accounts.find((item) => item.id === session.userId)
    : !import.meta.env.PROD
      ? platform.accounts[0]
      : undefined;
  if (!account) return null;

  const preferredWorkspaceId = session?.activeCompanyId;
  const workspace =
    platform.workspaces.find(
      (item) =>
        item.company.id === preferredWorkspaceId &&
        item.employees.some(
          (employee) => employee.id === account.id && employee.status === "active",
        ),
    ) ??
    platform.workspaces.find(
      (item) =>
        item.company.kind === "personal" &&
        item.company.ownerId === account.id &&
        item.employees.some((employee) => employee.id === account.id),
    );
  return workspace ? { account, session, workspace } : null;
}

async function getSessionTokenHash() {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return undefined;
  const { hashToken } = await dbServer();
  return hashToken(token);
}

async function readSessionContext() {
  const { readDatabase } = await dbServer();
  const platform = await readDatabase();
  const context = resolveSessionContext(platform, await getSessionTokenHash());
  return { platform, context };
}

async function requireSessionContext() {
  const result = await readSessionContext();
  if (!result.context) throw createHttpError("Sessão expirada. Faça login novamente.", 401);
  return { platform: result.platform, ...result.context };
}

async function mutateCurrentWorkspace<T>(
  mutator: (
    workspace: Database,
    currentUserId: string,
    platform: PlatformDatabase,
    context: SessionContext,
  ) => T | Promise<T>,
) {
  const tokenHash = await getSessionTokenHash();
  const { mutateDatabase } = await dbServer();
  return mutateDatabase((platform) => {
    const context = resolveSessionContext(platform, tokenHash);
    if (!context) throw createHttpError("Sessão expirada. Faça login novamente.", 401);
    return mutator(context.workspace, context.account.id, platform, context);
  });
}

function resolveTargetLabel(type: TargetType, id: string, db: Database) {
  if (type === "company" && db.company.id === id) return "Empresa inteira";
  if (type === "department") return db.departments.find((department) => department.id === id)?.name;
  if (type === "group") return db.groups.find((group) => group.id === id)?.name;
  if (type === "user") return db.employees.find((employee) => employee.id === id)?.name;
  return undefined;
}

function normalizeRecurrence(value: z.infer<typeof recurrenceSchema>): Task["recurrence"] {
  if (!value || value.frequency === "none") return undefined;

  const customUnit = value.frequency === "custom" ? (value.customUnit ?? "days") : undefined;
  const interval =
    value.frequency === "custom" ? (value.interval ?? value.intervalDays ?? 1) : undefined;
  const usesMonthlyAnchor =
    value.frequency === "monthly" ||
    value.frequency === "yearly" ||
    (value.frequency === "custom" && (customUnit === "months" || customUnit === "years"));
  const usesYearlyAnchor =
    value.frequency === "yearly" || (value.frequency === "custom" && customUnit === "years");

  return {
    frequency: value.frequency,
    interval,
    intervalDays: value.frequency === "custom" && customUnit === "days" ? interval : undefined,
    customUnit,
    dayOfMonth: usesMonthlyAnchor ? value.dayOfMonth : undefined,
    monthOfYear: usesYearlyAnchor ? value.monthOfYear : undefined,
    endDate: value.endDate,
  };
}

function getDateParts(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  return { year, month, day };
}

function dateString(year: number, month: number, day: number) {
  const lastDay = new Date(year, month, 0).getDate();
  const date = new Date(year, month - 1, Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(dateValue: string, months: number, preferredDay?: number) {
  const { year, month, day } = getDateParts(dateValue);
  const target = new Date(year, month - 1 + months, 1);
  return dateString(target.getFullYear(), target.getMonth() + 1, preferredDay ?? day);
}

function addYears(
  dateValue: string,
  years: number,
  preferredMonth?: number,
  preferredDay?: number,
) {
  const { year, month, day } = getDateParts(dateValue);
  return dateString(year + years, preferredMonth ?? month, preferredDay ?? day);
}

function advanceRecurringDueDate(date: string, recurrence: NonNullable<Task["recurrence"]>) {
  return recurrence.frequency === "daily"
    ? addDays(date, 1)
    : recurrence.frequency === "weekly"
      ? addDays(date, 7)
      : recurrence.frequency === "biweekly"
        ? addDays(date, 14)
        : recurrence.frequency === "monthly"
          ? addMonths(date, 1, recurrence.dayOfMonth)
          : recurrence.frequency === "yearly"
            ? addYears(date, 1, recurrence.monthOfYear, recurrence.dayOfMonth)
            : recurrence.customUnit === "weeks"
              ? addDays(date, (recurrence.interval ?? recurrence.intervalDays ?? 1) * 7)
              : recurrence.customUnit === "months"
                ? addMonths(date, recurrence.interval ?? 1, recurrence.dayOfMonth)
                : recurrence.customUnit === "years"
                  ? addYears(
                      date,
                      recurrence.interval ?? 1,
                      recurrence.monthOfYear,
                      recurrence.dayOfMonth,
                    )
                  : addDays(date, recurrence.interval ?? recurrence.intervalDays ?? 1);
}

function getNextRecurringDueDate(task: Task) {
  if (!task.recurrence) return null;

  const { recurrence } = task;
  const currentDate = today();
  let nextDueDate = advanceRecurringDueDate(task.dueDate, recurrence);
  let skippedDates = 0;
  while (nextDueDate <= currentDate && skippedDates < 10_000) {
    nextDueDate = advanceRecurringDueDate(nextDueDate, recurrence);
    skippedDates += 1;
  }
  if (nextDueDate <= currentDate) return null;

  if (recurrence.endDate && nextDueDate > recurrence.endDate) return null;
  return nextDueDate;
}

function createNextRecurringTask(db: Database, task: Task) {
  const nextDueDate = getNextRecurringDueDate(task);
  if (!nextDueDate) return;

  db.tasks.unshift({
    id: nextId("t", db.tasks),
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: "pending",
    dueDate: nextDueDate,
    createdAt: today(),
    target: task.target,
    responsibleId: task.responsibleId,
    reviewerId: task.reviewerId,
    requiresReview: task.requiresReview,
    tags: task.tags,
    comments: 0,
    attachments: 0,
    recurrence: task.recurrence,
    recurrenceParentId: task.recurrenceParentId ?? task.id,
    recurrenceOccurrence: (task.recurrenceOccurrence ?? 1) + 1,
    subtasks: [],
  });
}

function getTaskWithPermissions(db: Database, taskId: string, currentUserId: string) {
  const task = db.tasks.find((item) => item.id === taskId);
  if (!task) throw createHttpError("Tarefa não encontrada.", 404);

  const currentUser = db.employees.find((employee) => employee.id === currentUserId);
  const permissions = getTaskPermissions({
    task,
    currentUser,
    employees: db.employees,
    departments: db.departments,
    groups: db.groups,
    permissionGroups: db.permissionGroups,
  });

  return { task, permissions };
}

function requireGroupPermission(
  db: Database,
  currentUserId: string,
  key: PermissionKey,
  message: string,
) {
  const currentUser = db.employees.find((employee) => employee.id === currentUserId);
  const set = resolvePermissionSet({
    currentUser,
    employees: db.employees,
    permissionGroups: db.permissionGroups,
  });
  if (!hasPermission(set, key)) throw createHttpError(message, 403);
}

function requireAdmin(db: Database, currentUserId: string) {
  const currentUser = db.employees.find((employee) => employee.id === currentUserId);
  if (!isAdminUser({ currentUser, employees: db.employees })) {
    throw createHttpError("Apenas administradores podem gerenciar grupos de permissão.", 403);
  }
}

export const getWorkspaceData = createServerFn({ method: "GET" }).handler(async () => {
  const { platform, account, workspace } = await requireSessionContext();
  return sanitizeDatabase(workspace, account.id, platform.workspaces);
});

const createCompanySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa"),
  description: z.string().trim().max(160, "Use no máximo 160 caracteres").default(""),
  document: z.string().trim().max(30).default(""),
});

const switchWorkspaceSchema = z.object({
  companyId: z.string().min(1),
});

export const createCompany = createServerFn({ method: "POST" })
  .validator((data) => createCompanySchema.parse(data))
  .handler(async ({ data }) => {
    const tokenHash = await getSessionTokenHash();
    const { createCompanyWorkspace, mutateDatabase, nextCompanyId } = await dbServer();
    return mutateDatabase((platform) => {
      const context = resolveSessionContext(platform, tokenHash);
      if (!context) throw createHttpError("Sessão expirada. Faça login novamente.", 401);

      const normalizedName = data.name.toLocaleLowerCase("pt-BR");
      if (
        platform.workspaces.some(
          (workspace) =>
            workspace.company.ownerId === context.account.id &&
            workspace.company.kind === "company" &&
            workspace.company.name.toLocaleLowerCase("pt-BR") === normalizedName,
        )
      ) {
        throw createHttpError("Você já possui uma empresa com este nome.");
      }

      const workspace = createCompanyWorkspace(context.account, {
        id: nextCompanyId(platform),
        name: data.name,
        description: data.description || undefined,
        document: data.document,
      });
      platform.workspaces.push(workspace);
      if (context.session) context.session.activeCompanyId = workspace.company.id;
      return { ok: true, company: workspace.company };
    });
  });

export const switchWorkspace = createServerFn({ method: "POST" })
  .validator((data) => switchWorkspaceSchema.parse(data))
  .handler(async ({ data }) => {
    const tokenHash = await getSessionTokenHash();
    if (!tokenHash) throw createHttpError("Faça login para trocar de espaço.", 401);
    const { mutateDatabase } = await dbServer();
    return mutateDatabase((platform) => {
      const session = platform.sessions.find((item) => item.tokenHash === tokenHash);
      if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
        throw createHttpError("Sessão expirada. Faça login novamente.", 401);
      }
      const workspace = platform.workspaces.find(
        (item) =>
          item.company.id === data.companyId &&
          item.employees.some(
            (employee) => employee.id === session.userId && employee.status === "active",
          ),
      );
      if (!workspace) throw createHttpError("Você não participa deste espaço.", 403);
      session.activeCompanyId = workspace.company.id;
      return { ok: true, companyId: workspace.company.id };
    });
  });

export const leaveCompany = createServerFn({ method: "POST" }).handler(async () => {
  const tokenHash = await getSessionTokenHash();
  const { mutateDatabase } = await dbServer();
  return mutateDatabase((platform) => {
    const context = resolveSessionContext(platform, tokenHash);
    if (!context?.session) throw createHttpError("Sessão expirada. Faça login novamente.", 401);
    const { workspace, account, session } = context;
    if (workspace.company.kind === "personal") {
      throw createHttpError("Não é possível sair do seu espaço pessoal.");
    }
    if (workspace.company.ownerId === account.id) {
      throw createHttpError("O dono precisa transferir a empresa antes de sair.");
    }
    const ownerId = workspace.company.ownerId;
    const owner = workspace.employees.find((employee) => employee.id === ownerId);
    if (!owner) throw createHttpError("Dono da empresa não encontrado.", 409);

    for (const task of workspace.tasks) {
      if (task.responsibleId === account.id) task.responsibleId = owner.id;
      if (task.reviewerId === account.id) task.reviewerId = owner.id;
      if (task.target.type === "user" && task.target.id === account.id) {
        task.target = {
          type: "company",
          id: workspace.company.id,
          label: "Empresa inteira",
        };
      }
    }
    for (const department of workspace.departments) {
      if (department.managerId === account.id) department.managerId = owner.id;
    }
    for (const group of workspace.groups) {
      group.memberIds = group.memberIds.filter((id) => id !== account.id);
      if (group.leaderId === account.id) group.leaderId = owner.id;
    }
    workspace.employees = workspace.employees.filter((employee) => employee.id !== account.id);

    const personalWorkspace = platform.workspaces.find(
      (item) => item.company.kind === "personal" && item.company.ownerId === account.id,
    );
    if (!personalWorkspace) throw createHttpError("Espaço pessoal não encontrado.", 409);
    session.activeCompanyId = personalWorkspace.company.id;
    return { ok: true, companyId: personalWorkspace.company.id };
  });
});

export const getSessionUser = createServerFn({ method: "GET" }).handler(async () => {
  const { context } = await readSessionContext();
  if (!context) return null;
  const employee = context.workspace.employees.find((item) => item.id === context.account.id);
  return employee ? toCurrentUser(employee) : null;
});

export const login = createServerFn({ method: "POST" })
  .validator((data) => loginSchema.parse(data))
  .handler(async ({ data }) => {
    const {
      createSessionToken,
      hashPassword,
      hashToken,
      mutateDatabase,
      passwordHashNeedsUpgrade,
      readDatabase,
      verifyPassword,
    } = await dbServer();
    const email = data.email.toLowerCase();
    const rateLimitKey = getLoginRateLimitKey(email);
    assertLoginAllowed(rateLimitKey);

    const snapshot = await readDatabase();
    const snapshotAccount = snapshot.accounts.find((item) => item.email.toLowerCase() === email);
    const passwordMatches = snapshotAccount
      ? await verifyPassword(data.password, snapshotAccount.passwordHash)
      : false;
    if (!snapshotAccount || !passwordMatches) {
      recordFailedLogin(rateLimitKey);
      throw createHttpError("E-mail ou senha inválidos.", 401);
    }

    const upgradedHash = passwordHashNeedsUpgrade(snapshotAccount.passwordHash)
      ? await hashPassword(data.password)
      : undefined;
    const token = createSessionToken();
    const user = await mutateDatabase((platform) => {
      const account = platform.accounts.find((item) => item.id === snapshotAccount.id);
      if (!account || account.passwordHash !== snapshotAccount.passwordHash) {
        throw createHttpError("E-mail ou senha inválidos.", 401);
      }

      if (upgradedHash) {
        account.passwordHash = upgradedHash;
        for (const workspace of platform.workspaces) {
          const employee = workspace.employees.find((item) => item.id === account.id);
          if (employee) employee.passwordHash = upgradedHash;
        }
      }

      const activeWorkspace =
        platform.workspaces.find(
          (workspace) =>
            workspace.company.kind === "personal" && workspace.company.ownerId === account.id,
        ) ??
        platform.workspaces.find((workspace) =>
          workspace.employees.some(
            (employee) => employee.id === account.id && employee.status === "active",
          ),
        );
      const employee = activeWorkspace?.employees.find((item) => item.id === account.id);
      if (!activeWorkspace || !employee) throw createHttpError("Conta sem espaço disponível.", 409);

      platform.sessions.push({
        id: nextId("s", platform.sessions),
        tokenHash: hashToken(token),
        userId: account.id,
        activeCompanyId: activeWorkspace.company.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString(),
      });

      return toCurrentUser(employee);
    });

    loginAttempts.delete(rateLimitKey);
    setCookie(SESSION_COOKIE, token, getCookieOptions());
    return { ok: true, user };
  });

export const loginWithGoogle = createServerFn({ method: "POST" })
  .validator((data) => googleLoginSchema.parse(data))
  .handler(async ({ data }) => {
    const {
      createPersonalWorkspace,
      verifyGoogleCredential,
      mutateDatabase,
      createSessionToken,
      hashToken,
    } = await dbServer();
    const googleUser = await verifyGoogleCredential(data.credential);
    const sessionToken = createSessionToken();

    const user = await mutateDatabase((platform) => {
      let account =
        platform.accounts.find((item) => item.googleSubject === googleUser.subject) ??
        platform.accounts.find((item) => item.email.toLowerCase() === googleUser.email);

      if (account?.googleSubject && account.googleSubject !== googleUser.subject) {
        throw createHttpError("Este e-mail já está vinculado a outra conta Google.", 409);
      }

      if (!account) {
        account = {
          id: nextId("u", platform.accounts),
          name: googleUser.name || googleUser.email.split("@")[0],
          email: googleUser.email,
          avatar: googleUser.picture,
          passwordHash: `disabled$${hashToken(createSessionToken())}`,
          googleSubject: googleUser.subject,
          createdAt: new Date().toISOString(),
        };
        platform.accounts.push(account);
        platform.workspaces.unshift(createPersonalWorkspace(account));
      } else {
        account.googleSubject = googleUser.subject;
        account.name = googleUser.name || account.name;
        account.avatar ||= googleUser.picture;
      }

      let invitedWorkspace: Database | undefined;
      for (const workspace of platform.workspaces) {
        const invitation = workspace.invitations.find(
          (item) =>
            item.email.toLowerCase() === googleUser.email &&
            new Date(item.expiresAt).getTime() > Date.now(),
        );
        if (!invitation) continue;
        if (!workspace.employees.some((employee) => employee.id === account!.id)) {
          workspace.employees.push({
            id: account.id,
            name: account.name,
            email: account.email,
            avatar: account.avatar,
            role: invitation.role,
            departmentId: invitation.departmentId,
            status: invitation.status,
            permissionGroupId: invitation.permissionGroupId,
            passwordHash: account.passwordHash,
            googleSubject: account.googleSubject,
          });
        }
        workspace.invitations = workspace.invitations.filter((item) => item.id !== invitation.id);
        invitedWorkspace ??= workspace;
      }

      const activeWorkspace =
        invitedWorkspace ??
        platform.workspaces.find(
          (workspace) =>
            workspace.company.kind === "personal" && workspace.company.ownerId === account!.id,
        );
      const employee = activeWorkspace?.employees.find((item) => item.id === account!.id);
      if (!activeWorkspace || !employee) throw createHttpError("Conta sem espaço disponível.", 409);

      platform.sessions.push({
        id: nextId("s", platform.sessions),
        tokenHash: hashToken(sessionToken),
        userId: account.id,
        activeCompanyId: activeWorkspace.company.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString(),
      });

      return toCurrentUser(employee);
    });

    setCookie(SESSION_COOKIE, sessionToken, getCookieOptions());
    return { ok: true, user };
  });

export const requestEmailLoginCode = createServerFn({ method: "POST" })
  .validator((data) => emailCodeRequestSchema.parse(data))
  .handler(async ({ data }) => {
    const { requestMobileEmailCode } = await import("../mobile-api.server");
    const result = await requestMobileEmailCode(data.email);
    return { ok: true, expiresInSeconds: result.expiresInSeconds };
  });

export const loginWithEmailCode = createServerFn({ method: "POST" })
  .validator((data) => emailCodeLoginSchema.parse(data))
  .handler(async ({ data }) => {
    const { verifyMobileEmailCode } = await import("../mobile-api.server");
    const result = await verifyMobileEmailCode(data.email, data.code);
    setCookie(SESSION_COOKIE, result.token, getCookieOptions());
    return { ok: true, user: result.user };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { mutateDatabase, hashToken } = await dbServer();
  const token = getCookie(SESSION_COOKIE);
  if (token) {
    const tokenHash = hashToken(token);
    await mutateDatabase((db) => {
      db.sessions = db.sessions.filter((session) => session.tokenHash !== tokenHash);
    });
  }

  deleteCookie(SESSION_COOKIE, { path: "/" });
  return { ok: true };
});

export const updateProfile = createServerFn({ method: "POST" })
  .validator((data) => updateProfileSchema.parse(data))
  .handler(async ({ data }) => {
    const { account: snapshotAccount } = await requireSessionContext();
    const { hashPassword, verifyPassword } = await dbServer();
    let nextPasswordHash: string | undefined;
    let previousPasswordHash: string | undefined;
    if (data.newPassword) {
      if (!(await verifyPassword(data.currentPassword ?? "", snapshotAccount.passwordHash))) {
        throw createHttpError("Senha atual inválida.", 401);
      }
      previousPasswordHash = snapshotAccount.passwordHash;
      nextPasswordHash = await hashPassword(data.newPassword);
    }

    return mutateCurrentWorkspace((workspace, currentUserId, platform) => {
      const account = platform.accounts.find((item) => item.id === currentUserId);
      if (!account) throw createHttpError("Usuário não encontrado.", 404);

      if (nextPasswordHash) {
        if (account.passwordHash !== previousPasswordHash) {
          throw createHttpError("Senha atual inválida.", 401);
        }
        account.passwordHash = nextPasswordHash;
      }

      account.name = data.name;
      account.avatar = data.avatar;
      for (const item of platform.workspaces) {
        const member = item.employees.find((employee) => employee.id === currentUserId);
        if (!member) continue;
        member.name = account.name;
        member.avatar = account.avatar;
        member.passwordHash = account.passwordHash;
      }
      const employee = workspace.employees.find((item) => item.id === currentUserId)!;

      return {
        employee: withoutPassword(employee),
        currentUser: toCurrentUser(employee),
      };
    });
  });

export const createTask = createServerFn({ method: "POST" })
  .validator((data) => createTaskSchema.parse(data))
  .handler(async ({ data }) => {
    return mutateCurrentWorkspace((db, currentUserId) => {
      requireGroupPermission(
        db,
        currentUserId,
        "tasks.create",
        "Seu grupo de permissão não pode criar tarefas.",
      );

      const responsible = data.responsibleId
        ? db.employees.find((employee) => employee.id === data.responsibleId)
        : undefined;
      if (data.responsibleId && !responsible) {
        throw createHttpError("Responsável não encontrado.");
      }
      if (!data.responsibleId && data.target.type !== "department") {
        throw createHttpError("Escolha um responsável para esta tarefa.");
      }

      const reviewerId = data.requiresReview ? data.reviewerId : undefined;
      if (reviewerId && !db.employees.some((employee) => employee.id === reviewerId)) {
        throw createHttpError("Revisor não encontrado.");
      }

      const targetLabel = resolveTargetLabel(data.target.type, data.target.id, db);
      if (!targetLabel) throw createHttpError("Destino da tarefa não encontrado.");

      const task = {
        id: nextId("t", db.tasks),
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: "pending" as const,
        dueDate: data.dueDate,
        createdAt: today(),
        target: { ...data.target, label: targetLabel },
        responsibleId: data.responsibleId,
        assignedById: currentUserId,
        assignedAt: new Date().toISOString(),
        reviewerId,
        requiresReview: Boolean(reviewerId),
        tags: data.tags,
        comments: 0,
        attachments: 0,
        recurrence: normalizeRecurrence(data.recurrence),
        subtasks: [],
      };

      db.tasks.unshift(task);
      return task;
    });
  });

export const updateTaskStatus = createServerFn({ method: "POST" })
  .validator((data) => updateTaskStatusSchema.parse(data))
  .handler(async ({ data }) => {
    return mutateCurrentWorkspace((db, currentUserId) => {
      const task = db.tasks.find((item) => item.id === data.id);
      if (!task) throw createHttpError("Tarefa não encontrada.", 404);
      const currentUser = db.employees.find((employee) => employee.id === currentUserId);
      const permissions = getTaskPermissions({
        task,
        currentUser,
        employees: db.employees,
        departments: db.departments,
        groups: db.groups,
        permissionGroups: db.permissionGroups,
      });
      if (data.status === "completed") {
        if (!permissions.canComplete) {
          throw createHttpError("Seu grupo de permissão não pode concluir tarefas.", 403);
        }
      } else if (task.status === "completed" || data.status === "reopened") {
        if (!permissions.canReopen) {
          throw createHttpError("Seu grupo de permissão não pode reabrir tarefas.", 403);
        }
      } else if (!permissions.canChangeStatus) {
        throw createHttpError("Você não tem permissão para alterar o status desta tarefa.", 403);
      }
      const wasCompleted = task.status === "completed";
      task.status = data.status;
      if (data.status === "completed" && !wasCompleted) {
        createNextRecurringTask(db, task);
      }
      return task;
    });
  });

export const updateTaskDetails = createServerFn({ method: "POST" })
  .validator((data) => updateTaskDetailsSchema.parse(data))
  .handler(async ({ data }) => {
    return mutateCurrentWorkspace((db, currentUserId) => {
      const task = db.tasks.find((item) => item.id === data.id);
      if (!task) throw createHttpError("Tarefa não encontrada.", 404);
      const currentUser = db.employees.find((employee) => employee.id === currentUserId);
      const permissions = getTaskPermissions({
        task,
        currentUser,
        employees: db.employees,
        departments: db.departments,
        groups: db.groups,
        permissionGroups: db.permissionGroups,
      });
      if (!permissions.canEditContent) {
        throw createHttpError("Você não tem permissão para editar o texto desta tarefa.", 403);
      }

      task.title = data.title;
      task.description = data.description;
      task.priority = data.priority;
      task.dueDate = data.dueDate;
      task.tags = data.tags;
      task.recurrence = normalizeRecurrence(data.recurrence);
      return task;
    });
  });

export const addTaskComment = createServerFn({ method: "POST" })
  .validator((data) => addTaskCommentSchema.parse(data))
  .handler(async ({ data }) => {
    return mutateCurrentWorkspace((db, currentUserId) => {
      const { task, permissions } = getTaskWithPermissions(db, data.taskId, currentUserId);
      if (!permissions.canComment) {
        throw createHttpError("Você não tem permissão para comentar nesta tarefa.", 403);
      }

      const currentCount = task.comments ?? task.commentItems?.length ?? 0;
      task.commentItems = task.commentItems ?? [];
      task.commentItems.push({
        id: nextId("tc", task.commentItems),
        authorId: currentUserId,
        body: data.body,
        createdAt: new Date().toISOString(),
      });
      task.comments = currentCount + 1;
      return task;
    });
  });

export const addTaskAttachment = createServerFn({ method: "POST" })
  .validator((data) => addTaskAttachmentSchema.parse(data))
  .handler(async ({ data }) => {
    return mutateCurrentWorkspace((db, currentUserId) => {
      const { task, permissions } = getTaskWithPermissions(db, data.taskId, currentUserId);
      if (!permissions.canAttach) {
        throw createHttpError("Você não tem permissão para anexar arquivos nesta tarefa.", 403);
      }

      const currentCount = task.attachments ?? task.attachmentItems?.length ?? 0;
      task.attachmentItems = task.attachmentItems ?? [];
      task.attachmentItems.push({
        id: nextId("ta", task.attachmentItems),
        name: data.name,
        sizeLabel: data.sizeLabel || "Arquivo",
        uploadedById: currentUserId,
        createdAt: new Date().toISOString(),
      });
      task.attachments = currentCount + 1;
      return task;
    });
  });

export const addTaskSubtask = createServerFn({ method: "POST" })
  .validator((data) => addTaskSubtaskSchema.parse(data))
  .handler(async ({ data }) => {
    return mutateCurrentWorkspace((db, currentUserId) => {
      const { task, permissions } = getTaskWithPermissions(db, data.taskId, currentUserId);
      if (!permissions.canManageChecklist) {
        throw createHttpError("Você não tem permissão para adicionar itens nesta tarefa.", 403);
      }

      task.subtasks = task.subtasks ?? [];
      task.subtasks.push({
        id: nextId("ts", task.subtasks),
        title: data.title,
        done: false,
        createdAt: new Date().toISOString(),
      });
      return task;
    });
  });

export const toggleTaskSubtask = createServerFn({ method: "POST" })
  .validator((data) => toggleTaskSubtaskSchema.parse(data))
  .handler(async ({ data }) => {
    return mutateCurrentWorkspace((db, currentUserId) => {
      const { task, permissions } = getTaskWithPermissions(db, data.taskId, currentUserId);
      if (!permissions.canManageChecklist) {
        throw createHttpError("Você não tem permissão para atualizar itens desta tarefa.", 403);
      }

      const subtask = task.subtasks?.find((item) => item.id === data.subtaskId);
      if (!subtask) throw createHttpError("Item não encontrado.", 404);

      subtask.done = data.done;
      subtask.completedAt = data.done ? new Date().toISOString() : undefined;
      return task;
    });
  });

export const updateTaskSubtask = createServerFn({ method: "POST" })
  .validator((data) => updateTaskSubtaskSchema.parse(data))
  .handler(async ({ data }) => {
    return mutateCurrentWorkspace((db, currentUserId) => {
      const { task, permissions } = getTaskWithPermissions(db, data.taskId, currentUserId);
      if (!permissions.canManageChecklist || !permissions.canEditContent) {
        throw createHttpError("Você não tem permissão para editar itens desta tarefa.", 403);
      }

      const subtask = task.subtasks?.find((item) => item.id === data.subtaskId);
      if (!subtask) throw createHttpError("Item não encontrado.", 404);

      subtask.title = data.title;
      return task;
    });
  });

export const deleteTaskSubtask = createServerFn({ method: "POST" })
  .validator((data) => deleteTaskSubtaskSchema.parse(data))
  .handler(async ({ data }) => {
    return mutateCurrentWorkspace((db, currentUserId) => {
      const { task, permissions } = getTaskWithPermissions(db, data.taskId, currentUserId);
      if (!permissions.canManageChecklist) {
        throw createHttpError("Você não tem permissão para remover itens desta tarefa.", 403);
      }

      task.subtasks = (task.subtasks ?? []).filter((item) => item.id !== data.subtaskId);
      return task;
    });
  });

export const deleteTask = createServerFn({ method: "POST" })
  .validator((data) => deleteTaskSchema.parse(data))
  .handler(async ({ data }) => {
    return mutateCurrentWorkspace((db, currentUserId) => {
      const taskIndex = db.tasks.findIndex((item) => item.id === data.id);
      if (taskIndex === -1) throw createHttpError("Tarefa nÃ£o encontrada.", 404);

      const task = db.tasks[taskIndex];
      const currentUser = db.employees.find((employee) => employee.id === currentUserId);
      const permissions = getTaskPermissions({
        task,
        currentUser,
        employees: db.employees,
        departments: db.departments,
        groups: db.groups,
        permissionGroups: db.permissionGroups,
      });
      if (!permissions.canDelete) {
        throw createHttpError("Seu grupo de permissão não pode excluir tarefas.", 403);
      }

      db.tasks.splice(taskIndex, 1);
      return { ok: true, id: data.id };
    });
  });

export const createDepartment = createServerFn({ method: "POST" })
  .validator((data) => createDepartmentSchema.parse(data))
  .handler(async ({ data }) => {
    return mutateCurrentWorkspace((db, currentUserId) => {
      requireGroupPermission(
        db,
        currentUserId,
        "manage.departments",
        "Seu grupo de permissão não pode criar setores.",
      );
      if (!db.employees.some((employee) => employee.id === data.managerId)) {
        throw createHttpError("Gestor não encontrado.");
      }

      const department = {
        id: nextId("d", db.departments),
        name: data.name,
        description: data.description,
        managerId: data.managerId,
        color: data.color ?? departmentColors[db.departments.length % departmentColors.length],
      };

      db.departments.push(department);
      return department;
    });
  });

export const createEmployee = createServerFn({ method: "POST" })
  .validator((data) => createEmployeeSchema.parse(data))
  .handler(async ({ data }) => {
    const { createSessionToken, hashToken } = await dbServer();
    const invitationToken = createSessionToken();
    const result = await mutateCurrentWorkspace((db, currentUserId) => {
      requireGroupPermission(
        db,
        currentUserId,
        "manage.employees",
        "Seu grupo de permissão não pode cadastrar funcionários.",
      );
      if (!db.departments.some((department) => department.id === data.departmentId)) {
        throw createHttpError("Setor não encontrado.");
      }

      if (
        db.employees.some(
          (employee) => employee.email.toLowerCase() === data.email.toLowerCase(),
        ) ||
        db.invitations.some(
          (invitation) => invitation.email.toLowerCase() === data.email.toLowerCase(),
        )
      ) {
        throw createHttpError("Já existe um funcionário ou convite com este e-mail.");
      }

      if (
        data.permissionGroupId &&
        !db.permissionGroups.some((group) => group.id === data.permissionGroupId)
      ) {
        throw createHttpError("Grupo de permissão não encontrado.");
      }

      const invitation = {
        id: nextId("i", db.invitations),
        tokenHash: hashToken(invitationToken),
        name: data.name,
        email: data.email.toLowerCase(),
        role: data.role,
        departmentId: data.departmentId,
        status: data.status,
        permissionGroupId: data.permissionGroupId,
        invitedById: currentUserId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + INVITATION_MAX_AGE_SECONDS * 1000).toISOString(),
      };

      db.invitations.push(invitation);
      const { tokenHash, ...safeInvitation } = invitation;
      const invitedByName =
        db.employees.find((employee) => employee.id === currentUserId)?.name ?? "Sua equipe";
      return {
        invitation: safeInvitation,
        activatedTeamMode: true,
        emailContext: {
          companyName: db.company.name,
          invitedByName,
        },
      };
    });

    const invitationUrl = `${getApplicationOrigin()}/aceitar-convite?token=${encodeURIComponent(invitationToken)}`;
    try {
      const { sendEmployeeInvitation } = await import("../email.server");
      const delivery = await sendEmployeeInvitation({
        email: result.invitation.email,
        employeeName: result.invitation.name,
        companyName: result.emailContext.companyName,
        invitedByName: result.emailContext.invitedByName,
        role: result.invitation.role,
        invitationUrl,
      });
      return {
        invitation: result.invitation,
        activatedTeamMode: result.activatedTeamMode,
        invitationToken,
        invitationUrl,
        emailSent: delivery.delivered,
      };
    } catch (error) {
      await mutateCurrentWorkspace((db) => {
        db.invitations = db.invitations.filter(
          (invitation) => invitation.id !== result.invitation.id,
        );
      });
      throw error;
    }
  });

export const resendEmployeeInvitation = createServerFn({ method: "POST" })
  .validator((data) => resendEmployeeInvitationSchema.parse(data))
  .handler(async ({ data }) => {
    const { createSessionToken, hashToken } = await dbServer();
    const invitationToken = createSessionToken();
    const invitationTokenHash = hashToken(invitationToken);
    const result = await mutateCurrentWorkspace((db, currentUserId) => {
      requireGroupPermission(
        db,
        currentUserId,
        "manage.employees",
        "Seu grupo de permissão não pode reenviar convites.",
      );
      const invitation = db.invitations.find((item) => item.id === data.id);
      if (!invitation) throw createHttpError("Convite pendente não encontrado.", 404);

      const previousTokenHash = invitation.tokenHash;
      const previousCreatedAt = invitation.createdAt;
      const previousExpiresAt = invitation.expiresAt;
      invitation.tokenHash = invitationTokenHash;
      invitation.invitedById = currentUserId;
      invitation.createdAt = new Date().toISOString();
      invitation.expiresAt = new Date(
        Date.now() + INVITATION_MAX_AGE_SECONDS * 1000,
      ).toISOString();

      return {
        invitation: {
          id: invitation.id,
          name: invitation.name,
          email: invitation.email,
          role: invitation.role,
        },
        companyName: db.company.name,
        invitedByName:
          db.employees.find((employee) => employee.id === currentUserId)?.name ?? "Sua equipe",
        previousTokenHash,
        previousCreatedAt,
        previousExpiresAt,
      };
    });

    const invitationUrl = `${getApplicationOrigin()}/aceitar-convite?token=${encodeURIComponent(invitationToken)}`;
    try {
      const { sendEmployeeInvitation } = await import("../email.server");
      await sendEmployeeInvitation({
        email: result.invitation.email,
        employeeName: result.invitation.name,
        companyName: result.companyName,
        invitedByName: result.invitedByName,
        role: result.invitation.role,
        invitationUrl,
      });
      return { ok: true, invitationId: result.invitation.id };
    } catch (error) {
      await mutateCurrentWorkspace((db) => {
        const invitation = db.invitations.find((item) => item.id === result.invitation.id);
        if (invitation?.tokenHash === invitationTokenHash) {
          invitation.tokenHash = result.previousTokenHash;
          invitation.createdAt = result.previousCreatedAt;
          invitation.expiresAt = result.previousExpiresAt;
        }
      });
      throw error;
    }
  });

export const acceptInvitation = createServerFn({ method: "POST" })
  .validator((data) => acceptInvitationSchema.parse(data))
  .handler(async ({ data }) => {
    const {
      mutateDatabase,
      hashPassword,
      hashToken,
      createSessionToken,
      createPersonalWorkspace,
      verifyPassword,
    } = await dbServer();
    const invitationTokenHash = hashToken(data.token);
    const currentSessionTokenHash = await getSessionTokenHash();
    const sessionToken = createSessionToken();
    const passwordHash = await hashPassword(data.password);

    const user = await mutateDatabase(async (platform) => {
      const workspace = platform.workspaces.find((item) =>
        item.invitations.some(
          (invitation) =>
            invitation.tokenHash === invitationTokenHash &&
            new Date(invitation.expiresAt).getTime() > Date.now(),
        ),
      );
      const invitation = workspace?.invitations.find(
        (item) => item.tokenHash === invitationTokenHash,
      );
      if (!invitation) throw createHttpError("Este convite é inválido ou expirou.", 410);
      if (!workspace) throw createHttpError("Empresa do convite não encontrada.", 404);
      if (
        workspace.employees.some((employee) => employee.email.toLowerCase() === invitation.email)
      ) {
        throw createHttpError("Esta pessoa já participa da empresa.");
      }

      let account = platform.accounts.find(
        (item) => item.email.toLowerCase() === invitation.email.toLowerCase(),
      );
      const currentContext = resolveSessionContext(platform, currentSessionTokenHash);
      if (account && currentContext?.account.id !== account.id) {
        const validPassword = await verifyPassword(data.password, account.passwordHash);
        if (!validPassword) {
          throw createHttpError(
            account.googleSubject
              ? "Entre com Google antes de aceitar este convite."
              : "Use a senha da sua conta para aceitar o convite.",
            401,
          );
        }
      }
      if (!account) {
        account = {
          id: nextId("u", platform.accounts),
          name: invitation.name,
          email: invitation.email,
          passwordHash,
          createdAt: new Date().toISOString(),
        };
        platform.accounts.push(account);
        platform.workspaces.unshift(createPersonalWorkspace(account));
      }
      const employee = {
        id: account.id,
        name: account.name,
        email: account.email,
        avatar: account.avatar,
        role: invitation.role,
        departmentId: invitation.departmentId,
        status: invitation.status,
        permissionGroupId: invitation.permissionGroupId,
        passwordHash: account.passwordHash,
        googleSubject: account.googleSubject,
      };
      workspace.employees.push(employee);
      workspace.invitations = workspace.invitations.filter((item) => item.id !== invitation.id);
      platform.sessions.push({
        id: nextId("s", platform.sessions),
        tokenHash: hashToken(sessionToken),
        userId: account.id,
        activeCompanyId: workspace.company.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString(),
      });
      return toCurrentUser(employee);
    });

    setCookie(SESSION_COOKIE, sessionToken, getCookieOptions());
    return { ok: true, user };
  });

export const createGroup = createServerFn({ method: "POST" })
  .validator((data) => createGroupSchema.parse(data))
  .handler(async ({ data }) => {
    return mutateCurrentWorkspace((db, currentUserId) => {
      requireGroupPermission(
        db,
        currentUserId,
        "manage.groups",
        "Seu grupo de permissão não pode criar grupos.",
      );
      if (data.leaderId && !db.employees.some((employee) => employee.id === data.leaderId)) {
        throw createHttpError("Líder não encontrado.");
      }

      const memberIds = Array.from(
        new Set([...(data.leaderId ? [data.leaderId] : []), ...data.memberIds]),
      );
      const invalidMember = memberIds.find(
        (memberId) => !db.employees.some((employee) => employee.id === memberId),
      );
      if (invalidMember) throw createHttpError("Um dos membros não foi encontrado.");

      const group = {
        id: nextId("g", db.groups),
        name: data.name,
        description: data.description,
        leaderId: data.leaderId,
        memberIds,
      };

      db.groups.push(group);
      return group;
    });
  });

export const updateCompany = createServerFn({ method: "POST" })
  .validator((data) => updateCompanySchema.parse(data))
  .handler(async ({ data }) => {
    return mutateCurrentWorkspace((db, currentUserId) => {
      requireGroupPermission(
        db,
        currentUserId,
        "manage.company",
        "Seu grupo de permissão não pode editar a empresa.",
      );
      db.company = {
        ...db.company,
        name: data.name,
        document: data.document,
        status: data.status,
      };
      return db.company;
    });
  });

function applyPermissionGroupMembers(db: Database, groupId: string, memberIds: string[]) {
  const invalidMember = memberIds.find(
    (memberId) => !db.employees.some((employee) => employee.id === memberId),
  );
  if (invalidMember) throw createHttpError("Um dos membros não foi encontrado.");

  for (const employee of db.employees) {
    if (memberIds.includes(employee.id)) {
      employee.permissionGroupId = groupId;
    } else if (employee.permissionGroupId === groupId) {
      employee.permissionGroupId = undefined;
    }
  }
}

export const createPermissionGroup = createServerFn({ method: "POST" })
  .validator((data) => createPermissionGroupSchema.parse(data))
  .handler(async ({ data }) => {
    return mutateCurrentWorkspace((db, currentUserId) => {
      requireAdmin(db, currentUserId);

      const group = {
        id: nextId("pg", db.permissionGroups),
        name: data.name,
        description: data.description,
        permissions: data.permissions,
      };
      db.permissionGroups.push(group);
      applyPermissionGroupMembers(db, group.id, data.memberIds);
      return group;
    });
  });

export const updatePermissionGroup = createServerFn({ method: "POST" })
  .validator((data) => updatePermissionGroupSchema.parse(data))
  .handler(async ({ data }) => {
    return mutateCurrentWorkspace((db, currentUserId) => {
      requireAdmin(db, currentUserId);

      const group = db.permissionGroups.find((item) => item.id === data.id);
      if (!group) throw createHttpError("Grupo de permissão não encontrado.", 404);

      group.name = data.name;
      group.description = data.description;
      if (!group.isSystem) {
        group.permissions = data.permissions;
      }
      applyPermissionGroupMembers(db, group.id, data.memberIds);
      return group;
    });
  });

export const deletePermissionGroup = createServerFn({ method: "POST" })
  .validator((data) => deletePermissionGroupSchema.parse(data))
  .handler(async ({ data }) => {
    return mutateCurrentWorkspace((db, currentUserId) => {
      requireAdmin(db, currentUserId);

      const groupIndex = db.permissionGroups.findIndex((item) => item.id === data.id);
      if (groupIndex === -1) throw createHttpError("Grupo de permissão não encontrado.", 404);
      if (db.permissionGroups[groupIndex].isSystem) {
        throw createHttpError("O grupo Administrador não pode ser excluído.", 400);
      }

      for (const employee of db.employees) {
        if (employee.permissionGroupId === data.id) {
          employee.permissionGroupId = undefined;
        }
      }
      db.permissionGroups.splice(groupIndex, 1);
      return { ok: true, id: data.id };
    });
  });
