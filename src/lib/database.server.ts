import crypto from "node:crypto";
import process from "node:process";
import mysql from "mysql2/promise";

import { nextId, type Database, type SessionRecord } from "./database";
import {
  allPermissionKeys,
  departmentColors,
  type Company,
  type Department,
  type Employee,
  type Group,
  type PermissionGroup,
  type Task,
} from "./domain";

const DEFAULT_PASSWORD_PEPPER = "pop-organize-local-demo";
const MYSQL_STATE_ID = "default";
let mysqlPool: mysql.Pool | undefined;

function getBootstrapAdmin() {
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!password) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD is required to initialize an empty database.");
  }

  return {
    name: process.env.BOOTSTRAP_ADMIN_NAME || "Administrador",
    email: (process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@poporganize.com").toLowerCase(),
    password,
  };
}

export function hashPassword(password: string) {
  const pepper = process.env.AUTH_PASSWORD_PEPPER || DEFAULT_PASSWORD_PEPPER;
  return crypto.createHash("sha256").update(`${pepper}:${password}`).digest("hex");
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function nowDate() {
  return new Date().toISOString().slice(0, 10);
}

function offsetDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function initialPermissionGroups(): PermissionGroup[] {
  return [
    {
      id: "pg1",
      name: "Administrador",
      description: "Acesso total a todas as áreas e ações do sistema.",
      permissions: [...allPermissionKeys],
      isSystem: true,
    },
    {
      id: "pg2",
      name: "Gestor",
      description:
        "Gerencia tarefas da equipe, setores e grupos. Sem acesso a cadastros da empresa.",
      permissions: [
        "tasks.create",
        "tasks.edit",
        "tasks.changeStatus",
        "tasks.complete",
        "tasks.reopen",
        "tasks.delete",
        "tasks.comment",
        "tasks.attach",
        "tasks.checklist",
        "pages.departments",
        "pages.reports",
        "manage.departments",
        "manage.groups",
      ],
    },
    {
      id: "pg3",
      name: "Colaborador",
      description: "Trabalha nas próprias tarefas. Não pode excluir nem reabrir tarefas.",
      permissions: [
        "tasks.create",
        "tasks.edit",
        "tasks.changeStatus",
        "tasks.complete",
        "tasks.comment",
        "tasks.attach",
        "tasks.checklist",
      ],
    },
  ];
}

function defaultPermissionGroupId(
  employee: Pick<Employee, "id" | "role">,
  departments: Array<Pick<Department, "managerId">>,
  groups: Array<Pick<Group, "leaderId">>,
) {
  if (employee.role.toLowerCase().includes("admin")) return "pg1";
  const isManager =
    departments.some((department) => department.managerId === employee.id) ||
    groups.some((group) => group.leaderId === employee.id);
  return isManager ? "pg2" : "pg3";
}

function initialDatabase(): Database {
  const bootstrapAdmin = getBootstrapAdmin();
  const passwordHash = hashPassword(bootstrapAdmin.password);
  const departments: Department[] = [
    {
      id: "d1",
      name: "Marketing",
      description: "Campanhas, conteúdo e mídias sociais",
      managerId: "u2",
      color: departmentColors[0],
    },
    {
      id: "d2",
      name: "Financeiro",
      description: "Contas, faturamento e relatórios",
      managerId: "u4",
      color: departmentColors[1],
    },
    {
      id: "d3",
      name: "Recepção",
      description: "Atendimento ao cliente e agendamentos",
      managerId: "u5",
      color: departmentColors[2],
    },
    {
      id: "d4",
      name: "Veterinários",
      description: "Equipe clínica e procedimentos",
      managerId: "u6",
      color: departmentColors[3],
    },
    {
      id: "d5",
      name: "Administrativo",
      description: "Gestão e operações internas",
      managerId: "u3",
      color: departmentColors[4],
    },
  ];

  const employees: Array<Database["employees"][number]> = [
    {
      id: "u1",
      name: "Felipe Souza",
      email: "felipe@poporganize.com",
      role: "Designer",
      departmentId: "d1",
      status: "active",
      passwordHash,
    },
    {
      id: "u2",
      name: "Beatriz Lima",
      email: "bea@poporganize.com",
      role: "Gestora de Marketing",
      departmentId: "d1",
      status: "active",
      passwordHash,
    },
    {
      id: "u3",
      name: bootstrapAdmin.name,
      email: bootstrapAdmin.email,
      role: "Administrador",
      departmentId: "d5",
      status: "active",
      passwordHash,
    },
    {
      id: "u4",
      name: "Maria Costa",
      email: "maria@poporganize.com",
      role: "Analista Financeira",
      departmentId: "d2",
      status: "active",
      passwordHash,
    },
    {
      id: "u5",
      name: "Ana Silva",
      email: "ana@poporganize.com",
      role: "Recepcionista",
      departmentId: "d3",
      status: "active",
      passwordHash,
    },
    {
      id: "u6",
      name: "Dra. Cynthia Reis",
      email: "cynthia@poporganize.com",
      role: "Veterinária Chefe",
      departmentId: "d4",
      status: "active",
      passwordHash,
    },
    {
      id: "u7",
      name: "Carlos Mendes",
      email: "carlos@poporganize.com",
      role: "Veterinário",
      departmentId: "d4",
      status: "active",
      passwordHash,
    },
    {
      id: "u8",
      name: "Patrícia Alves",
      email: "patricia@poporganize.com",
      role: "Social Media",
      departmentId: "d1",
      status: "active",
      passwordHash,
    },
  ];

  const groups: Group[] = [
    {
      id: "g1",
      name: "Campanha Junho Violeta",
      description: "Conscientização sobre Alzheimer animal",
      leaderId: "u2",
      memberIds: ["u1", "u2", "u6", "u8"],
    },
    {
      id: "g2",
      name: "Projeto Novo Site",
      description: "Reformulação do site institucional",
      leaderId: "u1",
      memberIds: ["u1", "u3", "u8"],
    },
    {
      id: "g3",
      name: "Equipe de Plantão",
      description: "Atendimento 24h aos fins de semana",
      leaderId: "u6",
      memberIds: ["u5", "u6", "u7"],
    },
    {
      id: "g4",
      name: "Treinamento Interno",
      description: "Capacitação contínua da equipe",
      leaderId: "u3",
      memberIds: ["u3", "u4", "u5"],
    },
  ];

  const tasks: Task[] = [
    {
      id: "t1",
      title: "Criar campanha de check-up",
      description: "Desenvolver arte, legenda e vídeo para campanha de check-up anual.",
      priority: "high",
      status: "in_progress",
      dueDate: offsetDate(4),
      createdAt: offsetDate(-12),
      target: { type: "group", id: "g1", label: "Campanha Junho Violeta" },
      responsibleId: "u1",
      reviewerId: "u2",
      requiresReview: true,
      tags: ["Campanha", "Vídeo"],
      comments: 4,
      attachments: 2,
      subtasks: [
        { id: "ts1", title: "Criar roteiro da campanha", done: true, createdAt: offsetDate(-12) },
        { id: "ts2", title: "Gravar vídeo", done: false, createdAt: offsetDate(-12) },
        { id: "ts3", title: "Editar e revisar", done: false, createdAt: offsetDate(-12) },
      ],
    },
    {
      id: "t2",
      title: "Atualizar cadastro dos clientes",
      description: "Revisar dados de contato de todos os clientes ativos.",
      priority: "medium",
      status: "pending",
      dueDate: offsetDate(9),
      createdAt: offsetDate(-10),
      target: { type: "company", id: "c1", label: "Empresa inteira" },
      responsibleId: "u4",
      requiresReview: false,
      tags: ["CRM"],
      comments: 1,
      attachments: 0,
    },
    {
      id: "t3",
      title: "Organizar sala de reunião",
      description: "Preparar sala para reunião de planejamento estratégico.",
      priority: "low",
      status: "completed",
      dueDate: offsetDate(-6),
      createdAt: offsetDate(-14),
      target: { type: "department", id: "d5", label: "Administrativo" },
      responsibleId: "u3",
      requiresReview: false,
      tags: ["Operacional"],
      comments: 0,
      attachments: 0,
    },
    {
      id: "t4",
      title: "Criar vídeo sobre catarata em pets",
      description: "Roteiro, gravação e edição de vídeo educativo.",
      priority: "high",
      status: "waiting_review",
      dueDate: offsetDate(2),
      createdAt: offsetDate(-16),
      target: { type: "group", id: "g1", label: "Campanha Junho Violeta" },
      responsibleId: "u1",
      reviewerId: "u6",
      requiresReview: true,
      tags: ["Vídeo", "Educativo"],
      comments: 8,
      attachments: 5,
      subtasks: [
        { id: "ts4", title: "Roteiro aprovado", done: true, createdAt: offsetDate(-16) },
        { id: "ts5", title: "Gravação concluída", done: true, createdAt: offsetDate(-16) },
        { id: "ts6", title: "Edição finalizada", done: false, createdAt: offsetDate(-16) },
        { id: "ts7", title: "Publicar nas redes", done: false, createdAt: offsetDate(-16) },
      ],
    },
    {
      id: "t5",
      title: "Fechamento financeiro mensal",
      description: "Conciliar contas e gerar relatório do mês.",
      priority: "urgent",
      status: "in_progress",
      dueDate: offsetDate(1),
      createdAt: offsetDate(-11),
      target: { type: "department", id: "d2", label: "Financeiro" },
      responsibleId: "u4",
      reviewerId: "u3",
      requiresReview: true,
      tags: ["Financeiro", "Mensal"],
      comments: 2,
      attachments: 3,
    },
    {
      id: "t6",
      title: "Assinar termo de conduta",
      description: "Cada colaborador deve ler e assinar o novo termo.",
      priority: "medium",
      status: "pending",
      dueDate: offsetDate(14),
      createdAt: offsetDate(-9),
      target: { type: "company", id: "c1", label: "Empresa inteira" },
      responsibleId: "u3",
      requiresReview: false,
      tags: ["RH"],
      comments: 0,
      attachments: 1,
    },
    {
      id: "t7",
      title: "Treinamento de atendimento",
      description: "Sessão de treinamento sobre novo protocolo.",
      priority: "medium",
      status: "reopened",
      dueDate: offsetDate(-3),
      createdAt: offsetDate(-13),
      target: { type: "group", id: "g4", label: "Treinamento Interno" },
      responsibleId: "u5",
      reviewerId: "u3",
      requiresReview: true,
      tags: ["Treinamento"],
      comments: 3,
      attachments: 1,
    },
    {
      id: "t8",
      title: "Pedido de material clínico",
      description: "Reposição de estoque de suprimentos médicos.",
      priority: "high",
      status: "pending",
      dueDate: offsetDate(-1),
      createdAt: offsetDate(-8),
      target: { type: "department", id: "d4", label: "Veterinários" },
      responsibleId: "u7",
      requiresReview: false,
      tags: ["Estoque"],
      comments: 1,
      attachments: 0,
    },
  ];

  return {
    accessMode: "personal",
    company: {
      id: "c1",
      name: process.env.BOOTSTRAP_COMPANY_NAME || "Pop Organize",
      document: "00.000.000/0001-00",
      status: "active",
    },
    employees: employees.map((employee) => ({
      ...employee,
      permissionGroupId: defaultPermissionGroupId(employee, departments, groups),
    })),
    departments,
    groups,
    tasks,
    permissionGroups: initialPermissionGroups(),
    sessions: [],
    invitations: [],
  };
}

function normalizeDatabase(value: Database): Database {
  const departments = value.departments ?? [];
  const groups = value.groups ?? [];
  const permissionGroups = value.permissionGroups?.length
    ? value.permissionGroups
    : initialPermissionGroups();
  // Migration: databases created before permission groups existed get a
  // sensible group assigned based on the employee's current role/hierarchy.
  const employees = (value.employees ?? []).map((employee) =>
    employee.permissionGroupId && permissionGroups.some((g) => g.id === employee.permissionGroupId)
      ? employee
      : { ...employee, permissionGroupId: defaultPermissionGroupId(employee, departments, groups) },
  );
  return {
    ...initialDatabase(),
    ...value,
    accessMode: value.accessMode ?? "personal",
    company: { ...initialDatabase().company, ...value.company },
    employees,
    departments,
    groups,
    tasks: value.tasks ?? [],
    permissionGroups,
    sessions: value.sessions ?? [],
    invitations: value.invitations ?? [],
  };
}

function cloneDatabase(db: Database): Database {
  return JSON.parse(JSON.stringify(db)) as Database;
}

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.MYSQL_URL;
}

function getMysqlPool() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Configure a MySQL connection string.");
  }
  mysqlPool ??= mysql.createPool({
    uri: databaseUrl,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    enableKeepAlive: true,
  });
  return mysqlPool;
}

async function ensureMysqlSchema(pool: mysql.Pool) {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS app_state (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      data JSON NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function readMysqlDatabase(pool: mysql.Pool) {
  await ensureMysqlSchema(pool);
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    "SELECT data FROM app_state WHERE id = ? LIMIT 1",
    [MYSQL_STATE_ID],
  );

  if (rows.length === 0) {
    const db = initialDatabase();
    await saveMysqlDatabase(pool, db);
    return cloneDatabase(db);
  }

  const raw = rows[0]?.data;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return normalizeDatabase(parsed as Database);
}

async function saveMysqlDatabase(pool: mysql.Pool, db: Database) {
  await ensureMysqlSchema(pool);
  await pool.execute(
    `
      INSERT INTO app_state (id, data)
      VALUES (?, CAST(? AS JSON))
      ON DUPLICATE KEY UPDATE data = VALUES(data)
    `,
    [MYSQL_STATE_ID, JSON.stringify(normalizeDatabase(db))],
  );
}

export async function readDatabase(): Promise<Database> {
  const mysql = getMysqlPool();
  return readMysqlDatabase(mysql);
}

export async function saveDatabase(db: Database) {
  const mysql = getMysqlPool();
  await saveMysqlDatabase(mysql, db);
}

export async function mutateDatabase<T>(mutator: (db: Database) => T | Promise<T>) {
  const db = await readDatabase();
  const result = await mutator(db);
  await saveDatabase(db);
  return result;
}
