import type { Database, PlatformDatabase } from "./database";
import { createPublicKey, createVerify, randomInt, type JsonWebKey } from "node:crypto";
import { nextId, toCurrentUser } from "./database";
import {
  createCompanyWorkspace,
  createPersonalWorkspace,
  createSessionToken,
  hashToken,
  mutateDatabase,
  nextCompanyId,
  readDatabase,
  verifyGoogleCredential,
} from "./database.server";
import { allPermissionKeys, departmentColors, type PermissionKey, type Task } from "./domain";
import { hasPermission, resolvePermissionSet } from "./permission-groups";
import { canViewTask, getTaskPermissions } from "./permissions";
import { materializeRecurringTasks } from "./recurrence.server";

const MOBILE_SESSION_EXPIRY = "9999-12-31T23:59:59.999Z";
const NATIVE_SOURCE = "android";
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_CODE_RESEND_MS = 60 * 1000;
const EMAIL_CODE_MAX_ATTEMPTS = 5;
const MAX_COMPANIES_PER_OWNER = 3;
const APPLE_ISSUER = "https://appleid.apple.com";
type AppleJsonWebKey = JsonWebKey & { kid?: string };
let appleKeysCache: { expiresAt: number; keys: AppleJsonWebKey[] } | undefined;

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
  assignmentType?: string;
  assignmentTargetId?: string;
  assignmentTargetLabel?: string;
  assignees?: string[];
  checklist?: Array<{ id: string; title: string; done: boolean }>;
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
    .filter((workspace) => {
      if (workspace.company.kind === "personal") {
        return workspace.company.ownerId === userId;
      }
      return workspace.employees.some(
        (employee) => employee.id === userId && employee.status === "active",
      );
    })
    .map((workspace) => {
      const currentUser = workspace.employees.find((employee) => employee.id === userId);
      const permissionSet = resolvePermissionSet({
        currentUser,
        employees: workspace.employees,
        permissionGroups: workspace.permissionGroups,
      });
      const isCompany = (workspace.company.kind ?? "company") === "company";
      return {
        id: workspace.company.id,
        name: workspace.company.name,
        description: workspace.company.description ?? "",
        kind: workspace.company.kind ?? "company",
        isOwner: workspace.company.ownerId === userId,
        canCreateTasks: hasPermission(permissionSet, "tasks.create"),
        canAssignTasks: isCompany && hasPermission(permissionSet, "tasks.assign"),
        canManageEmployees: isCompany && hasPermission(permissionSet, "manage.employees"),
        canManageDepartments: isCompany && hasPermission(permissionSet, "manage.departments"),
        canManageGroups: isCompany && hasPermission(permissionSet, "manage.groups"),
        canManagePermissions: isCompany && hasPermission(permissionSet, "manage.permissions"),
        employees: [
          ...(isCompany
            ? workspace.employees
            : workspace.employees.filter((employee) => employee.id === userId)
          ).map((employee) => {
            const linkedAccount = platform.accounts.find(
              (account) =>
                account.id === employee.id ||
                normalizeEmail(account.email) === normalizeEmail(employee.email),
            );
            return {
              id: employee.id,
              name: employee.name,
              email: employee.email,
              photoUrl: employee.avatar || linkedAccount?.avatar || "",
              role:
                isCompany && employee.id === workspace.company.ownerId
                  ? "Proprietário"
                  : employee.role,
              isOwner: isCompany && employee.id === workspace.company.ownerId,
              sectorId: employee.departmentId,
              sector:
                workspace.departments.find((department) => department.id === employee.departmentId)
                  ?.name ?? "",
              groupIds: workspace.groups
                .filter((group) => group.memberIds.includes(employee.id))
                .map((group) => group.id),
              permissionGroupId: employee.permissionGroupId ?? "",
              pending: false,
            };
          }),
          ...workspace.invitations.map((invitation) => ({
            id: invitation.id,
            name: invitation.name,
            email: invitation.email,
            photoUrl: "",
            role: invitation.role,
            isOwner: false,
            sectorId: invitation.departmentId,
            sector:
              workspace.departments.find((department) => department.id === invitation.departmentId)
                ?.name ?? "",
            groupIds: invitation.groupIds ?? [],
            pending: true,
          })),
        ],
        sectors: workspace.departments.map((department) => ({
          id: department.id,
          name: department.name,
          description: department.description ?? "",
        })),
        groups: workspace.groups.map((group) => ({
          id: group.id,
          name: group.name,
          description: group.description ?? "",
          memberIds: group.memberIds,
        })),
        permissionGroups: workspace.permissionGroups.map((group) => ({
          id: group.id,
          name: group.name,
          description: group.description ?? "",
          permissions: group.permissions,
          isSystem: group.isSystem ?? false,
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

type AppleIdentityClaims = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
};

function decodeJwtPart<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

async function verifyAppleIdentityToken(identityToken: string) {
  const parts = identityToken.split(".");
  if (parts.length !== 3) throw mobileHttpError("Credencial Apple inválida.", 401);
  const header = decodeJwtPart<{ alg?: string; kid?: string }>(parts[0]);
  if (header.alg !== "RS256" || !header.kid) {
    throw mobileHttpError("Credencial Apple inválida.", 401);
  }

  if (!appleKeysCache || appleKeysCache.expiresAt <= Date.now()) {
    const response = await fetch("https://appleid.apple.com/auth/keys", {
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw mobileHttpError("Não foi possível validar a conta Apple.", 503);
    const body = (await response.json()) as { keys?: AppleJsonWebKey[] };
    appleKeysCache = { keys: body.keys ?? [], expiresAt: Date.now() + 60 * 60 * 1000 };
  }

  const key = appleKeysCache.keys.find((item) => item.kid === header.kid);
  if (!key) {
    appleKeysCache = undefined;
    throw mobileHttpError("Chave da credencial Apple não encontrada. Tente novamente.", 401);
  }
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${parts[0]}.${parts[1]}`);
  verifier.end();
  if (
    !verifier.verify(createPublicKey({ key, format: "jwk" }), Buffer.from(parts[2], "base64url"))
  ) {
    throw mobileHttpError("Assinatura da credencial Apple inválida.", 401);
  }

  const claims = decodeJwtPart<AppleIdentityClaims>(parts[1]);
  const expectedAudience = process.env.APPLE_CLIENT_ID?.trim() || "br.com.poporganize.app";
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (
    claims.iss !== APPLE_ISSUER ||
    !audiences.includes(expectedAudience) ||
    !claims.exp ||
    claims.exp * 1000 <= Date.now() ||
    !claims.sub
  ) {
    throw mobileHttpError("Credencial Apple expirada ou destinada a outro aplicativo.", 401);
  }
  return claims as AppleIdentityClaims & { sub: string };
}

export async function authenticateMobileApple(input: {
  identityToken: string;
  name?: string;
  email?: string;
}) {
  const appleUser = await verifyAppleIdentityToken(input.identityToken);
  const token = createSessionToken();
  // So o e-mail que vem assinado dentro do token da Apple vale para achar ou vincular conta.
  //
  // input.email vem do corpo da requisicao, ou seja, de quem chama. Antes ele era usado como
  // reserva quando o token nao trazia e-mail, e esse e-mail localizava uma conta existente e
  // recebia o vinculo -- bastava mandar um token legitimo da propria conta Apple junto do e-mail
  // de outra pessoa para sair com uma sessao valida na conta dela. Um token sem a claim de e-mail
  // e obtivel: quem monta o proprio pedido de autorizacao escolhe os escopos e pode omitir o de
  // e-mail.
  //
  // Ele continua servindo para o nome exibido, que nao decide acesso a nada.
  const tokenEmail = typeof appleUser.email === "string" ? normalizeEmail(appleUser.email) : "";

  return mutateDatabase((platform) => {
    // O sub da Apple e assinado e estavel, entao e a chave de reentrada de quem ja vinculou.
    let account = platform.accounts.find((item) => item.appleSubject === appleUser.sub);

    if (!account) {
      if (!tokenEmail) {
        throw mobileHttpError(
          "A Apple não informou o e-mail desta conta. Entre pelo método usado no cadastro e vincule a Apple depois.",
          409,
        );
      }
      account = platform.accounts.find((item) => normalizeEmail(item.email) === tokenEmail);
    }

    if (account?.appleSubject && account.appleSubject !== appleUser.sub) {
      throw mobileHttpError("Este e-mail já está vinculado a outra conta Apple.", 409);
    }
    const email = account ? normalizeEmail(account.email) : tokenEmail;
    if (!account) {
      account = {
        id: nextId("u", platform.accounts),
        name: input.name?.trim() || email.split("@")[0] || "Usuário Apple",
        email,
        passwordHash: `disabled$${hashToken(createSessionToken())}`,
        appleSubject: appleUser.sub,
        emailVerifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      platform.accounts.push(account);
      platform.workspaces.unshift(createPersonalWorkspace(account));
    } else {
      account.appleSubject = appleUser.sub;
      account.emailVerifiedAt ||= new Date().toISOString();
      if (input.name?.trim()) account.name = input.name.trim();
    }

    const personalWorkspace = platform.workspaces.find(
      (workspace) =>
        workspace.company.kind === "personal" && workspace.company.ownerId === account!.id,
    );
    if (!personalWorkspace) throw mobileHttpError("Conta sem espaço pessoal.", 409);
    platform.sessions.push({
      id: nextId("s", platform.sessions),
      tokenHash: hashToken(token),
      userId: account.id,
      activeCompanyId: personalWorkspace.company.id,
      createdAt: new Date().toISOString(),
      expiresAt: sessionExpiry(),
    });
    return {
      token,
      user: publicUser(account),
      workspaces: workspaceSummaries(platform, account.id),
    };
  });
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
      (item.company.kind === "personal"
        ? item.company.ownerId === session.userId
        : item.employees.some(
            (employee) => employee.id === session.userId && employee.status === "active",
          )),
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

export async function updateMobileAccount(request: Request, rawInput: unknown) {
  const { account } = await requireMobileWorkspace(request);
  const input =
    typeof rawInput === "object" && rawInput !== null ? (rawInput as Record<string, unknown>) : {};
  const avatar = typeof input.avatar === "string" ? input.avatar.trim() : undefined;
  if (avatar !== undefined && avatar.length > 200_000) {
    throw mobileHttpError("A foto é muito grande.", 413);
  }
  const name = typeof input.name === "string" ? input.name.trim() : undefined;
  if (name !== undefined && name.length < 2) {
    throw mobileHttpError("Informe um nome válido.");
  }

  const updated = await mutateDatabase((platform) => {
    const target = platform.accounts.find((item) => item.id === account.id);
    if (!target) throw mobileHttpError("Conta não encontrada.", 404);
    if (avatar !== undefined) target.avatar = avatar || undefined;
    if (name !== undefined) target.name = name;
    return target;
  });

  return { ok: true, user: publicUser(updated) };
}

export async function deleteMobileAccount(request: Request) {
  const { account } = await requireMobileWorkspace(request);
  await mutateDatabase((platform) => {
    const ownedCompanyIds = new Set(
      platform.workspaces
        .filter(
          (workspace) =>
            workspace.company.kind === "company" && workspace.company.ownerId === account.id,
        )
        .map((workspace) => workspace.company.id),
    );

    platform.workspaces = platform.workspaces.filter((workspace) => {
      if (workspace.company.kind === "personal" && workspace.company.ownerId === account.id) {
        return false;
      }
      if (ownedCompanyIds.has(workspace.company.id)) {
        const successor = workspace.employees.find(
          (employee) => employee.id !== account.id && employee.status === "active",
        );
        if (!successor) return false;
        workspace.company.ownerId = successor.id;
      }

      workspace.employees = workspace.employees.filter((employee) => employee.id !== account.id);
      workspace.invitations = workspace.invitations.filter(
        (invitation) => normalizeEmail(invitation.email) !== normalizeEmail(account.email),
      );
      workspace.groups = workspace.groups.map((group) => ({
        ...group,
        memberIds: group.memberIds.filter((id) => id !== account.id),
      }));
      workspace.departments = workspace.departments.map((department) => ({
        ...department,
        managerId: department.managerId === account.id ? "" : department.managerId,
      }));
      workspace.tasks = workspace.tasks.map((task) => ({
        ...task,
        assignedById: task.assignedById === account.id ? "" : task.assignedById,
        responsibleId: task.responsibleId === account.id ? "" : task.responsibleId,
        responsibleIds: task.responsibleIds?.filter((id) => id !== account.id),
      }));
      return true;
    });

    platform.accounts = platform.accounts.filter((item) => item.id !== account.id);
    platform.sessions = platform.sessions.filter((session) => session.userId !== account.id);
    platform.emailChallenges = platform.emailChallenges.filter(
      (challenge) => normalizeEmail(challenge.email) !== normalizeEmail(account.email),
    );
  });
  return { ok: true };
}

const MOBILE_INVITATION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function mobileHttpError(message: string, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

function applicationOrigin(request: Request) {
  const configuredOrigin = process.env.APP_URL?.trim();
  if (configuredOrigin) {
    try {
      return new URL(configuredOrigin).origin;
    } catch {
      throw mobileHttpError("APP_URL possui um endereço inválido.", 500);
    }
  }
  if (process.env.NODE_ENV === "production") return "https://app.poporganize.com.br";
  return new URL(request.url).origin;
}

function requiredText(value: unknown, label: string, minimum = 2) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized.length < minimum) {
    throw mobileHttpError(`${label} deve ter pelo menos ${minimum} caracteres.`);
  }
  return normalized;
}

export async function mutateMobileWorkspace(request: Request, rawInput: unknown) {
  const {
    workspace: authorizedWorkspace,
    account,
    session,
  } = await requireMobileWorkspace(request);
  const input =
    typeof rawInput === "object" && rawInput !== null ? (rawInput as Record<string, unknown>) : {};
  const action = input.action;

  if (action === "createCompany") {
    const name = requiredText(input.name, "O nome");
    const description =
      typeof input.description === "string" ? input.description.trim().slice(0, 160) : "";
    const createdCompanyId = await mutateDatabase((platform) => {
      const ownedCompanies = platform.workspaces.filter(
        (workspace) =>
          workspace.company.kind === "company" && workspace.company.ownerId === account.id,
      );
      if (ownedCompanies.length >= MAX_COMPANIES_PER_OWNER) {
        throw mobileHttpError("Você pode criar no máximo 3 empresas.", 409);
      }
      if (
        ownedCompanies.some(
          (workspace) => workspace.company.name.toLowerCase() === name.toLowerCase(),
        )
      ) {
        throw mobileHttpError("Você já possui uma empresa com este nome.", 409);
      }

      const workspace = createCompanyWorkspace(account, {
        id: nextCompanyId(platform),
        name,
        description: description || undefined,
        document: "",
      });
      platform.workspaces.push(workspace);
      const activeSession = platform.sessions.find((item) => item.id === session.id);
      if (activeSession) activeSession.activeCompanyId = workspace.company.id;
      return workspace.company.id;
    });

    return {
      ok: true,
      createdCompanyId,
      ...(await readMobileWorkspaces(request)),
    };
  }

  if ((authorizedWorkspace.company.kind ?? "company") !== "company") {
    throw mobileHttpError("Os cadastros de equipe estão disponíveis apenas em empresas.", 409);
  }
  const workspaceId = authorizedWorkspace.company.id;

  if (action === "createDepartment") {
    const name = requiredText(input.name, "O nome");
    const description = requiredText(input.description, "A descrição", 3);
    await mutateDatabase((platform) => {
      const workspace = platform.workspaces.find((item) => item.company.id === workspaceId);
      const currentUser = workspace?.employees.find(
        (employee) => employee.id === account.id && employee.status === "active",
      );
      if (!workspace || !currentUser) throw mobileHttpError("Empresa não encontrada.", 404);
      const permissionSet = resolvePermissionSet({
        currentUser,
        employees: workspace.employees,
        permissionGroups: workspace.permissionGroups,
      });
      if (!hasPermission(permissionSet, "manage.departments")) {
        throw mobileHttpError("Seu grupo de permissão não pode criar setores.", 403);
      }
      if (
        workspace.departments.some(
          (department) => department.name.toLowerCase() === name.toLowerCase(),
        )
      ) {
        throw mobileHttpError("Já existe um setor com este nome.", 409);
      }
      workspace.departments.push({
        id: nextId("d", workspace.departments),
        name,
        description,
        managerId: currentUser.id,
        color: departmentColors[workspace.departments.length % departmentColors.length],
      });
    });
  } else if (action === "createGroup") {
    const name = requiredText(input.name, "O nome");
    const description = requiredText(input.description, "A descrição", 3);
    await mutateDatabase((platform) => {
      const workspace = platform.workspaces.find((item) => item.company.id === workspaceId);
      const currentUser = workspace?.employees.find(
        (employee) => employee.id === account.id && employee.status === "active",
      );
      if (!workspace || !currentUser) throw mobileHttpError("Empresa não encontrada.", 404);
      const permissionSet = resolvePermissionSet({
        currentUser,
        employees: workspace.employees,
        permissionGroups: workspace.permissionGroups,
      });
      if (!hasPermission(permissionSet, "manage.groups")) {
        throw mobileHttpError("Seu grupo de permissão não pode criar grupos.", 403);
      }
      if (workspace.groups.some((group) => group.name.toLowerCase() === name.toLowerCase())) {
        throw mobileHttpError("Já existe um grupo com este nome.", 409);
      }
      workspace.groups.push({
        id: nextId("g", workspace.groups),
        name,
        description,
        memberIds: [],
      });
    });
  } else if (action === "createPermissionGroup" || action === "updatePermissionGroup") {
    const name = requiredText(input.name, "O nome");
    const description =
      typeof input.description === "string" ? input.description.trim().slice(0, 200) : "";
    const permissions = Array.isArray(input.permissions)
      ? input.permissions.filter((value): value is PermissionKey =>
          allPermissionKeys.includes(value as PermissionKey),
        )
      : [];
    const memberIds = Array.isArray(input.memberIds)
      ? input.memberIds.filter((value): value is string => typeof value === "string")
      : [];
    const groupId = action === "updatePermissionGroup" ? requiredText(input.id, "O grupo", 1) : "";

    await mutateDatabase((platform) => {
      const workspace = platform.workspaces.find((item) => item.company.id === workspaceId);
      const currentUser = workspace?.employees.find(
        (employee) => employee.id === account.id && employee.status === "active",
      );
      if (!workspace || !currentUser) throw mobileHttpError("Empresa não encontrada.", 404);
      const permissionSet = resolvePermissionSet({
        currentUser,
        employees: workspace.employees,
        permissionGroups: workspace.permissionGroups,
      });
      if (!hasPermission(permissionSet, "manage.permissions")) {
        throw mobileHttpError("Seu grupo de permissão não pode gerenciar permissões.", 403);
      }
      const invalidMember = memberIds.find(
        (memberId) => !workspace.employees.some((employee) => employee.id === memberId),
      );
      if (invalidMember) throw mobileHttpError("Um dos membros não foi encontrado.", 404);

      let group: (typeof workspace.permissionGroups)[number];
      if (action === "updatePermissionGroup") {
        const existing = workspace.permissionGroups.find((item) => item.id === groupId);
        if (!existing) throw mobileHttpError("Grupo de permissão não encontrado.", 404);
        existing.name = name;
        existing.description = description;
        if (!existing.isSystem) existing.permissions = permissions;
        group = existing;
      } else {
        group = {
          id: nextId("pg", workspace.permissionGroups),
          name,
          description,
          permissions,
        };
        workspace.permissionGroups.push(group);
      }
      for (const employee of workspace.employees) {
        if (memberIds.includes(employee.id)) {
          employee.permissionGroupId = group.id;
        } else if (employee.permissionGroupId === group.id) {
          employee.permissionGroupId = undefined;
        }
      }
    });
  } else if (action === "deletePermissionGroup") {
    const groupId = requiredText(input.id, "O grupo", 1);
    await mutateDatabase((platform) => {
      const workspace = platform.workspaces.find((item) => item.company.id === workspaceId);
      const currentUser = workspace?.employees.find(
        (employee) => employee.id === account.id && employee.status === "active",
      );
      if (!workspace || !currentUser) throw mobileHttpError("Empresa não encontrada.", 404);
      const permissionSet = resolvePermissionSet({
        currentUser,
        employees: workspace.employees,
        permissionGroups: workspace.permissionGroups,
      });
      if (!hasPermission(permissionSet, "manage.permissions")) {
        throw mobileHttpError("Seu grupo de permissão não pode gerenciar permissões.", 403);
      }
      const groupIndex = workspace.permissionGroups.findIndex((item) => item.id === groupId);
      if (groupIndex === -1) throw mobileHttpError("Grupo de permissão não encontrado.", 404);
      if (workspace.permissionGroups[groupIndex].isSystem) {
        throw mobileHttpError("Este grupo não pode ser excluído.", 400);
      }
      for (const employee of workspace.employees) {
        if (employee.permissionGroupId === groupId) employee.permissionGroupId = undefined;
      }
      workspace.permissionGroups.splice(groupIndex, 1);
    });
  } else if (action === "inviteEmployee") {
    const name = requiredText(input.name, "O nome");
    const email = requiredText(input.email, "O e-mail").toLowerCase();
    const role = requiredText(input.role, "O cargo");
    const departmentId = requiredText(input.departmentId, "O setor", 1);
    const groupIds = Array.isArray(input.groupIds)
      ? input.groupIds.filter((value): value is string => typeof value === "string")
      : [];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw mobileHttpError("Informe um e-mail válido.");
    }

    const invitationToken = createSessionToken();
    const result = await mutateDatabase((platform) => {
      const workspace = platform.workspaces.find((item) => item.company.id === workspaceId);
      const currentUser = workspace?.employees.find(
        (employee) => employee.id === account.id && employee.status === "active",
      );
      if (!workspace || !currentUser) throw mobileHttpError("Empresa não encontrada.", 404);
      const permissionSet = resolvePermissionSet({
        currentUser,
        employees: workspace.employees,
        permissionGroups: workspace.permissionGroups,
      });
      if (!hasPermission(permissionSet, "manage.employees")) {
        throw mobileHttpError("Seu grupo de permissão não pode cadastrar funcionários.", 403);
      }
      if (!workspace.departments.some((department) => department.id === departmentId)) {
        throw mobileHttpError("Selecione um setor válido.");
      }
      if (
        workspace.employees.some((employee) => employee.email.toLowerCase() === email) ||
        workspace.invitations.some((invitation) => invitation.email.toLowerCase() === email)
      ) {
        throw mobileHttpError("Já existe um funcionário ou convite com este e-mail.", 409);
      }
      const invitation = {
        id: nextId("i", workspace.invitations),
        tokenHash: hashToken(invitationToken),
        name,
        email,
        role,
        departmentId,
        groupIds: groupIds.filter((groupId) =>
          workspace.groups.some((group) => group.id === groupId),
        ),
        status: "active" as const,
        invitedById: currentUser.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + MOBILE_INVITATION_MAX_AGE_SECONDS * 1000).toISOString(),
      };
      workspace.invitations.push(invitation);
      return {
        invitationId: invitation.id,
        companyName: workspace.company.name,
        invitedByName: currentUser.name,
      };
    });

    const invitationUrl = `${applicationOrigin(request)}/aceitar-convite?token=${encodeURIComponent(invitationToken)}`;
    try {
      const { sendEmployeeInvitation } = await import("./email.server");
      await sendEmployeeInvitation({
        email,
        employeeName: name,
        companyName: result.companyName,
        invitedByName: result.invitedByName,
        role,
        invitationUrl,
      });
    } catch (error) {
      await mutateDatabase((platform) => {
        const workspace = platform.workspaces.find((item) => item.company.id === workspaceId);
        if (workspace) {
          workspace.invitations = workspace.invitations.filter(
            (invitation) => invitation.id !== result.invitationId,
          );
        }
      });
      throw error;
    }
  } else if (action === "updateEmployee") {
    const employeeId = requiredText(input.employeeId, "O funcionario", 1);
    const departmentId = requiredText(input.departmentId, "O setor", 1);
    const role = requiredText(input.role, "A funcao");
    const groupIds = Array.isArray(input.groupIds)
      ? input.groupIds.filter((value): value is string => typeof value === "string")
      : [];
    await mutateDatabase((platform) => {
      const workspace = platform.workspaces.find((item) => item.company.id === workspaceId);
      const currentUser = workspace?.employees.find(
        (employee) => employee.id === account.id && employee.status === "active",
      );
      if (!workspace || !currentUser) throw mobileHttpError("Empresa nao encontrada.", 404);
      const permissionSet = resolvePermissionSet({
        currentUser,
        employees: workspace.employees,
        permissionGroups: workspace.permissionGroups,
      });
      if (!hasPermission(permissionSet, "manage.employees")) {
        throw mobileHttpError("Seu grupo de permissao nao pode editar funcionarios.", 403);
      }
      if (!workspace.departments.some((department) => department.id === departmentId)) {
        throw mobileHttpError("Selecione um setor valido.");
      }
      if (groupIds.some((groupId) => !workspace.groups.some((group) => group.id === groupId))) {
        throw mobileHttpError("Selecione grupos validos.");
      }

      const employee = workspace.employees.find((item) => item.id === employeeId);
      const invitation = workspace.invitations.find((item) => item.id === employeeId);
      if (!employee && !invitation) throw mobileHttpError("Funcionario nao encontrado.", 404);
      if (employee?.id === workspace.company.ownerId) {
        throw mobileHttpError("O perfil do proprietario da empresa nao pode ser alterado.", 403);
      }
      if (employee?.id === currentUser.id) {
        throw mobileHttpError("Voce nao pode alterar o proprio perfil na empresa.", 403);
      }
      const grantsAdmin = role.toLowerCase().includes("admin");
      const alreadyAdmin = employee?.role.toLowerCase().includes("admin") ?? false;
      if (grantsAdmin && !alreadyAdmin && workspace.company.ownerId !== currentUser.id) {
        throw mobileHttpError("Apenas o proprietario pode definir outro administrador.", 403);
      }
      if (employee) {
        employee.departmentId = departmentId;
        employee.role = role;
        workspace.groups.forEach((group) => {
          group.memberIds = groupIds.includes(group.id)
            ? Array.from(new Set([...group.memberIds, employee.id]))
            : group.memberIds.filter((id) => id !== employee.id);
        });
      }
      if (invitation) {
        invitation.departmentId = departmentId;
        invitation.role = role;
        invitation.groupIds = groupIds;
      }
    });
  } else if (action === "removeEmployee") {
    const employeeId = requiredText(input.employeeId, "O funcionario", 1);
    await mutateDatabase((platform) => {
      const workspace = platform.workspaces.find((item) => item.company.id === workspaceId);
      const currentUser = workspace?.employees.find(
        (employee) => employee.id === account.id && employee.status === "active",
      );
      if (!workspace || !currentUser) throw mobileHttpError("Empresa nao encontrada.", 404);
      const permissionSet = resolvePermissionSet({
        currentUser,
        employees: workspace.employees,
        permissionGroups: workspace.permissionGroups,
      });
      if (!hasPermission(permissionSet, "manage.employees")) {
        throw mobileHttpError("Seu grupo de permissao nao pode desvincular funcionarios.", 403);
      }

      const employee = workspace.employees.find((item) => item.id === employeeId);
      const invitation = workspace.invitations.find((item) => item.id === employeeId);
      if (!employee && !invitation) throw mobileHttpError("Funcionario nao encontrado.", 404);
      if (employee?.id === workspace.company.ownerId) {
        throw mobileHttpError("O proprietario da empresa nao pode ser desvinculado.", 403);
      }
      if (employee?.id === currentUser.id) {
        throw mobileHttpError("Voce nao pode desvincular a propria conta.", 403);
      }

      if (employee) {
        workspace.employees = workspace.employees.filter((item) => item.id !== employee.id);
        workspace.groups.forEach((group) => {
          group.memberIds = group.memberIds.filter((id) => id !== employee.id);
        });
        workspace.tasks.forEach((task) => {
          if (task.responsibleId === employee.id) task.responsibleId = "";
          task.responsibleIds = (task.responsibleIds ?? []).filter((id) => id !== employee.id);
          if (!task.responsibleId && task.responsibleIds.length > 0) {
            task.responsibleId = task.responsibleIds[0];
          }
          if (task.reviewerId === employee.id) task.reviewerId = undefined;
        });
      }
      if (invitation) {
        workspace.invitations = workspace.invitations.filter((item) => item.id !== invitation.id);
      }
    });
  } else if (action === "resendInvitation") {
    const invitationId = requiredText(input.invitationId, "O convite", 1);
    const invitationToken = createSessionToken();
    const invitationTokenHash = hashToken(invitationToken);
    const result = await mutateDatabase((platform) => {
      const workspace = platform.workspaces.find((item) => item.company.id === workspaceId);
      const currentUser = workspace?.employees.find(
        (employee) => employee.id === account.id && employee.status === "active",
      );
      const invitation = workspace?.invitations.find((item) => item.id === invitationId);
      if (!workspace || !currentUser || !invitation) {
        throw mobileHttpError("Convite nao encontrado.", 404);
      }
      const permissionSet = resolvePermissionSet({
        currentUser,
        employees: workspace.employees,
        permissionGroups: workspace.permissionGroups,
      });
      if (!hasPermission(permissionSet, "manage.employees")) {
        throw mobileHttpError("Seu grupo de permissao nao pode reenviar convites.", 403);
      }
      const previous = {
        tokenHash: invitation.tokenHash,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
      };
      invitation.tokenHash = invitationTokenHash;
      invitation.invitedById = currentUser.id;
      invitation.createdAt = new Date().toISOString();
      invitation.expiresAt = new Date(
        Date.now() + MOBILE_INVITATION_MAX_AGE_SECONDS * 1000,
      ).toISOString();
      return {
        email: invitation.email,
        employeeName: invitation.name,
        role: invitation.role,
        companyName: workspace.company.name,
        invitedByName: currentUser.name,
        previous,
      };
    });
    const invitationUrl = `${applicationOrigin(request)}/aceitar-convite?token=${encodeURIComponent(invitationToken)}`;
    try {
      const { sendEmployeeInvitation } = await import("./email.server");
      await sendEmployeeInvitation({
        email: result.email,
        employeeName: result.employeeName,
        companyName: result.companyName,
        invitedByName: result.invitedByName,
        role: result.role,
        invitationUrl,
      });
    } catch (error) {
      await mutateDatabase((platform) => {
        const invitation = platform.workspaces
          .find((item) => item.company.id === workspaceId)
          ?.invitations.find((item) => item.id === invitationId);
        if (invitation?.tokenHash === invitationTokenHash) {
          invitation.tokenHash = result.previous.tokenHash;
          invitation.createdAt = result.previous.createdAt;
          invitation.expiresAt = result.previous.expiresAt;
        }
      });
      throw error;
    }
  } else {
    throw mobileHttpError("Ação de cadastro inválida.");
  }

  return {
    ok: true,
    ...(await readMobileWorkspaces(request)),
  };
}

export async function readMobileInvitations(request: Request) {
  const { platform, account } = await requireMobileWorkspace(request);
  const now = Date.now();
  return platform.workspaces.flatMap((workspace) =>
    workspace.company.kind !== "company"
      ? []
      : workspace.invitations
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

    const workspace = platform.workspaces.find(
      (item) =>
        item.company.kind === "company" &&
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
      workspace.groups.forEach((group) => {
        if (invitation.groupIds?.includes(group.id)) {
          group.memberIds = Array.from(new Set([...group.memberIds, account.id]));
        }
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

function visibleMobileTasks(workspace: Database, account: PlatformDatabase["accounts"][number]) {
  const currentUser = workspace.employees.find((employee) => employee.id === account.id);
  if (!currentUser) return [];
  const isAdministrator =
    workspace.company.ownerId === currentUser.id ||
    currentUser.role.toLocaleLowerCase("pt-BR").includes("admin");
  const currentGroupIds = new Set(
    workspace.groups
      .filter(
        (group) => group.leaderId === currentUser.id || group.memberIds.includes(currentUser.id),
      )
      .map((group) => group.id),
  );

  return workspace.tasks
    .map((task) => task as NativeTask)
    .filter((task) => {
      const canView = canViewTask({
        task,
        currentUser,
        employees: workspace.employees,
        departments: workspace.departments,
        groups: workspace.groups,
        permissionGroups: workspace.permissionGroups,
      });
      if (!canView) return false;
      if (workspace.company.kind === "personal" || isAdministrator) return true;

      const isDirectTask =
        (task.target.type === "user" && task.target.id === currentUser.id) ||
        task.responsibleId === currentUser.id ||
        (task.responsibleIds ?? []).includes(currentUser.id);
      const isDepartmentTask =
        task.target.type === "department" && task.target.id === currentUser.departmentId;
      const isGroupTask = task.target.type === "group" && currentGroupIds.has(task.target.id);

      return isDirectTask || isDepartmentTask || isGroupTask;
    })
    .map((task) => taskToMobileTask(task, workspace, currentUser));
}

export async function readMobileTasks(request: Request) {
  const { workspace: authorizedWorkspace, account } = await requireMobileWorkspace(request);
  return mutateDatabase((platform) => {
    const workspace = platform.workspaces.find(
      (item) => item.company.id === authorizedWorkspace.company.id,
    );
    const currentAccount = platform.accounts.find((item) => item.id === account.id);
    if (!workspace || !currentAccount) {
      throw Object.assign(new Error("Espaço da conta não encontrado."), { statusCode: 401 });
    }
    materializeRecurringTasks(workspace);
    return visibleMobileTasks(workspace, currentAccount);
  });
}

export type MobileTaskOrganization = {
  folders: Array<{
    id: string;
    name: string;
    parentId?: string;
    position: number;
  }>;
  lists: Array<{
    id: string;
    name: string;
    folderId?: string;
    taskIds: string[];
    position: number;
  }>;
};

export async function readMobileTaskOrganization(request: Request) {
  const { workspace, account } = await requireMobileWorkspace(request);
  return {
    folders: (workspace.taskFolders ?? [])
      .filter((folder) => folder.ownerId === account.id)
      .map(({ ownerId: _ownerId, ...folder }) => folder),
    lists: (workspace.taskLists ?? [])
      .filter((list) => list.ownerId === account.id)
      .map(({ ownerId: _ownerId, ...list }) => list),
  } satisfies MobileTaskOrganization;
}

export async function replaceMobileTaskOrganization(
  request: Request,
  organization: MobileTaskOrganization,
) {
  const { workspace: authorizedWorkspace, account } = await requireMobileWorkspace(request);
  return mutateDatabase((platform) => {
    const workspace = platform.workspaces.find(
      (item) => item.company.id === authorizedWorkspace.company.id,
    );
    const currentAccount = platform.accounts.find((item) => item.id === account.id);
    if (!workspace || !currentAccount) {
      throw Object.assign(new Error("Espaço da conta não encontrado."), { statusCode: 401 });
    }

    const folderIds = new Set(organization.folders.map((folder) => folder.id));
    const parentById = new Map(
      organization.folders.map((folder) => [folder.id, folder.parentId] as const),
    );
    for (const folder of organization.folders) {
      if (folder.parentId && !folderIds.has(folder.parentId)) {
        throw Object.assign(new Error("O grupo principal do subgrupo não existe."), {
          statusCode: 400,
        });
      }
      if (folder.parentId && parentById.get(folder.parentId)) {
        throw Object.assign(new Error("A organização aceita apenas grupo e subgrupo."), {
          statusCode: 400,
        });
      }
    }

    const visibleTaskIds = new Set(
      visibleMobileTasks(workspace, currentAccount)
        .map((task) => task.serverId)
        .filter((id): id is string => Boolean(id)),
    );
    workspace.taskFolders = [
      ...(workspace.taskFolders ?? []).filter((folder) => folder.ownerId !== account.id),
      ...organization.folders.map((folder) => ({ ...folder, ownerId: account.id })),
    ];
    workspace.taskLists = [
      ...(workspace.taskLists ?? []).filter((list) => list.ownerId !== account.id),
      ...organization.lists.map((list) => ({
        ...list,
        ownerId: account.id,
        folderId: list.folderId && folderIds.has(list.folderId) ? list.folderId : undefined,
        taskIds: Array.from(new Set(list.taskIds.filter((id) => visibleTaskIds.has(id)))),
      })),
    ];

    return {
      folders: workspace.taskFolders
        .filter((folder) => folder.ownerId === account.id)
        .map(({ ownerId: _ownerId, ...folder }) => folder),
      lists: workspace.taskLists
        .filter((list) => list.ownerId === account.id)
        .map(({ ownerId: _ownerId, ...list }) => list),
    } satisfies MobileTaskOrganization;
  });
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
  const responsibleIds = Array.from(
    new Set([task.responsibleId, ...(task.responsibleIds ?? [])].filter(Boolean)),
  ).slice(0, 3);
  const assignees = responsibleIds
    .map((id) => workspace.employees.find((employee) => employee.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const assignee = assignees.join(", ") || "Sem responsável";
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
    description: task.description === "Tarefa criada no aplicativo" ? "" : task.description,
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
    assignmentType: native?.assignmentType ?? task.target.type,
    assignmentTargetId: native?.assignmentTargetId ?? task.target.id,
    assignmentTargetLabel: native?.assignmentTargetLabel ?? task.target.label,
    assignees: native?.assignees?.slice(0, 3) ?? assignees,
    checklist: task.subtasks?.map((item) => ({
      id: item.id,
      title: item.title,
      done: item.done,
    })),
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

function mobileResponsibleId(workspace: Database, accountId: string, assignee: string) {
  const normalized = assignee.trim();
  if (!normalized || normalized.toLocaleLowerCase("pt-BR") === "sem responsável") return "";
  if (normalized.toLocaleLowerCase("pt-BR") === "eu") return accountId;
  return (
    workspace.employees.find(
      (employee) =>
        employee.name.toLocaleLowerCase("pt-BR") === normalized.toLocaleLowerCase("pt-BR") ||
        employee.email.toLocaleLowerCase("pt-BR") === normalized.toLocaleLowerCase("pt-BR"),
    )?.id ?? ""
  );
}

function mobileResponsibleIds(workspace: Database, accountId: string, item: MobileTask) {
  const names = Array.isArray(item.assignees) ? item.assignees.slice(0, 3) : [item.assignee];
  return Array.from(
    new Set(names.map((name) => mobileResponsibleId(workspace, accountId, name)).filter(Boolean)),
  ).slice(0, 3);
}

function mobileTaskTarget(
  workspace: Database,
  accountId: string,
  item: MobileTask,
): Task["target"] {
  const type = item.assignmentType;
  const id = item.assignmentTargetId?.trim() ?? "";
  const label = item.assignmentTargetLabel?.trim() ?? "";
  if (type === "company") {
    return { type: "company", id: workspace.company.id, label: label || workspace.company.name };
  }
  if (type === "department") {
    const department = workspace.departments.find(
      (candidate) => candidate.id === id || candidate.name === label,
    );
    if (department) return { type: "department", id: department.id, label: department.name };
  }
  if (type === "group") {
    const group = workspace.groups.find(
      (candidate) => candidate.id === id || candidate.name === label,
    );
    if (group) return { type: "group", id: group.id, label: group.name };
  }
  if (type === "user") {
    const employee = workspace.employees.find(
      (candidate) =>
        candidate.id === id ||
        candidate.name.toLocaleLowerCase("pt-BR") === label.toLocaleLowerCase("pt-BR"),
    );
    if (employee) return { type: "user", id: employee.id, label: employee.name };
  }
  if (workspace.company.kind === "company") {
    return {
      type: "company",
      id: workspace.company.id,
      label: workspace.company.name,
    };
  }
  return { type: "user", id: accountId, label: workspace.company.name };
}

function mobileTaskRecurrence(item: MobileTask): Task["recurrence"] {
  if (!item.recurrenceRule || item.recurrenceRule === "Não repetir") return undefined;

  const interval = Math.max(1, item.recurrenceInterval);
  const endDate =
    item.recurrenceEndMode === "Em uma data" && /^\d{4}-\d{2}-\d{2}$/.test(item.recurrenceEndValue)
      ? item.recurrenceEndValue
      : undefined;
  const dueDay = Number(item.dueDate.slice(8, 10)) || 1;
  const dueMonth = Number(item.dueDate.slice(5, 7)) || 1;

  if (item.recurrenceRule === "Diária") {
    return interval === 1
      ? { frequency: "daily", endDate }
      : { frequency: "custom", interval, intervalDays: interval, customUnit: "days", endDate };
  }
  if (item.recurrenceRule === "Semanal") {
    if (interval === 1) return { frequency: "weekly", endDate };
    if (interval === 2) return { frequency: "biweekly", endDate };
    return { frequency: "custom", interval, customUnit: "weeks", endDate };
  }
  if (item.recurrenceRule === "Mensal") {
    return {
      frequency: interval === 1 ? "monthly" : "custom",
      interval: interval === 1 ? undefined : interval,
      customUnit: interval === 1 ? undefined : "months",
      dayOfMonth: Number(item.recurrenceDetail) || dueDay,
      endDate,
    };
  }
  if (item.recurrenceRule === "Anual") {
    return {
      frequency: interval === 1 ? "yearly" : "custom",
      interval: interval === 1 ? undefined : interval,
      customUnit: interval === 1 ? undefined : "years",
      dayOfMonth: dueDay,
      monthOfYear: dueMonth,
      endDate,
    };
  }
  return { frequency: "custom", interval, intervalDays: interval, customUnit: "days", endDate };
}

function normalizeMobileTaskTitle(value: string) {
  const trimmed = value.trim();
  const withoutPopPrefix = trimmed.replace(/^POP\s*[-–—]\s*/i, "").trim();
  return withoutPopPrefix || trimmed;
}

export async function replaceMobileTasks(
  request: Request,
  tasks: MobileTask[],
  deletedServerIds: string[] = [],
) {
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
        (item.company.kind === "personal"
          ? item.company.ownerId === session.userId
          : item.employees.some(
              (employee) => employee.id === session.userId && employee.status === "active",
            )),
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
    const today = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Sao_Paulo",
    }).format(new Date());
    materializeRecurringTasks(workspace, today);
    let created = 0;
    let updated = 0;
    let deleted = 0;
    const requestedTaskOrder: string[] = [];

    for (const taskId of new Set(deletedServerIds)) {
      const taskIndex = workspace.tasks.findIndex((task) => task.id === taskId);
      if (taskIndex < 0) continue;
      const task = workspace.tasks[taskIndex];
      if (
        !canViewTask({
          task,
          currentUser,
          employees: workspace.employees,
          departments: workspace.departments,
          groups: workspace.groups,
          permissionGroups: workspace.permissionGroups,
        })
      ) {
        throw Object.assign(new Error("Você não tem acesso a uma das tarefas excluídas."), {
          statusCode: 403,
        });
      }
      const permissions = getTaskPermissions({
        task,
        currentUser,
        employees: workspace.employees,
        departments: workspace.departments,
        groups: workspace.groups,
        permissionGroups: workspace.permissionGroups,
      });
      if (!permissions.canDelete) {
        throw Object.assign(new Error("Seu grupo de permissão não pode excluir esta tarefa."), {
          statusCode: 403,
        });
      }
      workspace.tasks.splice(taskIndex, 1);
      deleted += 1;
    }

    for (const item of tasks) {
      if (
        item.completed &&
        item.recurrenceOccurrence > 1 &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.dueDate) &&
        item.dueDate > today
      ) {
        throw Object.assign(
          new Error("Uma ocorrência recorrente só pode ser concluída quando chegar a sua data."),
          { statusCode: 409 },
        );
      }
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
          existing.title = normalizeMobileTaskTitle(item.title);
          existing.description = item.description.trim();
          existing.priority = priority(item.priority);
          existing.dueDate = item.dueDate;
          const responsibleIds = mobileResponsibleIds(workspace, account.id, item);
          existing.responsibleId = responsibleIds[0] ?? "";
          existing.responsibleIds = responsibleIds;
          existing.target = mobileTaskTarget(workspace, account.id, item);
          existing.recurrence = mobileTaskRecurrence(item);
          existing.attachments = item.attachmentName ? 1 : 0;
        }
        if (currentUser.role.toLocaleLowerCase("pt-BR").includes("admin")) {
          existing.subtasks = (item.checklist ?? []).map((checklistItem, index) => ({
            id: checklistItem.id || `ts${index + 1}`,
            title: checklistItem.title,
            done: checklistItem.done,
            createdAt: new Date().toISOString(),
            completedAt: checklistItem.done ? new Date().toISOString() : undefined,
          }));
        }
        if (existing.nativeSource === NATIVE_SOURCE && existing.nativeOwnerId === account.id) {
          existing.nativeData = {
            ...item,
            title: normalizeMobileTaskTitle(item.title),
            serverId: existing.id,
          };
        }
        requestedTaskOrder.push(existing.id);
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
        title: normalizeMobileTaskTitle(item.title),
        description: item.description.trim(),
        priority: priority(item.priority),
        status: item.completed ? "completed" : "pending",
        dueDate: item.dueDate,
        createdAt: new Date().toISOString().slice(0, 10),
        target: mobileTaskTarget(workspace, account.id, item),
        responsibleId: mobileResponsibleIds(workspace, account.id, item)[0] ?? "",
        responsibleIds: mobileResponsibleIds(workspace, account.id, item),
        assignedById: account.id,
        requiresReview: false,
        tags: ["Aplicativo"],
        comments: 0,
        attachments: item.attachmentName ? 1 : 0,
        recurrence: mobileTaskRecurrence(item),
        subtasks: currentUser.role.toLocaleLowerCase("pt-BR").includes("admin")
          ? (item.checklist ?? []).map((checklistItem, index) => ({
              id: checklistItem.id || `ts${index + 1}`,
              title: checklistItem.title,
              done: checklistItem.done,
              createdAt: new Date().toISOString(),
              completedAt: checklistItem.done ? new Date().toISOString() : undefined,
            }))
          : [],
        nativeSource: NATIVE_SOURCE,
        nativeOwnerId: account.id,
        nativeData: {
          ...item,
          title: normalizeMobileTaskTitle(item.title),
        },
      };
      workspace.tasks.unshift(newTask as Task);
      requestedTaskOrder.push(newTask.id);
      created += 1;
    }

    if (requestedTaskOrder.length > 1) {
      const orderedIds = new Set(requestedTaskOrder);
      const tasksById = new Map(workspace.tasks.map((task) => [task.id, task]));
      let orderedIndex = 0;
      workspace.tasks = workspace.tasks.map((task) => {
        if (!orderedIds.has(task.id)) return task;
        const orderedTask = tasksById.get(requestedTaskOrder[orderedIndex]);
        orderedIndex += 1;
        return orderedTask ?? task;
      });
    }
    return { ok: true, count: created + updated + deleted, created, updated, deleted };
  });
}
