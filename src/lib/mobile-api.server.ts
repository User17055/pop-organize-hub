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
import { hasPermission, resolvePermissionSet } from "./permission-groups";
import { canViewTask, getTaskPermissions } from "./permissions";

const MOBILE_SESSION_EXPIRY = "9999-12-31T23:59:59.999Z";
const NATIVE_SOURCE = "android";
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_CODE_RESEND_MS = 60 * 1000;
const EMAIL_CODE_MAX_ATTEMPTS = 5;

export type MobileTask = {
  id: number;
  serverId?: string;
  title: string;
  department: string;
  dueLabel: string;
  priority: string;
  dueDate: string;
  completed: boolean;
  description: string;
  assignee: string;
  assignedBy?: string;
  createdBy?: string;
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
  canEdit?: boolean;
  canComplete?: boolean;
  canDelete?: boolean;
};

type NativeTask = Task & {
  nativeSource?: string;
  nativeOwnerId?: string;
  nativeData?: MobileTask;
  nativeRemindersByUser?: Record<string, string>;
};

function sessionExpiry() {
  return MOBILE_SESSION_EXPIRY;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function emailCodeHash(email: string, code: string) {
  return hashToken(`${email}:${code}:${process.env.AUTH_PASSWORD_PEPPER ?? "development"}`);
}

function publicUser(account: PlatformDatabase["accounts"][number]) {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    photoUrl: account.avatar ?? "",
  };
}

function workspaceSummaries(platform: PlatformDatabase, userId: string) {
  return platform.workspaces
    .filter((workspace) =>
      workspace.employees.some(
        (employee) => employee.id === userId && employee.status === "active",
      ),
    )
    .map((workspace) => {
      const currentUser = workspace.employees.find((employee) => employee.id === userId);
      const permissionSet = resolvePermissionSet({
        currentUser,
        employees: workspace.employees,
        permissionGroups: workspace.permissionGroups,
      });
      return {
        id: workspace.company.id,
        name: workspace.company.name,
        description: workspace.company.description ?? "",
        kind: workspace.company.kind ?? "company",
        canCreateTasks: hasPermission(permissionSet, "tasks.create"),
        sectors: workspace.departments.map((department) => ({
          id: department.id,
          name: department.name,
          description: department.description ?? "",
        })),
        groups: workspace.groups.map((group) => ({
          id: group.id,
          name: group.name,
          description: group.description ?? "",
        })),
      };
    });
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
        name:
          email
            .split("@")[0]
            .replace(/[._-]+/g, " ")
            .trim() || "Usuário",
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
      (workspace) =>
        workspace.company.kind === "personal" && workspace.company.ownerId === account!.id,
    );
    if (!personalWorkspace)
      throw Object.assign(new Error("Conta sem espaço pessoal."), { statusCode: 409 });

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
  const session = platform.sessions.find((item) => item.tokenHash === tokenHash);
  if (!session) throw Object.assign(new Error("Sessão expirada."), { statusCode: 401 });

  const requestedWorkspaceId = request.headers.get("x-workspace-id")?.trim();
  const workspace = platform.workspaces.find(
    (item) =>
      item.company.id === (requestedWorkspaceId || session.activeCompanyId) &&
      item.employees.some(
        (employee) => employee.id === session.userId && employee.status === "active",
      ),
  );
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
          workspace.permissionGroups.find((group) => group.id === invitation.permissionGroupId)
            ?.name ?? "Padrão",
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
    const session = platform.sessions.find((item) => item.tokenHash === tokenHash);
    const account = platform.accounts.find((item) => item.id === session?.userId);
    if (!session || !account)
      throw Object.assign(new Error("Sessão expirada."), { statusCode: 401 });

    const workspace = platform.workspaces.find((item) =>
      item.invitations.some((invitation) => invitation.id === invitationId),
    );
    const invitation = workspace?.invitations.find((item) => item.id === invitationId);
    if (!workspace || !invitation || new Date(invitation.expiresAt).getTime() <= Date.now()) {
      throw Object.assign(new Error("Convite inválido ou expirado."), { statusCode: 410 });
    }
    if (
      invitation.email.toLowerCase() !== account.email.toLowerCase() ||
      !account.emailVerifiedAt
    ) {
      throw Object.assign(new Error("Confirme o e-mail que recebeu este convite."), {
        statusCode: 403,
      });
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
  const currentUser = workspace.employees.find((employee) => employee.id === account.id);
  if (!currentUser) return [];

  return workspace.tasks
    .map((task) => task as NativeTask)
    .filter((task) =>
      canViewTask({
        task,
        currentUser,
        employees: workspace.employees,
        departments: workspace.departments,
        groups: workspace.groups,
        permissionGroups: workspace.permissionGroups,
      }),
    )
    .map((task) => taskToMobileTask(task, workspace, currentUser));
}

function mobileId(taskId: string) {
  let hash = 0;
  for (let index = 0; index < taskId.length; index += 1) {
    hash = (Math.imul(31, hash) + taskId.charCodeAt(index)) | 0;
  }
  return -(Math.abs(hash) || 1);
}

function mobilePriority(value: Task["priority"]) {
  return { low: "Baixa", medium: "Média", high: "Alta", urgent: "Urgente" }[value];
}

function mobileRecurrence(task: Task) {
  const recurrence = task.recurrence;
  if (!recurrence)
    return { rule: "Não repetir", detail: "", interval: 1, endMode: "Nunca", endValue: "" };
  const rule = {
    daily: "Diária",
    weekly: "Semanal",
    biweekly: "Semanal",
    monthly: "Mensal",
    yearly: "Anual",
    custom: "Personalizada",
  }[recurrence.frequency];
  const interval =
    recurrence.frequency === "biweekly" ? 2 : (recurrence.interval ?? recurrence.intervalDays ?? 1);
  return {
    rule,
    detail: recurrence.dayOfMonth ? String(recurrence.dayOfMonth) : "",
    interval,
    endMode: recurrence.endDate ? "Em uma data" : "Nunca",
    endValue: recurrence.endDate ?? "",
  };
}

function taskToMobileTask(
  task: NativeTask,
  workspace: Database,
  currentUser: Database["employees"][number],
): MobileTask {
  const permissions = getTaskPermissions({
    task,
    currentUser,
    employees: workspace.employees,
    departments: workspace.departments,
    groups: workspace.groups,
    permissionGroups: workspace.permissionGroups,
  });
  const native = task.nativeData;
  const recurrence = mobileRecurrence(task);
  const assignee =
    workspace.employees.find((employee) => employee.id === task.responsibleId)?.name ??
    "Sem responsável";
  const assignedBy =
    task.assignedById && task.assignedById !== currentUser.id
      ? (workspace.employees.find((employee) => employee.id === task.assignedById)?.name ?? "")
      : "";
  const creatorId = task.assignedById ?? task.nativeOwnerId;
  const createdBy = creatorId
    ? (workspace.employees.find((employee) => employee.id === creatorId)?.name ?? "")
    : "";
  return {
    id: native?.id ?? mobileId(task.id),
    serverId: task.id,
    title: task.title,
    department: task.target.label,
    dueLabel: native?.dueLabel ?? task.dueDate,
    priority: mobilePriority(task.priority),
    dueDate: task.dueDate,
    completed: task.status === "completed" || task.status === "waiting_review",
    description: task.description,
    assignee,
    assignedBy: native?.assignedBy ?? assignedBy,
    createdBy: native?.createdBy ?? createdBy,
    recurrence: native?.recurrence ?? recurrence.rule,
    reminder: task.nativeRemindersByUser?.[currentUser.id] ?? native?.reminder ?? "Sem lembrete",
    attachmentName: native?.attachmentName ?? "",
    dueTime: native?.dueTime ?? "",
    duration: native?.duration ?? "Sem duração",
    recurrenceRule: native?.recurrenceRule ?? recurrence.rule,
    recurrenceDetail: native?.recurrenceDetail ?? recurrence.detail,
    recurrenceInterval: native?.recurrenceInterval ?? recurrence.interval,
    recurrenceEndMode: native?.recurrenceEndMode ?? recurrence.endMode,
    recurrenceEndValue: native?.recurrenceEndValue ?? recurrence.endValue,
    recurrenceOccurrence: native?.recurrenceOccurrence ?? task.recurrenceOccurrence ?? 1,
    canEdit: permissions.canEditContent,
    canComplete: permissions.canComplete || permissions.canReopen,
    canDelete: permissions.canDelete,
  };
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
  const requestedWorkspaceId = request.headers.get("x-workspace-id")?.trim();

  return mutateDatabase((platform: PlatformDatabase) => {
    const session = platform.sessions.find((item) => item.tokenHash === tokenHash);
    if (!session) throw Object.assign(new Error("Sessão expirada."), { statusCode: 401 });
    const workspace = platform.workspaces.find(
      (item) =>
        item.company.id === (requestedWorkspaceId || session.activeCompanyId) &&
        item.employees.some(
          (employee) => employee.id === session.userId && employee.status === "active",
        ),
    );
    const account = platform.accounts.find((item) => item.id === session.userId);
    if (!workspace || !account) {
      throw Object.assign(new Error("Espaço da conta não encontrado."), { statusCode: 401 });
    }

    const currentUser = workspace.employees.find((employee) => employee.id === account.id);
    if (!currentUser)
      throw Object.assign(new Error("Usuário sem acesso ao espaço."), { statusCode: 403 });
    const permissionSet = resolvePermissionSet({
      currentUser,
      employees: workspace.employees,
      permissionGroups: workspace.permissionGroups,
    });
    const canCreateTasks = hasPermission(permissionSet, "tasks.create");
    const department = workspace.departments[0];
    let created = 0;
    let updated = 0;

    for (const item of tasks) {
      const existing = workspace.tasks.find((rawTask) => {
        const task = rawTask as NativeTask;
        return (
          task.id === item.serverId ||
          (task.nativeSource === NATIVE_SOURCE &&
            task.nativeOwnerId === account.id &&
            task.nativeData?.id === item.id)
        );
      }) as NativeTask | undefined;

      if (existing) {
        if (
          !canViewTask({
            task: existing,
            currentUser,
            employees: workspace.employees,
            departments: workspace.departments,
            groups: workspace.groups,
          })
        )
          continue;
        const permissions = getTaskPermissions({
          task: existing,
          currentUser,
          employees: workspace.employees,
          departments: workspace.departments,
          groups: workspace.groups,
          permissionGroups: workspace.permissionGroups,
        });
        existing.nativeRemindersByUser = {
          ...existing.nativeRemindersByUser,
          [account.id]: item.reminder,
        };
        if (
          item.completed !==
          (existing.status === "completed" || existing.status === "waiting_review")
        ) {
          if (item.completed && permissions.canComplete)
            existing.status = existing.requiresReview ? "waiting_review" : "completed";
          if (!item.completed && permissions.canReopen) existing.status = "reopened";
        }
        if (permissions.canEditContent || existing.nativeOwnerId === account.id) {
          existing.title = item.title;
          existing.description = item.description || "Tarefa criada no aplicativo";
          existing.priority = priority(item.priority);
          existing.dueDate = item.dueDate;
          existing.attachments = item.attachmentName ? 1 : 0;
        }
        if (existing.nativeSource === NATIVE_SOURCE && existing.nativeOwnerId === account.id) {
          existing.nativeData = { ...item, serverId: existing.id };
        }
        updated += 1;
        continue;
      }

      if (!canCreateTasks) {
        throw Object.assign(new Error("Seu grupo de permissão não pode criar tarefas."), {
          statusCode: 403,
        });
      }

      const newTask: NativeTask = {
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
        assignedById: account.id,
        requiresReview: false,
        tags: ["Aplicativo"],
        comments: 0,
        attachments: item.attachmentName ? 1 : 0,
        subtasks: [],
        nativeSource: NATIVE_SOURCE,
        nativeOwnerId: account.id,
        nativeData: item,
      };
      workspace.tasks.unshift(newTask as Task);
      created += 1;
    }
    return { ok: true, count: created + updated, created, updated };
  });
}
