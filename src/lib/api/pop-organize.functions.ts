import { createServerFn } from "@tanstack/react-start";
import {
  deleteCookie,
  getCookie,
  getRequestProtocol,
  setCookie,
} from "@tanstack/react-start/server";
import { z } from "zod";

import {
  createSessionToken,
  defaultDueDate,
  DEMO_PASSWORD,
  hashPassword,
  hashToken,
  mutateDatabase,
  nextId,
  readDatabase,
  sanitizeDatabase,
  today,
  toCurrentUser,
} from "../database.server";
import { departmentColors, type TargetType } from "../domain";

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

async function getSessionUserId() {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;

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
  db: Awaited<ReturnType<typeof readDatabase>>,
) {
  if (type === "company" && db.company.id === id) return "Empresa inteira";
  if (type === "department") return db.departments.find((department) => department.id === id)?.name;
  if (type === "group") return db.groups.find((group) => group.id === id)?.name;
  if (type === "user") return db.employees.find((employee) => employee.id === id)?.name;
  return undefined;
}

export const getWorkspaceData = createServerFn({ method: "GET" }).handler(async () => {
  const db = await readDatabase();
  const currentUserId = (await getSessionUserId()) ?? "u3";
  return sanitizeDatabase(db, currentUserId);
});

export const getSessionUser = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const db = await readDatabase();
  const employee = db.employees.find((item) => item.id === userId);
  return employee ? toCurrentUser(employee) : null;
});

export const login = createServerFn({ method: "POST" })
  .validator(loginSchema)
  .handler(async ({ data }) => {
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

export const createTask = createServerFn({ method: "POST" })
  .validator(createTaskSchema)
  .handler(async ({ data }) => {
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
      };

      db.tasks.unshift(task);
      return task;
    });
  });

export const updateTaskStatus = createServerFn({ method: "POST" })
  .validator(updateTaskStatusSchema)
  .handler(async ({ data }) => {
    return mutateDatabase((db) => {
      const task = db.tasks.find((item) => item.id === data.id);
      if (!task) throw createHttpError("Tarefa não encontrada.", 404);
      task.status = data.status;
      return task;
    });
  });

export const createDepartment = createServerFn({ method: "POST" })
  .validator(createDepartmentSchema)
  .handler(async ({ data }) => {
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
  .validator(createEmployeeSchema)
  .handler(async ({ data }) => {
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
  .validator(createGroupSchema)
  .handler(async ({ data }) => {
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
  .validator(updateCompanySchema)
  .handler(async ({ data }) => {
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
