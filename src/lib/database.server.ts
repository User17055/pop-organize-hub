import crypto from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { DEMO_PASSWORD, nextId, type Database, type SessionRecord } from "./database";
import {
  departmentColors,
  type Company,
  type Department,
  type Employee,
  type Group,
  type Task,
} from "./domain";

const PASSWORD_PEPPER = "pop-organize-local-demo";
const DATA_DIR = path.resolve(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "pop-organize-db.json");
let memoryDatabase: Database | undefined;
let didWarnMemoryFallback = false;

export function hashPassword(password: string) {
  return crypto.createHash("sha256").update(`${PASSWORD_PEPPER}:${password}`).digest("hex");
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

function initialDatabase(): Database {
  const passwordHash = hashPassword(DEMO_PASSWORD);
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
      name: "João Pereira",
      email: "joao@poporganize.com",
      role: "Admin da Empresa",
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
    company: {
      id: "c1",
      name: "Pop Organize Demo",
      document: "00.000.000/0001-00",
      status: "active",
    },
    employees,
    departments,
    groups,
    tasks,
    sessions: [],
  };
}

function normalizeDatabase(value: Database): Database {
  return {
    ...initialDatabase(),
    ...value,
    company: { ...initialDatabase().company, ...value.company },
    employees: value.employees ?? [],
    departments: value.departments ?? [],
    groups: value.groups ?? [],
    tasks: value.tasks ?? [],
    sessions: value.sessions ?? [],
  };
}

function cloneDatabase(db: Database): Database {
  return JSON.parse(JSON.stringify(db)) as Database;
}

function isMissingFileError(error: unknown) {
  return (error as { code?: string }).code === "ENOENT";
}

function canUseMemoryFallback(error: unknown) {
  const code = (error as { code?: string }).code;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    code === "EROFS" ||
    code === "EACCES" ||
    code === "EPERM" ||
    code === "ENOSYS" ||
    code === "ENOTSUP" ||
    code === "ERR_NOT_IMPLEMENTED" ||
    code === "ERR_UNSUPPORTED_ESM_URL_SCHEME" ||
    message.includes("not implemented") ||
    message.includes("read-only") ||
    error instanceof TypeError
  );
}

function rememberDatabase(db: Database) {
  memoryDatabase = cloneDatabase(normalizeDatabase(db));
  return cloneDatabase(memoryDatabase);
}

function readMemoryDatabase(reason?: unknown) {
  if (!didWarnMemoryFallback) {
    console.info(
      "Using in-memory demo database because local filesystem storage is unavailable.",
      reason,
    );
    didWarnMemoryFallback = true;
  }

  if (!memoryDatabase) {
    memoryDatabase = initialDatabase();
  }

  return cloneDatabase(memoryDatabase);
}

export async function readDatabase(): Promise<Database> {
  if (memoryDatabase) {
    return readMemoryDatabase();
  }

  let raw: string;
  try {
    raw = await readFile(DB_FILE, "utf8");
  } catch (error) {
    if (!isMissingFileError(error)) {
      if (canUseMemoryFallback(error)) return readMemoryDatabase(error);
      throw error;
    }

    const db = initialDatabase();
    try {
      await saveDatabase(db);
    } catch (saveError) {
      if (canUseMemoryFallback(saveError)) return rememberDatabase(db);
      throw saveError;
    }
    return cloneDatabase(db);
  }

  return normalizeDatabase(JSON.parse(raw) as Database);
}

export async function saveDatabase(db: Database) {
  if (memoryDatabase) {
    rememberDatabase(db);
    return;
  }

  try {
    await mkdir(DATA_DIR, { recursive: true });
    const tempFile = `${DB_FILE}.${process.pid}.tmp`;
    await writeFile(tempFile, `${JSON.stringify(db, null, 2)}\n`, "utf8");
    await rename(tempFile, DB_FILE);
  } catch (error) {
    if (!canUseMemoryFallback(error)) throw error;
    rememberDatabase(db);
  }
}

export async function mutateDatabase<T>(mutator: (db: Database) => T | Promise<T>) {
  const db = await readDatabase();
  const result = await mutator(db);
  await saveDatabase(db);
  return result;
}
