import crypto from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  departmentColors,
  type Company,
  type CurrentUser,
  type Department,
  type Employee,
  type Group,
  type Task,
} from "./domain";

export const DEMO_PASSWORD = "demo1234";

type EmployeeRecord = Employee & {
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
  sessions: SessionRecord[];
};

const DATA_DIR = path.resolve(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "pop-organize-db.json");
const PASSWORD_PEPPER = "pop-organize-local-demo";

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

  const employees: EmployeeRecord[] = [
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
      dueDate: "2026-06-20",
      createdAt: "2026-06-10",
      target: { type: "group", id: "g1", label: "Campanha Junho Violeta" },
      responsibleId: "u1",
      reviewerId: "u2",
      requiresReview: true,
      tags: ["Campanha", "Vídeo"],
      comments: 4,
      attachments: 2,
    },
    {
      id: "t2",
      title: "Atualizar cadastro dos clientes",
      description: "Revisar dados de contato de todos os clientes ativos.",
      priority: "medium",
      status: "pending",
      dueDate: "2026-06-25",
      createdAt: "2026-06-12",
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
      dueDate: "2026-06-15",
      createdAt: "2026-06-08",
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
      dueDate: "2026-06-18",
      createdAt: "2026-06-05",
      target: { type: "group", id: "g1", label: "Campanha Junho Violeta" },
      responsibleId: "u1",
      reviewerId: "u6",
      requiresReview: true,
      tags: ["Vídeo", "Educativo"],
      comments: 8,
      attachments: 5,
    },
    {
      id: "t5",
      title: "Fechamento financeiro mensal",
      description: "Conciliar contas e gerar relatório do mês.",
      priority: "urgent",
      status: "in_progress",
      dueDate: "2026-06-17",
      createdAt: "2026-06-11",
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
      dueDate: "2026-06-30",
      createdAt: "2026-06-13",
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
      dueDate: "2026-06-22",
      createdAt: "2026-06-09",
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
      dueDate: "2026-06-16",
      createdAt: "2026-06-14",
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

function withoutPassword(employee: EmployeeRecord): Employee {
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

export async function readDatabase(): Promise<Database> {
  try {
    const raw = await readFile(DB_FILE, "utf8");
    return normalizeDatabase(JSON.parse(raw) as Database);
  } catch (error) {
    if ((error as { code?: string }).code !== "ENOENT") {
      throw error;
    }
    const db = initialDatabase();
    await saveDatabase(db);
    return db;
  }
}

export async function saveDatabase(db: Database) {
  await mkdir(DATA_DIR, { recursive: true });
  const tempFile = `${DB_FILE}.${process.pid}.tmp`;
  await writeFile(tempFile, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  await rename(tempFile, DB_FILE);
}

export async function mutateDatabase<T>(mutator: (db: Database) => T | Promise<T>) {
  const db = await readDatabase();
  const result = await mutator(db);
  await saveDatabase(db);
  return result;
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
  return nowDate();
}
