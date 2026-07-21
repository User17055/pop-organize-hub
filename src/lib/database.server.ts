import crypto from "node:crypto";
import process from "node:process";
import mysql from "mysql2/promise";
import { OAuth2Client } from "google-auth-library";

import {
  nextId,
  type AccountRecord,
  type Database,
  type PlatformDatabase,
  type SessionRecord,
} from "./database";
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
const SCRYPT_PREFIX = "scrypt";
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_OPTIONS = {
  N: 2 ** 17,
  r: 8,
  p: 1,
  maxmem: 256 * 1024 * 1024,
} as const;
const MYSQL_STATE_ID = "default";
let mysqlPool: mysql.Pool | undefined;
const googleOAuthClient = new OAuth2Client();

export async function verifyGoogleCredential(credential: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Login com Google não configurado. Defina GOOGLE_CLIENT_ID.");
  }

  const ticket = await googleOAuthClient.verifyIdToken({ idToken: credential, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || !payload.email_verified) {
    throw new Error("Não foi possível confirmar o e-mail da conta Google.");
  }

  return {
    subject: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name,
    picture: payload.picture,
  };
}

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

function getPasswordPepper() {
  const pepper = process.env.AUTH_PASSWORD_PEPPER || DEFAULT_PASSWORD_PEPPER;
  if (process.env.NODE_ENV === "production" && pepper.length < 32) {
    throw new Error("AUTH_PASSWORD_PEPPER must contain at least 32 characters in production.");
  }
  return pepper;
}

function legacyPasswordHash(password: string) {
  return crypto.createHash("sha256").update(`${getPasswordPepper()}:${password}`).digest("hex");
}

function deriveScryptKey(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(
      `${getPasswordPepper()}:${password}`,
      salt,
      SCRYPT_KEY_LENGTH,
      SCRYPT_OPTIONS,
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const derivedKey = await deriveScryptKey(password, salt);
  return [
    SCRYPT_PREFIX,
    SCRYPT_OPTIONS.N,
    SCRYPT_OPTIONS.r,
    SCRYPT_OPTIONS.p,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, storedHash: string) {
  if (!storedHash.startsWith(`${SCRYPT_PREFIX}$`)) {
    const candidate = Buffer.from(legacyPasswordHash(password), "utf8");
    const expected = Buffer.from(storedHash, "utf8");
    return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
  }

  const [prefix, nValue, rValue, pValue, saltValue, hashValue] = storedHash.split("$");
  const n = Number(nValue);
  const r = Number(rValue);
  const p = Number(pValue);
  if (
    prefix !== SCRYPT_PREFIX ||
    n !== SCRYPT_OPTIONS.N ||
    r !== SCRYPT_OPTIONS.r ||
    p !== SCRYPT_OPTIONS.p ||
    !saltValue ||
    !hashValue
  ) {
    return false;
  }

  try {
    const expected = Buffer.from(hashValue, "base64url");
    const candidate = await deriveScryptKey(password, Buffer.from(saltValue, "base64url"));
    return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

export function passwordHashNeedsUpgrade(storedHash: string) {
  return !storedHash.startsWith(`${SCRYPT_PREFIX}$`);
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

function defaultCompany(): Company {
  return {
    id: "c1",
    name: process.env.BOOTSTRAP_COMPANY_NAME || "Pop Organize",
    document: "00.000.000/0001-00",
    status: "active",
  };
}

async function initialDatabase(): Promise<Database> {
  const bootstrapAdmin = getBootstrapAdmin();
  const passwordHash = await hashPassword(bootstrapAdmin.password);

  if (process.env.BOOTSTRAP_SEED_DEMO !== "true") {
    const adminId = "u1";
    const departmentId = "d1";
    return {
      accessMode: "team",
      company: defaultCompany(),
      employees: [
        {
          id: adminId,
          name: bootstrapAdmin.name,
          email: bootstrapAdmin.email,
          role: "Administrador",
          departmentId,
          status: "active",
          passwordHash,
          permissionGroupId: "pg1",
        },
      ],
      departments: [
        {
          id: departmentId,
          name: "Administrativo",
          description: "Gestão e operações da empresa",
          managerId: adminId,
          color: departmentColors[0],
        },
      ],
      groups: [],
      tasks: [],
      permissionGroups: initialPermissionGroups(),
      sessions: [],
      invitations: [],
    };
  }

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
    company: defaultCompany(),
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
  const now = Date.now();
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
  const companyKind = value.company?.kind ?? "company";
  const ownerId =
    value.company?.ownerId ??
    employees.find((employee) => employee.role.toLowerCase().includes("admin"))?.id ??
    employees[0]?.id;
  return {
    ...value,
    accessMode: "team",
    company: {
      ...defaultCompany(),
      ...value.company,
      kind: companyKind,
      ownerId,
    },
    employees,
    departments,
    groups,
    tasks: value.tasks ?? [],
    permissionGroups,
    sessions: (value.sessions ?? []).filter(
      (session) => new Date(session.expiresAt).getTime() > now,
    ),
    invitations: (value.invitations ?? []).filter(
      (invitation) => new Date(invitation.expiresAt).getTime() > now,
    ),
  };
}

function accountFromEmployee(employee: Database["employees"][number]): AccountRecord {
  return {
    id: employee.id,
    name: employee.name,
    email: employee.email.toLowerCase(),
    avatar: employee.avatar,
    passwordHash: employee.passwordHash,
    googleSubject: employee.googleSubject,
    createdAt: new Date().toISOString(),
  };
}

export function createPersonalWorkspace(account: AccountRecord): Database {
  return {
    accessMode: "team",
    company: {
      id: `personal-${account.id}`,
      name: "Meu espaço",
      description: "Suas tarefas e organização pessoal",
      document: "",
      status: "active",
      kind: "personal",
      ownerId: account.id,
    },
    employees: [
      {
        id: account.id,
        name: account.name,
        email: account.email,
        avatar: account.avatar,
        role: "Administrador",
        departmentId: "d1",
        status: "active",
        permissionGroupId: "pg1",
        passwordHash: account.passwordHash,
        googleSubject: account.googleSubject,
      },
    ],
    departments: [
      {
        id: "d1",
        name: "Pessoal",
        description: "Suas atividades pessoais",
        managerId: account.id,
        color: departmentColors[0],
      },
    ],
    groups: [],
    tasks: [],
    permissionGroups: initialPermissionGroups(),
    sessions: [],
    invitations: [],
  };
}

export function createCompanyWorkspace(
  account: AccountRecord,
  company: Pick<Company, "id" | "name" | "description" | "document">,
): Database {
  return {
    accessMode: "team",
    company: {
      ...company,
      status: "active",
      kind: "company",
      ownerId: account.id,
    },
    employees: [
      {
        id: account.id,
        name: account.name,
        email: account.email,
        avatar: account.avatar,
        role: "Administrador",
        departmentId: "d1",
        status: "active",
        permissionGroupId: "pg1",
        passwordHash: account.passwordHash,
        googleSubject: account.googleSubject,
      },
    ],
    departments: [
      {
        id: "d1",
        name: "Administrativo",
        description: "Gestão e operações da empresa",
        managerId: account.id,
        color: departmentColors[0],
      },
    ],
    groups: [],
    tasks: [],
    permissionGroups: initialPermissionGroups(),
    sessions: [],
    invitations: [],
  };
}

export function nextCompanyId(platform: PlatformDatabase) {
  return nextId(
    "c",
    platform.workspaces.map((workspace) => ({ id: workspace.company.id })),
  );
}

function migrateLegacyDatabase(value: Database): PlatformDatabase {
  const workspace = normalizeDatabase(value);
  const accounts = workspace.employees.map(accountFromEmployee);
  const ownerId =
    workspace.company.ownerId ??
    workspace.employees.find((employee) => employee.role.toLowerCase().includes("admin"))?.id ??
    workspace.employees[0]?.id;
  workspace.company = {
    ...workspace.company,
    kind: "company",
    ownerId,
  };

  const sessions = workspace.sessions.map((session) => ({
    ...session,
    activeCompanyId: workspace.company.id,
  }));
  workspace.sessions = [];

  return {
    version: 2,
    accounts,
    workspaces: [...accounts.map(createPersonalWorkspace), workspace],
    sessions,
    emailChallenges: [],
  };
}

function normalizePlatformDatabase(value: PlatformDatabase | Database): PlatformDatabase {
  if (!("version" in value) || value.version !== 2 || !("workspaces" in value)) {
    return migrateLegacyDatabase(value as Database);
  }

  const now = Date.now();
  const accountById = new Map(value.accounts.map((account) => [account.id, account]));
  const workspaces = value.workspaces.map((rawWorkspace) => {
    const workspace = normalizeDatabase(rawWorkspace);
    workspace.sessions = [];
    workspace.employees = workspace.employees.map((employee) => {
      const account = accountById.get(employee.id);
      return account
        ? {
            ...employee,
            name: account.name,
            email: account.email,
            avatar: account.avatar,
            passwordHash: account.passwordHash,
            googleSubject: account.googleSubject,
          }
        : employee;
    });
    return workspace;
  });

  for (const account of value.accounts) {
    if (
      !workspaces.some(
        (workspace) =>
          workspace.company.kind === "personal" && workspace.company.ownerId === account.id,
      )
    ) {
      workspaces.unshift(createPersonalWorkspace(account));
    }
  }

  const validWorkspacesByAccount = new Map<string, string[]>();
  for (const workspace of workspaces) {
    for (const employee of workspace.employees) {
      if (employee.status !== "active") continue;
      const ids = validWorkspacesByAccount.get(employee.id) ?? [];
      ids.push(workspace.company.id);
      validWorkspacesByAccount.set(employee.id, ids);
    }
  }

  const sessions = (value.sessions ?? [])
    .filter(
      (session) => accountById.has(session.userId) && new Date(session.expiresAt).getTime() > now,
    )
    .map((session) => {
      const validIds = validWorkspacesByAccount.get(session.userId) ?? [];
      const personalId = workspaces.find(
        (workspace) =>
          workspace.company.kind === "personal" && workspace.company.ownerId === session.userId,
      )?.company.id;
      return {
        ...session,
        activeCompanyId: validIds.includes(session.activeCompanyId)
          ? session.activeCompanyId
          : (personalId ?? validIds[0] ?? ""),
      };
    })
    .filter((session) => Boolean(session.activeCompanyId));

  return {
    version: 2,
    accounts: value.accounts.map((account) => ({
      ...account,
      email: account.email.toLowerCase(),
      createdAt: account.createdAt ?? new Date().toISOString(),
    })),
    workspaces,
    sessions,
    emailChallenges: (value.emailChallenges ?? []).filter(
      (challenge) =>
        !challenge.consumedAt && new Date(challenge.expiresAt).getTime() > now - 60 * 60 * 1000,
    ),
  };
}

async function initialPlatformDatabase() {
  return migrateLegacyDatabase(await initialDatabase());
}

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.MYSQL_URL;
}

let runtimeEnvironmentValidated = false;

export function validateRuntimeEnvironment() {
  if (runtimeEnvironmentValidated) return;

  const databaseUrl = getDatabaseUrl();
  const errors: string[] = [];
  if (!databaseUrl) {
    errors.push("DATABASE_URL is required.");
  } else {
    try {
      const parsedUrl = new URL(databaseUrl);
      if (parsedUrl.protocol !== "mysql:") errors.push("DATABASE_URL must use the mysql protocol.");
      if (process.env.NODE_ENV === "production" && parsedUrl.username === "root") {
        errors.push("DATABASE_URL must not use the MySQL root account in production.");
      }
    } catch {
      errors.push("DATABASE_URL is not a valid MySQL connection URL.");
    }
  }

  if (process.env.NODE_ENV === "production") {
    if ((process.env.AUTH_PASSWORD_PEPPER ?? "").length < 32) {
      errors.push("AUTH_PASSWORD_PEPPER must contain at least 32 characters.");
    }
    if ((process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "").length < 12) {
      errors.push("BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters.");
    }
    if (!process.env.GOOGLE_CLIENT_ID) errors.push("GOOGLE_CLIENT_ID is required.");
    if (!process.env.VITE_GOOGLE_CLIENT_ID) errors.push("VITE_GOOGLE_CLIENT_ID is required.");
    if (
      process.env.GOOGLE_CLIENT_ID &&
      process.env.VITE_GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_ID !== process.env.VITE_GOOGLE_CLIENT_ID
    ) {
      errors.push("GOOGLE_CLIENT_ID and VITE_GOOGLE_CLIENT_ID must identify the same web client.");
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid server configuration:\n- ${errors.join("\n- ")}`);
  }
  runtimeEnvironmentValidated = true;
}

function getMysqlPool() {
  validateRuntimeEnvironment();
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

async function ensureMysqlState(pool: mysql.Pool) {
  await ensureMysqlSchema(pool);
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    "SELECT id FROM app_state WHERE id = ? LIMIT 1",
    [MYSQL_STATE_ID],
  );
  if (rows.length > 0) return;

  const db = await initialPlatformDatabase();
  await pool.execute(
    `
      INSERT IGNORE INTO app_state (id, data)
      VALUES (?, CAST(? AS JSON))
    `,
    [MYSQL_STATE_ID, JSON.stringify(normalizePlatformDatabase(db))],
  );
}

function databaseFromRow(row: mysql.RowDataPacket) {
  const raw = row.data;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return normalizePlatformDatabase(parsed as PlatformDatabase | Database);
}

async function readMysqlDatabase(pool: mysql.Pool) {
  await ensureMysqlState(pool);
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    "SELECT data FROM app_state WHERE id = ? LIMIT 1",
    [MYSQL_STATE_ID],
  );
  if (!rows[0]) throw new Error("MySQL application state could not be initialized.");
  return databaseFromRow(rows[0]);
}

async function saveMysqlDatabase(pool: mysql.Pool, db: PlatformDatabase) {
  await ensureMysqlState(pool);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("SELECT id FROM app_state WHERE id = ? FOR UPDATE", [MYSQL_STATE_ID]);
    await connection.execute("UPDATE app_state SET data = CAST(? AS JSON) WHERE id = ?", [
      JSON.stringify(normalizePlatformDatabase(db)),
      MYSQL_STATE_ID,
    ]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function readDatabase(): Promise<PlatformDatabase> {
  const mysql = getMysqlPool();
  return readMysqlDatabase(mysql);
}

export async function saveDatabase(db: PlatformDatabase) {
  const mysql = getMysqlPool();
  await saveMysqlDatabase(mysql, db);
}

export async function mutateDatabase<T>(mutator: (db: PlatformDatabase) => T | Promise<T>) {
  const pool = getMysqlPool();
  await ensureMysqlState(pool);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<mysql.RowDataPacket[]>(
      "SELECT data FROM app_state WHERE id = ? FOR UPDATE",
      [MYSQL_STATE_ID],
    );
    if (!rows[0]) throw new Error("MySQL application state is missing.");

    const db = databaseFromRow(rows[0]);
    const result = await mutator(db);
    await connection.execute("UPDATE app_state SET data = CAST(? AS JSON) WHERE id = ?", [
      JSON.stringify(normalizePlatformDatabase(db)),
      MYSQL_STATE_ID,
    ]);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function checkDatabaseHealth() {
  const pool = getMysqlPool();
  await ensureMysqlSchema(pool);
  await pool.execute("SELECT 1");
  return true;
}
