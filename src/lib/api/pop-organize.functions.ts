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
import { departmentColors, type Task, type TargetType } from "../domain";
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
    frequency: z.enum(["none", "daily", "biweekly", "monthly", "custom"]).default("none"),
    intervalDays: z.coerce.number().int().min(1).max(365).optional(),
    endDate: z
      .union([z.literal(""), z.string().min(10)])
      .optional()
      .transform((value) => value || undefined),
  })
  .optional()
  .superRefine((value, ctx) => {
    if (value?.frequency === "custom" && !value.intervalDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o intervalo personalizado.",
        path: ["intervalDays"],
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

  return {
    frequency: value.frequency,
    intervalDays: value.frequency === "custom" ? value.intervalDays : undefined,
    endDate: value.endDate,
  };
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(dateValue: string, months: number) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const target = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

function getNextRecurringDueDate(task: Task) {
  if (!task.recurrence) return null;

  const nextDueDate =
    task.recurrence.frequency === "monthly"
      ? addMonths(task.dueDate, 1)
      : addDays(
          task.dueDate,
          task.recurrence.frequency === "daily"
            ? 1
            : task.recurrence.frequency === "biweekly"
              ? 14
              : (task.recurrence.intervalDays ?? 1),
        );

  if (task.recurrence.endDate && nextDueDate > task.recurrence.endDate) return null;
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
  });

  return { task, permissions };
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
    const { mutateDatabase } = await dbServer();
    return mutateDatabase((db) => {
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
      });
      if (!permissions.canChangeStatus) {
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
      if (!permissions.canChangeStatus && !permissions.canEditContent) {
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
      if (!permissions.canChangeStatus && !permissions.canEditContent) {
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
      });
      if (!permissions.canDelete) {
        throw createHttpError("Apenas administradores podem excluir tarefas.", 403);
      }

      db.tasks.splice(taskIndex, 1);
      return { ok: true, id: data.id };
    });
  });

export const createDepartment = createServerFn({ method: "POST" })
  .inputValidator((data) => createDepartmentSchema.parse(data))
  .handler(async ({ data }) => {
    const { mutateDatabase } = await dbServer();
    return mutateDatabase((db) => {
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
    const { mutateDatabase, hashPassword } = await dbServer();
    return mutateDatabase((db) => {
      if (!db.departments.some((department) => department.id === data.departmentId)) {
        throw createHttpError("Setor não encontrado.");
      }

      if (
        db.employees.some((employee) => employee.email.toLowerCase() === data.email.toLowerCase())
      ) {
        throw createHttpError("Já existe um funcionário com este e-mail.");
      }

      const employee = {
        id: nextId("u", db.employees),
        name: data.name,
        email: data.email.toLowerCase(),
        role: data.role,
        departmentId: data.departmentId,
        status: data.status,
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
    const { mutateDatabase } = await dbServer();
    return mutateDatabase((db) => {
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
    const { mutateDatabase } = await dbServer();
    return mutateDatabase((db) => {
      db.company = {
        ...db.company,
        name: data.name,
        document: data.document,
        status: data.status,
      };
      return db.company;
    });
  });
