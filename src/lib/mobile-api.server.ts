import type { Database, PlatformDatabase } from "./database";
import { randomInt } from "node:crypto";
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
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_CODE_RESEND_MS = 60 * 1000;
const EMAIL_CODE_MAX_ATTEMPTS = 5;

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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function emailCodeHash(email: string, code: string) {
  return hashToken(`${email}:${code}:${process.env.AUTH_PASSWORD_PEPPER ?? "development"}`);
}

function publicUser(account: PlatformDatabase["accounts"][number]) {
  return { id: account.id, name: account.name, email: account.email, photoUrl: account.avatar ?? "" };
}

function workspaceSummaries(platform: PlatformDatabase, userId: string) {
  return platform.workspaces
    .filter((workspace) =>
      workspace.employees.some(
        (employee) => employee.id === userId && employee.status === "active",
      ),
    )
    .map((workspace) => ({
      id: workspace.company.id,
      name: workspace.company.name,
      description: workspace.company.description ?? "",
      kind: workspace.company.kind ?? "company",
    }));
}

export async function requestMobileEmailCode(rawEmail: string) {
  const email = normalizeEmail(rawEmail);
  const now = Date.now();
  const code = randomInt(100_000, 1_000_000).toString();

  await mutateDatabase((platform) => {
    const recent = platform.emailChallenges
      .filter((challenge) => challenge.email === email && !challenge.consumedAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (recent && now - new Date(recent.createdAt).getTime() < EMAIL_CODE_RESEND_MS) {
      throw Object.assign(new Error("Aguarde um minuto antes de solicitar outro código."), {
        statusCode: 429,
      });
    }
    platform.emailChallenges = platform.emailChallenges.filter(
      (challenge) => challenge.email !== email || Boolean(challenge.consumedAt),
    );
    platform.emailChallenges.push({
      id: nextId("ec", platform.emailChallenges),
      email,
      codeHash: emailCodeHash(email, code),
      attempts: 0,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + EMAIL_CODE_TTL_MS).toISOString(),
    });
  });

  const { sendVerificationCode } = await import("./email.server");
  const delivery = await sendVerificationCode(email, code);
  return { ok: true, expiresInSeconds: EMAIL_CODE_TTL_MS / 1000, ...delivery };
}

export async function verifyMobileEmailCode(rawEmail: string, code: string) {
  const email = normalizeEmail(rawEmail);
  const codeHash = emailCodeHash(email, code);
  const sessionToken = createSessionToken();

  return mutateDatabase((platform) => {
    const challenge = platform.emailChallenges
      .filter((item) => item.email === email && !item.consumedAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!challenge || new Date(challenge.expiresAt).getTime() <= Date.now()) {
      throw Object.assign(new Error("O código expirou. Solicite um novo."), { statusCode: 410 });
    }
    challenge.attempts += 1;
    if (challenge.attempts > EMAIL_CODE_MAX_ATTEMPTS) {
      challenge.consumedAt = new Date().toISOString();
      throw Object.assign(new Error("Muitas tentativas. Solicite um novo código."), {
        statusCode: 429,
      });
    }
    if (challenge.codeHash !== codeHash) {
      throw Object.assign(new Error("Código incorreto."), { statusCode: 401 });
    }
    challenge.consumedAt = new Date().toISOString();

    let account = platform.accounts.find((item) => item.email.toLowerCase() === email);
    if (!account) {
      account = {
        id: nextId("u", platform.accounts),
        name: email.split("@")[0].replace(/[._-]+/g, " ").trim() || "Usuário",
        email,
        passwordHash: `disabled$${hashToken(createSessionToken())}`,
        emailVerifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      platform.accounts.push(account);
      platform.workspaces.unshift(createPersonalWorkspace(account));
    } else {
      account.emailVerifiedAt = new Date().toISOString();
    }

    const personalWorkspace = platform.workspaces.find(
      (workspace) => workspace.company.kind === "personal" && workspace.company.ownerId === account!.id,
    );
    if (!personalWorkspace) throw Object.assign(new Error("Conta sem espaço pessoal."), { statusCode: 409 });

    platform.sessions = platform.sessions.filter((session) => session.userId !== account!.id);
    platform.sessions.push({
      id: nextId("s", platform.sessions),
      tokenHash: hashToken(sessionToken),
      userId: account.id,
      activeCompanyId: personalWorkspace.company.id,
      createdAt: new Date().toISOString(),
      expiresAt: sessionExpiry(),
    });

    return {
      token: sessionToken,
      user: publicUser(account),
      workspaces: workspaceSummaries(platform, account.id),
    };
  });
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
        emailVerifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      platform.accounts.push(account);
      platform.workspaces.unshift(createPersonalWorkspace(account));
    } else {
      account.googleSubject = googleUser.subject;
      account.name = googleUser.name || account.name;
      account.avatar ||= googleUser.picture;
      account.emailVerifiedAt ||= new Date().toISOString();
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

export async function readMobileWorkspaces(request: Request) {
  const { platform, account, session } = await requireMobileWorkspace(request);
  return {
    activeWorkspaceId: session.activeCompanyId,
    workspaces: workspaceSummaries(platform, account.id),
  };
}

export async function readMobileInvitations(request: Request) {
  const { platform, account } = await requireMobileWorkspace(request);
  const now = Date.now();
  return platform.workspaces.flatMap((workspace) =>
    workspace.invitations
      .filter(
        (invitation) =>
          invitation.email.toLowerCase() === account.email.toLowerCase() &&
          new Date(invitation.expiresAt).getTime() > now &&
          !workspace.employees.some((employee) => employee.id === account.id),
      )
      .map((invitation) => ({
        id: invitation.id,
        companyId: workspace.company.id,
        companyName: workspace.company.name,
        role: invitation.role,
        permissionGroupName:
          workspace.permissionGroups.find((group) => group.id === invitation.permissionGroupId)?.name ??
          "Padrão",
        expiresAt: invitation.expiresAt,
      })),
  );
}

export async function respondToMobileInvitation(
  request: Request,
  invitationId: string,
  accept: boolean,
) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) throw Object.assign(new Error("Sessão ausente."), { statusCode: 401 });
  const tokenHash = hashToken(token);

  return mutateDatabase((platform) => {
    const session = platform.sessions.find(
      (item) => item.tokenHash === tokenHash && new Date(item.expiresAt).getTime() > Date.now(),
    );
    const account = platform.accounts.find((item) => item.id === session?.userId);
    if (!session || !account) throw Object.assign(new Error("Sessão expirada."), { statusCode: 401 });

    const workspace = platform.workspaces.find((item) =>
      item.invitations.some((invitation) => invitation.id === invitationId),
    );
    const invitation = workspace?.invitations.find((item) => item.id === invitationId);
    if (!workspace || !invitation || new Date(invitation.expiresAt).getTime() <= Date.now()) {
      throw Object.assign(new Error("Convite inválido ou expirado."), { statusCode: 410 });
    }
    if (invitation.email.toLowerCase() !== account.email.toLowerCase() || !account.emailVerifiedAt) {
      throw Object.assign(new Error("Confirme o e-mail que recebeu este convite."), { statusCode: 403 });
    }

    if (accept && !workspace.employees.some((employee) => employee.id === account.id)) {
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
    return {
      ok: true,
      accepted: accept,
      activeWorkspaceId: session.activeCompanyId,
      workspaces: workspaceSummaries(platform, account.id),
    };
  });
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
