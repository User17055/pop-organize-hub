import { createServerFn } from "@tanstack/react-start";
import {
  deleteCookie,
  getCookie,
  getRequestProtocol,
  setCookie,
} from "@tanstack/react-start/server";
import { z } from "zod";

import {
  DEMO_PASSWORD,
  defaultDueDate,
  nextId,
  sanitizeDatabase,
  today,
  toCurrentUser,
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
  responsibleId: z.string().min(1),
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
  password: z.string().min(6).optional(),
  permissionGroupId: z
    .union([z.literal(""), z.string().min(1)])
    .optional()
    .transform((value) => value || undefined),
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
    newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres").optional(),
  })
  .refine((data) => !data.newPassword || Boolean(data.currentPassword), {
    message: "Informe a senha atual.",
    path: ["currentPassword"],
  });

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

function createHttpError(message: string, status = 400) {
  return Object.assign(new Error(message), { statusCode: status });
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

async function dbServer() {
  return import("../database.server");
}

async function getSessionUserId() {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;

  const { hashToken, readDatabase } = await dbServer();
  const tokenHash = hashToken(token);
  const db = await readDatabase();
  const now = Date.now();
  const session = db.sessions.find(
    (item) => item.tokenHash === tokenHash && new Date(item.expiresAt).getTime() > now,
  );

  return session?.userId ?? null;
}

function resolveTargetLabel(
  type: TargetType,
  id: string,
  db: Awaited<ReturnType<typeof import("../database.server").readDatabase>>,
) {
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

function getNextRecurringDueDate(task: Task) {
  if (!task.recurrence) return null;

  const { recurrence } = task;
  const nextDueDate =
    recurrence.frequency === "daily"
      ? addDays(task.dueDate, 1)
      : recurrence.frequency === "weekly"
        ? addDays(task.dueDate, 7)
        : recurrence.frequency === "biweekly"
          ? addDays(task.dueDate, 14)
          : recurrence.frequency === "monthly"
            ? addMonths(task.dueDate, 1, recurrence.dayOfMonth)
            : recurrence.frequency === "yearly"
              ? addYears(task.dueDate, 1, recurrence.monthOfYear, recurrence.dayOfMonth)
              : recurrence.customUnit === "weeks"
                ? addDays(task.dueDate, (recurrence.interval ?? recurrence.intervalDays ?? 1) * 7)
                : recurrence.customUnit === "months"
                  ? addMonths(task.dueDate, recurrence.interval ?? 1, recurrence.dayOfMonth)
                  : recurrence.customUnit === "years"
                    ? addYears(
                        task.dueDate,
                        recurrence.interval ?? 1,
                        recurrence.monthOfYear,
                        recurrence.dayOfMonth,
                      )
                    : addDays(task.dueDate, recurrence.interval ?? recurrence.intervalDays ?? 1);

  if (recurrence.endDate && nextDueDate > recurrence.endDate) return null;
  return nextDueDate;
}

function createNextRecurringTask(
  db: Awaited<ReturnType<typeof import("../database.server").readDatabase>>,
  task: Task,
) {
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
    subtasks: [],
  });
}

function getTaskWithPermissions(
  db: Awaited<ReturnType<typeof import("../database.server").readDatabase>>,
  taskId: string,
  currentUserId: string,
) {
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
  db: Awaited<ReturnType<typeof import("../database.server").readDatabase>>,
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

function requireAdmin(
  db: Awaited<ReturnType<typeof import("../database.server").readDatabase>>,
  currentUserId: string,
) {
  const currentUser = db.employees.find((employee) => employee.id === currentUserId);
  if (!isAdminUser({ currentUser, employees: db.employees })) {
    throw createHttpError("Apenas administradores podem gerenciar grupos de permissão.", 403);
  }
}

export const getWorkspaceData = createServerFn({ method: "GET" }).handler(async () => {
  const { readDatabase } = await dbServer();
  const db = await readDatabase();
  const currentUserId = (await getSessionUserId()) ?? "u3";
  return sanitizeDatabase(db, currentUserId);
});

export const getSessionUser = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const { readDatabase } = await dbServer();
  const db = await readDatabase();
  const employee = db.employees.find((item) => item.id === userId);
  return employee ? toCurrentUser(employee) : null;
});

export const login = createServerFn({ method: "POST" })
  .inputValidator((data) => loginSchema.parse(data))
  .handler(async ({ data }) => {
    const { hashPassword, mutateDatabase, createSessionToken, hashToken } = await dbServer();
    const email = data.email.toLowerCase();
    const passwordHash = hashPassword(data.password);

    return mutateDatabase(async (db) => {
      const employee = db.employees.find((item) => item.email.toLowerCase() === email);
      if (!employee || employee.passwordHash !== passwordHash || employee.status !== "active") {
        throw createHttpError("E-mail ou senha inválidos.", 401);
      }

      const token = createSessionToken();
      db.sessions = db.sessions.filter((session) => session.userId !== employee.id);
      db.sessions.push({
        id: nextId("s", db.sessions),
        tokenHash: hashToken(token),
        userId: employee.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString(),
      });

      setCookie(SESSION_COOKIE, token, getCookieOptions());

      return {
        ok: true,
        user: toCurrentUser(employee),
        demoPassword: DEMO_PASSWORD,
      };
    });
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
  .inputValidator((data) => updateProfileSchema.parse(data))
  .handler(async ({ data }) => {
    const currentUserId = (await getSessionUserId()) ?? "u3";
    const { mutateDatabase, hashPassword } = await dbServer();

    return mutateDatabase((db) => {
      const employee = db.employees.find((item) => item.id === currentUserId);
      if (!employee) throw createHttpError("Usuário não encontrado.", 404);

      if (data.newPassword) {
        if (employee.passwordHash !== hashPassword(data.currentPassword ?? "")) {
          throw createHttpError("Senha atual inválida.", 401);
        }
        employee.passwordHash = hashPassword(data.newPassword);
      }

      employee.name = data.name;
      employee.avatar = data.avatar;

      return {
        employee: withoutPassword(employee),
        currentUser: toCurrentUser(employee),
      };
    });
  });

export const createTask = createServerFn({ method: "POST" })
  .inputValidator((data) => createTaskSchema.parse(data))
  .handler(async ({ data }) => {
    const currentUserId = (await getSessionUserId()) ?? "u3";
    const { mutateDatabase } = await dbServer();
    return mutateDatabase((db) => {
      requireGroupPermission(
        db,
        currentUserId,
        "tasks.create",
        "Seu grupo de permissão não pode criar tarefas.",
      );

      const responsible = db.employees.find((employee) => employee.id === data.responsibleId);
      if (!responsible) throw createHttpError("Responsável não encontrado.");

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
  .inputValidator((data) => updateTaskStatusSchema.parse(data))
  .handler(async ({ data }) => {
    const currentUserId = (await getSessionUserId()) ?? "u3";
    const { mutateDatabase } = await dbServer();
    return mutateDatabase((db) => {
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
  .inputValidator((data) => updateTaskDetailsSchema.parse(data))
  .handler(async ({ data }) => {
    const currentUserId = (await getSessionUserId()) ?? "u3";
    const { mutateDatabase } = await dbServer();
    return mutateDatabase((db) => {
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
  .inputValidator((data) => addTaskCommentSchema.parse(data))
  .handler(async ({ data }) => {
    const currentUserId = (await getSessionUserId()) ?? "u3";
    const { mutateDatabase } = await dbServer();

    return mutateDatabase((db) => {
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
  .inputValidator((data) => addTaskAttachmentSchema.parse(data))
  .handler(async ({ data }) => {
    const currentUserId = (await getSessionUserId()) ?? "u3";
    const { mutateDatabase } = await dbServer();

    return mutateDatabase((db) => {
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
  .inputValidator((data) => addTaskSubtaskSchema.parse(data))
  .handler(async ({ data }) => {
    const currentUserId = (await getSessionUserId()) ?? "u3";
    const { mutateDatabase } = await dbServer();

    return mutateDatabase((db) => {
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
  .inputValidator((data) => toggleTaskSubtaskSchema.parse(data))
  .handler(async ({ data }) => {
    const currentUserId = (await getSessionUserId()) ?? "u3";
    const { mutateDatabase } = await dbServer();

    return mutateDatabase((db) => {
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
  .inputValidator((data) => updateTaskSubtaskSchema.parse(data))
  .handler(async ({ data }) => {
    const currentUserId = (await getSessionUserId()) ?? "u3";
    const { mutateDatabase } = await dbServer();

    return mutateDatabase((db) => {
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
  .inputValidator((data) => deleteTaskSubtaskSchema.parse(data))
  .handler(async ({ data }) => {
    const currentUserId = (await getSessionUserId()) ?? "u3";
    const { mutateDatabase } = await dbServer();

    return mutateDatabase((db) => {
      const { task, permissions } = getTaskWithPermissions(db, data.taskId, currentUserId);
      if (!permissions.canManageChecklist) {
        throw createHttpError("Você não tem permissão para remover itens desta tarefa.", 403);
      }

      task.subtasks = (task.subtasks ?? []).filter((item) => item.id !== data.subtaskId);
      return task;
    });
  });

export const deleteTask = createServerFn({ method: "POST" })
  .inputValidator((data) => deleteTaskSchema.parse(data))
  .handler(async ({ data }) => {
    const currentUserId = (await getSessionUserId()) ?? "u3";
    const { mutateDatabase } = await dbServer();
    return mutateDatabase((db) => {
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
  .inputValidator((data) => createDepartmentSchema.parse(data))
  .handler(async ({ data }) => {
    const currentUserId = (await getSessionUserId()) ?? "u3";
    const { mutateDatabase } = await dbServer();
    return mutateDatabase((db) => {
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
  .inputValidator((data) => createEmployeeSchema.parse(data))
  .handler(async ({ data }) => {
    const currentUserId = (await getSessionUserId()) ?? "u3";
    const { mutateDatabase, hashPassword } = await dbServer();
    return mutateDatabase((db) => {
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
        db.employees.some((employee) => employee.email.toLowerCase() === data.email.toLowerCase())
      ) {
        throw createHttpError("Já existe um funcionário com este e-mail.");
      }

      if (
        data.permissionGroupId &&
        !db.permissionGroups.some((group) => group.id === data.permissionGroupId)
      ) {
        throw createHttpError("Grupo de permissão não encontrado.");
      }

      const employee = {
        id: nextId("u", db.employees),
        name: data.name,
        email: data.email.toLowerCase(),
        role: data.role,
        departmentId: data.departmentId,
        status: data.status,
        permissionGroupId: data.permissionGroupId,
        passwordHash: hashPassword(data.password ?? DEMO_PASSWORD),
      };

      db.employees.push(employee);
      const { passwordHash, ...safeEmployee } = employee;
      return safeEmployee;
    });
  });

export const createGroup = createServerFn({ method: "POST" })
  .inputValidator((data) => createGroupSchema.parse(data))
  .handler(async ({ data }) => {
    const currentUserId = (await getSessionUserId()) ?? "u3";
    const { mutateDatabase } = await dbServer();
    return mutateDatabase((db) => {
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
  .inputValidator((data) => updateCompanySchema.parse(data))
  .handler(async ({ data }) => {
    const currentUserId = (await getSessionUserId()) ?? "u3";
    const { mutateDatabase } = await dbServer();
    return mutateDatabase((db) => {
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

function applyPermissionGroupMembers(
  db: Awaited<ReturnType<typeof import("../database.server").readDatabase>>,
  groupId: string,
  memberIds: string[],
) {
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
  .inputValidator((data) => createPermissionGroupSchema.parse(data))
  .handler(async ({ data }) => {
    const currentUserId = (await getSessionUserId()) ?? "u3";
    const { mutateDatabase } = await dbServer();
    return mutateDatabase((db) => {
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
  .inputValidator((data) => updatePermissionGroupSchema.parse(data))
  .handler(async ({ data }) => {
    const currentUserId = (await getSessionUserId()) ?? "u3";
    const { mutateDatabase } = await dbServer();
    return mutateDatabase((db) => {
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
  .inputValidator((data) => deletePermissionGroupSchema.parse(data))
  .handler(async ({ data }) => {
    const currentUserId = (await getSessionUserId()) ?? "u3";
    const { mutateDatabase } = await dbServer();
    return mutateDatabase((db) => {
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
