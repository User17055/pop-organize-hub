import type { Database, PlatformDatabase } from "./database";
import { nextId, toCurrentUser } from "./database";
import {
  createPersonalWorkspace,
  createSessionToken,
  hashToken,
  mutateDatabase,
  readDatabase,
  verifyGoogleCredential,
} from "./database.server";
import type { Task } from "./domain";

const MOBILE_SESSION_SECONDS = 60 * 60 * 24 * 30;
const NATIVE_SOURCE = "android";

export type MobileTask = {
  id: number;
  title: string;
  department: string;
  dueLabel: string;
  priority: string;
  dueDate: string;
  completed: boolean;
  description: string;
  assignee: string;
  recurrence: string;
  reminder: string;
  attachmentName: string;
  dueTime: string;
  duration: string;
  recurrenceRule: string;
  recurrenceDetail: string;
  recurrenceInterval: number;
  recurrenceEndMode: string;
  recurrenceEndValue: string;
  recurrenceOccurrence: number;
};

type NativeTask = Task & {
  nativeSource?: string;
  nativeOwnerId?: string;
  nativeData?: MobileTask;
};

function sessionExpiry() {
  return new Date(Date.now() + MOBILE_SESSION_SECONDS * 1000).toISOString();
}

export async function authenticateMobileGoogle(credential: string) {
  const googleUser = await verifyGoogleCredential(credential);
  const token = createSessionToken();

  const user = await mutateDatabase((platform) => {
    let account =
      platform.accounts.find((item) => item.googleSubject === googleUser.subject) ??
      platform.accounts.find((item) => item.email.toLowerCase() === googleUser.email);

    if (account?.googleSubject && account.googleSubject !== googleUser.subject) {
      throw Object.assign(new Error("Este e-mail já está vinculado a outra conta Google."), {
        statusCode: 409,
      });
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

    const workspace =
      platform.workspaces.find(
        (item) => item.company.kind === "personal" && item.company.ownerId === account!.id,
      ) ?? createPersonalWorkspace(account);
    if (!platform.workspaces.includes(workspace)) platform.workspaces.unshift(workspace);

    const employee = workspace.employees.find((item) => item.id === account!.id);
    if (!employee) throw Object.assign(new Error("Conta sem espaço pessoal."), { statusCode: 409 });

    platform.sessions.push({
      id: nextId("s", platform.sessions),
      tokenHash: hashToken(token),
      userId: account.id,
      activeCompanyId: workspace.company.id,
      createdAt: new Date().toISOString(),
      expiresAt: sessionExpiry(),
    });
    return toCurrentUser(employee);
  });

  return { token, user };
}

async function requireMobileWorkspace(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) throw Object.assign(new Error("Sessão ausente."), { statusCode: 401 });

  const platform = await readDatabase();
  const tokenHash = hashToken(token);
  const session = platform.sessions.find(
    (item) => item.tokenHash === tokenHash && new Date(item.expiresAt).getTime() > Date.now(),
  );
  if (!session) throw Object.assign(new Error("Sessão expirada."), { statusCode: 401 });

  const workspace = platform.workspaces.find((item) => item.company.id === session.activeCompanyId);
  const account = platform.accounts.find((item) => item.id === session.userId);
  if (!workspace || !account) {
    throw Object.assign(new Error("Espaço da conta não encontrado."), { statusCode: 401 });
  }
  return { platform, workspace, account, session };
}

export async function readMobileTasks(request: Request) {
  const { workspace, account } = await requireMobileWorkspace(request);
  return workspace.tasks
    .map((task) => task as NativeTask)
    .filter(
      (task) =>
        task.nativeSource === NATIVE_SOURCE &&
        task.nativeOwnerId === account.id &&
        task.nativeData,
    )
    .map((task) => task.nativeData!);
}

function priority(value: string): Task["priority"] {
  switch (value.toLowerCase()) {
    case "alta":
      return "high";
    case "urgente":
      return "urgent";
    case "baixa":
      return "low";
    default:
      return "medium";
  }
}

export async function replaceMobileTasks(request: Request, tasks: MobileTask[]) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) throw Object.assign(new Error("Sessão ausente."), { statusCode: 401 });
  const tokenHash = hashToken(token);

  return mutateDatabase((platform: PlatformDatabase) => {
    const session = platform.sessions.find(
      (item) => item.tokenHash === tokenHash && new Date(item.expiresAt).getTime() > Date.now(),
    );
    if (!session) throw Object.assign(new Error("Sessão expirada."), { statusCode: 401 });
    const workspace = platform.workspaces.find((item) => item.company.id === session.activeCompanyId);
    const account = platform.accounts.find((item) => item.id === session.userId);
    if (!workspace || !account) {
      throw Object.assign(new Error("Espaço da conta não encontrado."), { statusCode: 401 });
    }

    const department = workspace.departments[0];
    const preserved = workspace.tasks.filter((rawTask) => {
      const task = rawTask as NativeTask;
      return task.nativeSource !== NATIVE_SOURCE || task.nativeOwnerId !== account.id;
    });
    const synced: NativeTask[] = tasks.map((item) => ({
      id: `native-${account.id}-${item.id}`,
      title: item.title,
      description: item.description || "Tarefa criada no aplicativo",
      priority: priority(item.priority),
      status: item.completed ? "completed" : "pending",
      dueDate: item.dueDate,
      createdAt: new Date().toISOString().slice(0, 10),
      target: {
        type: department ? "department" : "user",
        id: department?.id ?? account.id,
        label: department?.name ?? account.name,
      },
      responsibleId: account.id,
      requiresReview: false,
      tags: ["Aplicativo"],
      comments: 0,
      attachments: item.attachmentName ? 1 : 0,
      subtasks: [],
      nativeSource: NATIVE_SOURCE,
      nativeOwnerId: account.id,
      nativeData: item,
    }));
    workspace.tasks = [...synced, ...preserved] as Database["tasks"];
    return { ok: true, count: synced.length };
  });
}
