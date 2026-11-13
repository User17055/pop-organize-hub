import {
  formatDepartmentName,
  nextId,
  toCurrentUser,
  transferInvitationAssignments,
  type Database,
  type PlatformDatabase,
} from "./database";
import { createHash, createPublicKey, createVerify, randomInt, type JsonWebKey } from "node:crypto";
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
import {
  adminOnlyPermissionKeys,
  allPermissionKeys,
  departmentColors,
  type PermissionKey,
  type Task,
} from "./domain";
import { hasPermission, isAdminUser, resolvePermissionSet } from "./permission-groups";
import { setTaskStatus } from "./task-completion";
import {
  changedMobileTaskFields,
  reconcileMobileTask,
  reconcileMobileOrganization,
} from "./mobile-task-sync";
import {
  canConfigureDepartmentManager,
  canDeleteDepartment,
  canEditDepartment,
  canViewTask,
  getTaskPermissions,
  getVisibleDepartmentIds,
  getVisibleGroupIds,
} from "./permissions";
import {
  changeSeriesRecurrence,
  clampRecurrenceToSeriesEnd,
  materializeRecurringTasks,
  moveOccurrenceDate,
  moveSeriesFromOccurrence,
} from "./recurrence.server";
import { removeDepartment } from "./department-removal";
import { removeInvitation } from "./invitation-removal";
import {
  activeJustification,
  applyTaskJustification,
  JustificationError,
  parseJustificationRequest,
  saoPauloToday,
} from "./task-justification";
import { applyManagerAccess, isManagerAccessMode } from "./department-access";
import { invalidateNativeShadow } from "./native-shadow";
import { formatTaskDuration, parseTaskDuration } from "./task-duration";

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
  clientId?: string;
  title: string;
  department: string;
  dueLabel: string;
  priority: string;
  dueDate: string;
  completed: boolean;
  completedById?: string;
  completedByName?: string;
  completedAt?: string;
  description: string;
  assignee: string;
  assignedBy?: string;
  assignedById?: string;
  createdBy?: string;
  recurrence: string;
  reminder: string;
  attachmentName: string;
  attachmentUri?: string;
  attachmentMimeType?: string;
  attachmentData?: string;
  dueTime: string;
  recurrenceTimes: string[];
  duration: string;
  recurrenceRule: string;
  recurrenceDetail: string;
  recurrenceInterval: number;
  recurrenceEndMode: string;
  recurrenceEndValue: string;
  recurrenceOccurrence: number;
  // Identifica a série a que esta ocorrência pertence, para o aplicativo conseguir excluir
  // "toda a recorrência". Mesma expressão que o recurrence.server.ts usa.
  recurrenceSeriesId?: string;
  // Sem isto o aplicativo não tem como dizer "exclua só esta data": o
  // materializeRecurringTasks recria a linha apagada na chamada seguinte.
  recurrenceExcludedDates?: string[];
  // Só de leitura, como os de permissão abaixo: é daqui que o aplicativo projeta as próximas datas.
  recurrenceSlotDate?: string;
  // Pedido explícito de mudar a data de uma tarefa recorrente, com a data que o aparelho conhece. O
  // aparelho reenvia todas as tarefas, e sem isso uma data antiga de um aparelho desatualizado seria
  // igual a uma edição. Não ficam no `nativeData`: são do envio, não da tarefa.
  dateMoveFrom?: string | null;
  dateMoveScope?: "this" | "following" | null;
  canEdit?: boolean;
  canMove?: boolean;
  canAssign?: boolean;
  canManageRecurrence?: boolean;
  canComplete?: boolean;
  canCompleteAnytime?: boolean;
  canDelete?: boolean;
  // Só de leitura, calculados aqui a cada resposta. O aplicativo precisa dos dois para
  // distinguir "aguarda revisão" de "pendente" — sem eles ele mostra um círculo comum, a
  // pessoa marca, o servidor devolve para waiting_review e a marcação parece voltar sozinha.
  // Não entram no mobileTaskSchema de propósito: são do servidor para o aplicativo, e o zod
  // sem .strict() os descarta na volta, então não ficam guardados velhos dentro do nativeData.
  requiresReview?: boolean;
  isReviewer?: boolean;
  // requiresReview sozinho não basta: ele é verdadeiro tanto na tarefa que ainda não foi tocada
  // quanto na que já está esperando o revisor, e as duas chegam com completed: false. Sem
  // distinguir as duas o aplicativo não sabe se deve oferecer "concluir" ou dizer "aguarda
  // revisão". Vai como booleano, e não como o status cru, porque string de estado atravessando o
  // fio é a família de bug mais cara deste projeto — os dois lados escrevendo a mesma ideia com
  // palavras diferentes, sem ninguém reclamar em voz alta.
  awaitingReview?: boolean;
  assignmentType?: string;
  assignmentTargetId?: string;
  assignmentTargetLabel?: string;
  assignees?: string[];
  checklist?: Array<{ id: string; title: string; done: boolean }>;
  // Os anexos enviados pelo painel. Só de leitura, como os de revisão acima: o mobileTaskSchema não
  // os declara, então não voltam pela gravação e não tocam `attachmentItems`. O arquivo sai pelo
  // link de `createMobileAttachmentLink`; `fileId` vazio é anexo antigo, só com nome.
  panelAttachments?: Array<{ id: string; name: string; sizeLabel: string; fileId: string }>;
  // F11, só de leitura como os de cima: o mobileTaskSchema não os declara. `canceled` é booleano, e
  // não o status cru, pelo mesmo motivo do `awaitingReview`. `justification` é só a que vale agora
  // (`activeJustification`), então o tipo não precisa viajar: com `canceled` é "não será feita",
  // sem ele é "vou fazer depois". A gravação é pela ação `justifyTask`, nunca pelo PUT.
  canceled?: boolean;
  justification?: { text: string; authorName: string; createdAt: string };
  canJustify?: boolean;
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

function managerAccessSummary(manager: Database["employees"][number] | undefined) {
  const mode = manager?.departmentAccessMode ?? "own";
  return {
    managerAccessMode: mode,
    managerVisibleDepartmentIds: mode === "selected" ? (manager?.visibleDepartmentIds ?? []) : [],
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
      // A mesma expressao que o PUT usa para aceitar ou recusar subtarefa (ver `isAdministrator`
      // em replaceMobileTasks). Enviar o resultado pronto evita que o aplicativo tente reproduzir
      // a regra: ele so conhecia dono e cargo com "admin" no texto, e desde que `isAdminUser`
      // passou a reconhecer grupo de permissao cheio os dois lados discordavam de quem e
      // administrador -- o servidor aceitava a checklist que o aplicativo nem oferecia.
      const isAdministrator = isAdminUser({
        currentUser,
        employees: workspace.employees,
        permissionGroups: workspace.permissionGroups,
      });
      const visibleDepartmentIds = isCompany
        ? getVisibleDepartmentIds({
            currentUser,
            employees: workspace.employees,
            departments: workspace.departments,
            permissionGroups: workspace.permissionGroups,
          })
        : null;
      const visibleGroupIds = isCompany
        ? getVisibleGroupIds({
            currentUser,
            employees: workspace.employees,
            groups: workspace.groups,
            permissionGroups: workspace.permissionGroups,
          })
        : new Set<string>();
      const canManagePermissionGroups =
        isCompany &&
        (hasPermission(permissionSet, "manage.permissions") ||
          hasPermission(permissionSet, "manage.employees") ||
          hasPermission(permissionSet, "manage.employees.edit"));
      const visibleEmployeeIds = new Set(
        workspace.employees
          .filter(
            (employee) =>
              employee.id === userId ||
              !visibleDepartmentIds ||
              visibleDepartmentIds.has(employee.departmentId),
          )
          .map((employee) => employee.id),
      );
      const departmentName = (id: string) =>
        formatDepartmentName(
          workspace.departments.find((department) => department.id === id)?.name ?? "",
        );
      const departmentPermissionInput = (department: Database["departments"][number]) => ({
        department,
        currentUser,
        employees: workspace.employees,
        departments: workspace.departments,
        permissionGroups: workspace.permissionGroups,
      });
      return {
        id: workspace.company.id,
        name: workspace.company.name,
        description: workspace.company.description ?? "",
        kind: workspace.company.kind ?? "company",
        isOwner: workspace.company.ownerId === userId,
        isAdmin: isAdministrator,
        canCreateTasks: hasPermission(permissionSet, "tasks.create"),
        canAssignTasks: isCompany && hasPermission(permissionSet, "tasks.assign"),
        canViewCalendar: !isCompany || hasPermission(permissionSet, "pages.calendar"),
        canViewGroups: isCompany && hasPermission(permissionSet, "pages.groups"),
        canViewDepartments: isCompany && hasPermission(permissionSet, "pages.departments"),
        canViewReports: isCompany && hasPermission(permissionSet, "pages.reports"),
        canViewEmployees: isCompany && hasPermission(permissionSet, "pages.employees"),
        canViewCompany: isCompany && hasPermission(permissionSet, "pages.company"),
        canManageEmployees: isCompany && hasPermission(permissionSet, "manage.employees"),
        canManageDepartments: isCompany && hasPermission(permissionSet, "manage.departments"),
        canManageGroups: isCompany && hasPermission(permissionSet, "manage.groups"),
        canEditGroups: isCompany && hasPermission(permissionSet, "manage.groups.edit"),
        canDeleteGroups: isCompany && hasPermission(permissionSet, "manage.groups.delete"),
        canAssignSectorManager:
          isCompany &&
          canConfigureDepartmentManager({ currentUser, ownerId: workspace.company.ownerId }),
        canManagePermissions: isCompany && hasPermission(permissionSet, "manage.permissions"),
        employees: [
          ...(isCompany
            ? workspace.employees.filter((employee) => visibleEmployeeIds.has(employee.id))
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
              sector: departmentName(employee.departmentId),
              groupIds: workspace.groups
                .filter((group) => group.memberIds.includes(employee.id))
                .map((group) => group.id),
              permissionGroupId: employee.permissionGroupId ?? "",
              canCreateTasks: hasPermission(
                resolvePermissionSet({
                  currentUser: employee,
                  employees: workspace.employees,
                  permissionGroups: workspace.permissionGroups,
                }),
                "tasks.create",
              ),
              pending: false,
            };
          }),
          ...workspace.invitations
            .filter(
              (invitation) =>
                !isCompany ||
                !visibleDepartmentIds ||
                visibleDepartmentIds.has(invitation.departmentId),
            )
            .map((invitation) => ({
              id: invitation.id,
              name: invitation.name,
              email: invitation.email,
              photoUrl: "",
              role: invitation.role,
              isOwner: false,
              sectorId: invitation.departmentId,
              sector: departmentName(invitation.departmentId),
              groupIds: invitation.groupIds ?? [],
              permissionGroupId: invitation.permissionGroupId ?? "",
              canCreateTasks: invitation.canCreateTasks ?? false,
              pending: true,
            })),
        ],
        sectors: workspace.departments
          .filter(
            (department) =>
              !isCompany || !visibleDepartmentIds || visibleDepartmentIds.has(department.id),
          )
          .map((department) => ({
            id: department.id,
            name: formatDepartmentName(department.name),
            description: department.description ?? "",
            managedByCurrentUser: department.managerId === userId,
            managerId: department.managerId,
            // Acesso do gestor (F7), lido do funcionário que gerencia, com o mesmo default do painel.
            ...managerAccessSummary(
              workspace.employees.find((employee) => employee.id === department.managerId),
            ),
            canEdit: isCompany && canEditDepartment(departmentPermissionInput(department)),
            canDelete: isCompany && canDeleteDepartment(departmentPermissionInput(department)),
          })),
        groups: workspace.groups
          .filter((group) => !visibleGroupIds || visibleGroupIds.has(group.id))
          .map((group) => ({
            id: group.id,
            name: group.name,
            description: group.description ?? "",
            memberIds: group.memberIds,
            leaderId: group.leaderId ?? "",
          })),
        permissionGroups: (canManagePermissionGroups ? workspace.permissionGroups : []).map(
          (group) => ({
            id: group.id,
            name: group.name,
            description: group.description ?? "",
            permissions: group.permissions,
            isSystem: group.isSystem ?? false,
          }),
        ),
      };
    });
}

// Conta de demonstração da revisão da App Store: o revisor não recebe o e-mail, então o código dela
// é fixo e vem só do ambiente do servidor. Sem as duas variáveis, o login segue igual para todos.
function appReviewCode(email: string) {
  const reviewEmail = process.env.APP_REVIEW_EMAIL?.trim().toLowerCase();
  const reviewCode = process.env.APP_REVIEW_CODE?.trim();
  if (!reviewEmail || !reviewCode || !/^\d{6}$/.test(reviewCode)) return null;
  return email === reviewEmail ? reviewCode : null;
}

export async function requestMobileEmailCode(rawEmail: string) {
  const email = normalizeEmail(rawEmail);
  const now = Date.now();
  const reviewCode = appReviewCode(email);
  const code = reviewCode ?? randomInt(100_000, 1_000_000).toString();

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

  if (reviewCode) return { ok: true, expiresInSeconds: EMAIL_CODE_TTL_MS / 1000 };
  const { sendVerificationCode } = await import("./email.server");
  const delivery = await sendVerificationCode(email, code);
  return { ok: true, expiresInSeconds: EMAIL_CODE_TTL_MS / 1000, ...delivery };
}

export async function verifyMobileEmailCode(rawEmail: string, code: string) {
  const email = normalizeEmail(rawEmail);
  const codeHash = emailCodeHash(email, code);
  const sessionToken = createSessionToken();

  // As recusas saem como valor, não como throw: um throw desfaz a transação e a tentativa contada
  // em `attempts` se perderia, deixando adivinhar o código sem limite.
  const result = await mutateDatabase((platform) => {
    const challenge = platform.emailChallenges
      .filter((item) => item.email === email && !item.consumedAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!challenge || new Date(challenge.expiresAt).getTime() <= Date.now()) {
      throw Object.assign(new Error("O código expirou. Solicite um novo."), { statusCode: 410 });
    }
    challenge.attempts += 1;
    if (challenge.attempts > EMAIL_CODE_MAX_ATTEMPTS) {
      challenge.consumedAt = new Date().toISOString();
      return { refused: "Muitas tentativas. Solicite um novo código.", statusCode: 429 } as const;
    }
    if (challenge.codeHash !== codeHash) {
      return { refused: "Código incorreto.", statusCode: 401 } as const;
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
  if ("refused" in result) {
    throw Object.assign(new Error(result.refused), { statusCode: result.statusCode });
  }
  return result;
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

/**
 * Encerra a sessao do aparelho no servidor.
 *
 * Ate aqui o unico lugar em todo o servidor que removia sessao era a exclusao da conta, e o
 * signOut() do aplicativo so limpava o estado local -- o token continuava valido para sempre
 * (MOBILE_SESSION_EXPIRY e o ano 9999, de proposito). Na pratica, celular roubado ou token
 * capturado dava acesso permanente, sem remedio a nao ser apagar a conta inteira.
 *
 * Responde ok mesmo com token ausente ou desconhecido: quem chama nao precisa saber se o token
 * existia, e sair tem de funcionar sempre.
 *
 * O readDatabase antes do mutateDatabase nao e desperdicio. mutateDatabase reescreve o blob
 * inteiro toda vez que e chamado, independente do que o mutador faca, entao chama-lo com token
 * qualquer transformaria este endpoint numa amplificacao de escrita para quem nem sessao tem.
 */
export async function revokeMobileSession(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) return { ok: true };

  const tokenHash = hashToken(token);
  const platform = await readDatabase();
  if (!platform.sessions.some((session) => session.tokenHash === tokenHash)) return { ok: true };

  await mutateDatabase((db) => {
    db.sessions = db.sessions.filter((session) => session.tokenHash !== tokenHash);
  });
  return { ok: true };
}

export async function requireMobileWorkspace(request: Request, accountScope = false) {
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
      (accountScope || request.headers.get("x-workspace-kind") === "personal"
        ? item.company.kind === "personal" && item.company.ownerId === session.userId
        : item.company.id === (requestedWorkspaceId || session.activeCompanyId)) &&
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
  const { platform, account, session } = await requireMobileWorkspace(request, true);
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
  const { removeOrphanAttachmentFiles } = await import("./task-attachments.server");
  void removeOrphanAttachmentFiles();
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

/** Link curto para o aplicativo abrir no Safari um anexo enviado pelo painel. */
export async function createMobileAttachmentDownloadLink(request: Request, fileId: string) {
  const { createMobileAttachmentLink } = await import("./task-attachments.server");
  return createMobileAttachmentLink(request, fileId, applicationOrigin(request));
}

function activeCompanyMember(platform: PlatformDatabase, workspaceId: string, accountId: string) {
  const workspace = platform.workspaces.find((item) => item.company.id === workspaceId);
  const currentUser = workspace?.employees.find(
    (employee) => employee.id === accountId && employee.status === "active",
  );
  if (!workspace || !currentUser) throw mobileHttpError("Empresa não encontrada.", 404);
  return { workspace, currentUser };
}

/**
 * O aplicativo lê o rótulo do destino, não o nome atual do setor ou do grupo. Sem isto, uma tarefa
 * continuaria mostrando o nome antigo depois de renomear.
 */
function renameTaskTargets(
  workspace: Database,
  type: "department" | "group",
  id: string,
  label: string,
) {
  for (const task of workspace.tasks) {
    if (task.target.type !== type || task.target.id !== id) continue;
    task.target = { ...task.target, label };
    invalidateNativeShadow(task, "target");
  }
}

/** Tarefa de setor ou grupo excluído passa para a empresa: é o que o painel já faz com grupo. */
function moveTaskTargetsToCompany(workspace: Database, type: "department" | "group", id: string) {
  for (const task of workspace.tasks) {
    if (task.target.type !== type || task.target.id !== id) continue;
    task.target = { type: "company", id: workspace.company.id, label: workspace.company.name };
    invalidateNativeShadow(task, "target");
  }
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

  // F11. Ação própria, e não pelo PUT de tarefas: o PUT reescreve a tarefa a partir do que o
  // aparelho manda, e a justificativa e o status "Cancelada" não fazem parte do que ele manda.
  // Vale também no espaço pessoal, por isso fica antes da trava de empresa.
  if (action === "justifyTask") {
    const taskId = requiredText(input.taskId, "A tarefa", 1);
    const workspaceId = authorizedWorkspace.company.id;
    await mutateDatabase((platform) => {
      const workspace = platform.workspaces.find((item) => item.company.id === workspaceId);
      const currentUser = workspace?.employees.find(
        (employee) => employee.id === account.id && employee.status === "active",
      );
      if (!workspace || !currentUser) throw mobileHttpError("Espaço não encontrado.", 404);
      const task = workspace.tasks.find((item) => item.id === taskId);
      if (!task) throw mobileHttpError("Tarefa não encontrada.", 404);
      const permissions = getTaskPermissions({
        task,
        currentUser,
        employees: workspace.employees,
        departments: workspace.departments,
        groups: workspace.groups,
        permissionGroups: workspace.permissionGroups,
      });
      if (!permissions.canChangeStatus) {
        throw mobileHttpError("Você não tem permissão para justificar esta tarefa.", 403);
      }
      try {
        applyTaskJustification(
          task,
          parseJustificationRequest(input),
          account.id,
          new Date().toISOString(),
          saoPauloToday(),
        );
      } catch (error) {
        if (error instanceof JustificationError) {
          throw mobileHttpError(error.message, error.statusCode);
        }
        throw error;
      }
    });
    return { ok: true };
  }

  if ((authorizedWorkspace.company.kind ?? "company") !== "company") {
    throw mobileHttpError("Os cadastros de equipe estão disponíveis apenas em empresas.", 409);
  }
  const workspaceId = authorizedWorkspace.company.id;

  if (action === "createDepartment") {
    const name = formatDepartmentName(requiredText(input.name, "O nome"));
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
  } else if (action === "updateDepartment") {
    const id = requiredText(input.id, "O setor", 1);
    const name = formatDepartmentName(requiredText(input.name, "O nome").slice(0, 60));
    const description = requiredText(input.description, "A descrição", 3).slice(0, 320);
    const managerId = typeof input.managerId === "string" ? input.managerId.trim() : "";
    // Acesso do gestor (F7): opcional. Ausente, nada muda, que é o que o app antigo manda.
    if (input.managerAccessMode !== undefined && !isManagerAccessMode(input.managerAccessMode)) {
      throw mobileHttpError("Modo de acesso do gestor inválido.");
    }
    const managerAccessMode = isManagerAccessMode(input.managerAccessMode)
      ? input.managerAccessMode
      : undefined;
    const managerVisibleDepartmentIds = Array.isArray(input.managerVisibleDepartmentIds)
      ? input.managerVisibleDepartmentIds.filter((item): item is string => typeof item === "string")
      : [];
    await mutateDatabase((platform) => {
      const { workspace, currentUser } = activeCompanyMember(platform, workspaceId, account.id);
      const department = workspace.departments.find((item) => item.id === id);
      if (!department) throw mobileHttpError("Setor não encontrado.", 404);
      if (
        managerAccessMode &&
        !canConfigureDepartmentManager({ currentUser, ownerId: workspace.company.ownerId })
      ) {
        throw mobileHttpError("Somente um administrador pode alterar o acesso do gestor.", 403);
      }
      if (
        managerAccessMode === "selected" &&
        managerVisibleDepartmentIds.some(
          (departmentId) => !workspace.departments.some((item) => item.id === departmentId),
        )
      ) {
        throw mobileHttpError("Um dos setores permitidos não foi encontrado.");
      }
      if (
        !canEditDepartment({
          department,
          currentUser,
          employees: workspace.employees,
          departments: workspace.departments,
          permissionGroups: workspace.permissionGroups,
        })
      ) {
        throw mobileHttpError("Você não pode editar este setor.", 403);
      }
      if (managerId && managerId !== department.managerId) {
        if (!canConfigureDepartmentManager({ currentUser, ownerId: workspace.company.ownerId })) {
          throw mobileHttpError("Somente um administrador pode alterar o gestor.", 403);
        }
        if (
          !workspace.employees.some(
            (employee) => employee.id === managerId && employee.status === "active",
          )
        ) {
          throw mobileHttpError("Gestor não encontrado.");
        }
      }
      if (
        workspace.departments.some(
          (item) => item.id !== id && item.name.toLowerCase() === name.toLowerCase(),
        )
      ) {
        throw mobileHttpError("Já existe um setor com este nome.", 409);
      }
      const renamed = department.name !== name;
      department.name = name;
      department.description = description;
      if (managerId) department.managerId = managerId;
      if (managerAccessMode) {
        // Do gestor que fica no setor depois desta gravação, como no painel.
        const manager = workspace.employees.find((item) => item.id === department.managerId);
        if (manager) applyManagerAccess(manager, managerAccessMode, managerVisibleDepartmentIds);
      }
      if (renamed) renameTaskTargets(workspace, "department", id, name);
    });
  } else if (action === "deleteDepartment") {
    const id = requiredText(input.id, "O setor", 1);
    await mutateDatabase((platform) => {
      const { workspace, currentUser } = activeCompanyMember(platform, workspaceId, account.id);
      const result = removeDepartment(workspace, id, currentUser);
      if (!result.ok) throw mobileHttpError(result.message, result.status);
    });
  } else if (action === "updateGroup") {
    const id = requiredText(input.id, "O grupo", 1);
    const name = requiredText(input.name, "O nome");
    const description = requiredText(input.description, "A descrição", 3);
    const leaderId = typeof input.leaderId === "string" ? input.leaderId.trim() : "";
    const requestedMemberIds = Array.isArray(input.memberIds)
      ? input.memberIds.filter((item): item is string => typeof item === "string")
      : null;
    await mutateDatabase((platform) => {
      const { workspace, currentUser } = activeCompanyMember(platform, workspaceId, account.id);
      const permissionSet = resolvePermissionSet({
        currentUser,
        employees: workspace.employees,
        permissionGroups: workspace.permissionGroups,
      });
      if (!hasPermission(permissionSet, "manage.groups.edit")) {
        throw mobileHttpError("Seu grupo de permissão não pode editar grupos.", 403);
      }
      const group = workspace.groups.find((item) => item.id === id);
      if (!group) throw mobileHttpError("Grupo não encontrado.", 404);
      if (
        workspace.groups.some(
          (item) => item.id !== id && item.name.toLowerCase() === name.toLowerCase(),
        )
      ) {
        throw mobileHttpError("Já existe um grupo com este nome.", 409);
      }
      if (leaderId && !workspace.employees.some((employee) => employee.id === leaderId)) {
        throw mobileHttpError("Líder não encontrado.");
      }
      const memberIds = [
        ...new Set([...(leaderId ? [leaderId] : []), ...(requestedMemberIds ?? group.memberIds)]),
      ];
      // Quem já estava no grupo continua aceito mesmo sem ser funcionário: convite pendente fica
      // na lista de membros até ser aceito.
      if (
        memberIds.some(
          (memberId) =>
            !group.memberIds.includes(memberId) &&
            !workspace.employees.some((employee) => employee.id === memberId),
        )
      ) {
        throw mobileHttpError("Um dos membros não foi encontrado.");
      }
      const renamed = group.name !== name;
      group.name = name;
      group.description = description;
      group.leaderId = leaderId || undefined;
      group.memberIds = memberIds;
      if (renamed) renameTaskTargets(workspace, "group", id, name);
    });
  } else if (action === "deleteGroup") {
    const id = requiredText(input.id, "O grupo", 1);
    await mutateDatabase((platform) => {
      const { workspace, currentUser } = activeCompanyMember(platform, workspaceId, account.id);
      const permissionSet = resolvePermissionSet({
        currentUser,
        employees: workspace.employees,
        permissionGroups: workspace.permissionGroups,
      });
      if (!hasPermission(permissionSet, "manage.groups.delete")) {
        throw mobileHttpError("Seu grupo de permissão não pode excluir grupos.", 403);
      }
      if (!workspace.groups.some((group) => group.id === id)) {
        throw mobileHttpError("Grupo não encontrado.", 404);
      }
      workspace.groups = workspace.groups.filter((group) => group.id !== id);
      moveTaskTargetsToCompany(workspace, "group", id);
    });
  } else if (action === "createPermissionGroup" || action === "updatePermissionGroup") {
    const name = requiredText(input.name, "O nome");
    const description =
      typeof input.description === "string" ? input.description.trim().slice(0, 200) : "";
    const permissions = Array.isArray(input.permissions)
      ? input.permissions.filter(
          (value): value is PermissionKey =>
            allPermissionKeys.includes(value as PermissionKey) &&
            !adminOnlyPermissionKeys.includes(value as PermissionKey),
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
    const requestedPermissionGroupId =
      typeof input.permissionGroupId === "string" ? input.permissionGroupId : "";
    const canCreateTasks = typeof input.canCreateTasks === "boolean" ? input.canCreateTasks : true;
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
      const permissionGroupId =
        requestedPermissionGroupId ||
        workspace.permissionGroups.find(
          (group) => group.name.toLocaleLowerCase("pt-BR") === "colaborador",
        )?.id;
      if (
        permissionGroupId &&
        !workspace.permissionGroups.some((group) => group.id === permissionGroupId)
      ) {
        throw mobileHttpError("Selecione um grupo de permissao valido.");
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
        permissionGroupId,
        canCreateTasks,
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
    const permissionGroupId =
      typeof input.permissionGroupId === "string"
        ? input.permissionGroupId || undefined
        : undefined;
    const canCreateTasks =
      typeof input.canCreateTasks === "boolean" ? input.canCreateTasks : undefined;
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
      if (
        permissionGroupId &&
        !workspace.permissionGroups.some((group) => group.id === permissionGroupId)
      ) {
        throw mobileHttpError("Selecione um grupo de permissao valido.");
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
      if (employee) {
        employee.departmentId = departmentId;
        employee.role = role;
        if (typeof input.permissionGroupId === "string") {
          employee.permissionGroupId = permissionGroupId;
        }
        if (canCreateTasks !== undefined) employee.canCreateTasks = canCreateTasks;
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
        if (typeof input.permissionGroupId === "string") {
          invitation.permissionGroupId = permissionGroupId;
        }
        if (canCreateTasks !== undefined) invitation.canCreateTasks = canCreateTasks;
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
      if (invitation) removeInvitation(workspace, invitation.id);
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
  const { platform, account } = await requireMobileWorkspace(request, true);
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
        canCreateTasks: invitation.canCreateTasks,
        passwordHash: account.passwordHash,
        googleSubject: account.googleSubject,
      });
      workspace.groups.forEach((group) => {
        if (invitation.groupIds?.includes(group.id)) {
          group.memberIds = Array.from(new Set([...group.memberIds, account.id]));
        }
      });
    }
    if (accept) transferInvitationAssignments(workspace, invitation.id, account.id);
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

export async function readMobileTasks(request: Request) {
  const { workspace, account } = await requireMobileWorkspace(request);
  if (materializeRecurringTasks(workspace) === 0) {
    return visibleMobileTasks(workspace, account);
  }

  // Recorrencias so exigem gravacao quando uma nova ocorrencia foi criada. Consultas normais de
  // sincronizacao permanecem somente leitura, evitando bloquear e regravar todo o JSON do banco.
  return mutateDatabase((platform) => {
    const currentWorkspace = platform.workspaces.find(
      (item) => item.company.id === workspace.company.id,
    );
    const currentAccount = platform.accounts.find((item) => item.id === account.id);
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer\s+(.+)$/i)?.[1]
      ?.trim();
    const session =
      token &&
      platform.sessions.find(
        (item) => item.tokenHash === hashToken(token) && item.userId === account.id,
      );
    const stillAuthorized =
      currentWorkspace &&
      (currentWorkspace.company.kind === "personal"
        ? currentWorkspace.company.ownerId === account.id
        : currentWorkspace.employees.some(
            (employee) => employee.id === account.id && employee.status === "active",
          ));
    if (!currentWorkspace || !currentAccount || !session || !stillAuthorized) {
      throw Object.assign(new Error("Espaco da conta nao encontrado."), { statusCode: 401 });
    }
    materializeRecurringTasks(currentWorkspace);
    return visibleMobileTasks(currentWorkspace, currentAccount);
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
  baseOrganization?: MobileTaskOrganization,
  syncRequest?: { mutationId: string; policy: "arrival" },
) {
  const digest = syncRequest
    ? createHash("sha256").update(JSON.stringify({ organization, baseOrganization })).digest("hex")
    : undefined;
  const { workspace: authorizedWorkspace, account } = await requireMobileWorkspace(request);
  return mutateDatabase((platform) => {
    const workspace = platform.workspaces.find(
      (item) => item.company.id === authorizedWorkspace.company.id,
    );
    const currentAccount = platform.accounts.find((item) => item.id === account.id);
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer\s+(.+)$/i)?.[1]
      ?.trim();
    const session =
      token &&
      platform.sessions.find(
        (item) => item.tokenHash === hashToken(token) && item.userId === account.id,
      );
    const authorized =
      workspace &&
      (workspace.company.kind === "personal"
        ? workspace.company.ownerId === account.id
        : workspace.employees.some(
            (employee) => employee.id === account.id && employee.status === "active",
          ));
    if (!workspace || !currentAccount || !session || !authorized) {
      throw Object.assign(new Error("Espaço da conta não encontrado."), { statusCode: 401 });
    }

    const currentOrganization = () => ({
      folders: (workspace.taskFolders ?? [])
        .filter((folder) => folder.ownerId === account.id)
        .map(({ ownerId: _ownerId, ...row }) => row),
      lists: (workspace.taskLists ?? [])
        .filter((list) => list.ownerId === account.id)
        .map(({ ownerId: _ownerId, ...row }) => row),
    });
    if (syncRequest) {
      if (!baseOrganization)
        throw Object.assign(new Error("Envio sem versão de origem."), { statusCode: 400 });
      const receipt = workspace.mobileTaskSyncMutations?.["org:" + syncRequest.mutationId];
      if (receipt) {
        if (receipt.actorId !== account.id || receipt.digest !== digest)
          throw Object.assign(new Error("Identificação de envio reutilizada."), {
            statusCode: 409,
          });
        return {
          ...currentOrganization(),
          ok: true,
          mutationId: syncRequest.mutationId,
          replayed: true,
        };
      }
      organization = reconcileMobileOrganization(
        baseOrganization,
        organization,
        currentOrganization(),
      );
    }
    if (baseOrganization && !syncRequest) {
      const canonical = (value: MobileTaskOrganization) =>
        JSON.stringify({
          folders: value.folders.map((folder) => [
            folder.id,
            folder.name.trim(),
            folder.parentId ?? "",
            folder.position,
          ]),
          lists: value.lists.map((list) => [
            list.id,
            list.name.trim(),
            list.folderId ?? "",
            list.taskIds,
            list.position,
          ]),
        });
      const current = {
        folders: (workspace.taskFolders ?? []).filter((folder) => folder.ownerId === account.id),
        lists: (workspace.taskLists ?? []).filter((list) => list.ownerId === account.id),
      };
      if (
        canonical(baseOrganization) !== canonical(current) &&
        canonical(organization) !== canonical(current)
      ) {
        throw Object.assign(
          new Error(
            "As pastas ou listas foram alteradas em outro aparelho. Abra Sincronização para escolher uma versão.",
          ),
          { statusCode: 409 },
        );
      }
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
    if (
      baseOrganization &&
      organization.lists.some((list) =>
        list.taskIds.some((id) => /^\d+$/.test(id) && !visibleTaskIds.has(id)),
      )
    ) {
      throw Object.assign(
        new Error("Aguarde as tarefas locais serem sincronizadas antes de enviar a lista."),
        { statusCode: 409 },
      );
    }
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

    if (syncRequest) {
      workspace.mobileTaskSyncMutations ??= {};
      workspace.mobileTaskSyncMutations["org:" + syncRequest.mutationId] = {
        actorId: account.id,
        digest: digest!,
      };
    }
    return {
      folders: workspace.taskFolders
        .filter((folder) => folder.ownerId === account.id)
        .map(({ ownerId: _ownerId, ...folder }) => folder),
      lists: workspace.taskLists
        .filter((list) => list.ownerId === account.id)
        .map(({ ownerId: _ownerId, ...list }) => list),
      ...(syncRequest ? { ok: true, mutationId: syncRequest.mutationId, replayed: false } : {}),
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
  const dayTokens = ["S", "T", "Q", "Q2", "S2", "Sá", "D"];
  return {
    rule,
    detail:
      (recurrence.frequency === "daily" ? recurrence.excludedWeekDays : recurrence.weekDays)
        ?.map((day) => dayTokens[day - 1])
        .filter(Boolean)
        .join(",") ?? (recurrence.dayOfMonth ? String(recurrence.dayOfMonth) : ""),
    interval,
    endMode: recurrence.endDate ? "Em uma data" : "Nunca",
    endValue: recurrence.endDate ?? "",
  };
}

/**
 * Os campos de recorrência como o aparelho os recebe. O `nativeData` vence o campo real (ver
 * `native-shadow.ts`), com uma exceção: numa série encerrada porque a regra mudou, o fim gravado
 * pelo servidor vence. Sem isso o aparelho, que reenvia "Nunca" a cada sincronização, voltaria a
 * desenhar as ocorrências da regra antiga.
 */
function mobileRecurrenceWire(task: NativeTask) {
  const native = task.nativeData;
  const recurrence = mobileRecurrence(task);
  const closed = Boolean(task.recurrenceSeriesEndDate);
  return {
    recurrenceRule: native?.recurrenceRule ?? recurrence.rule,
    recurrenceDetail: native?.recurrenceDetail ?? recurrence.detail,
    recurrenceInterval: native?.recurrenceInterval ?? recurrence.interval,
    recurrenceEndMode: closed
      ? recurrence.endMode
      : (native?.recurrenceEndMode ?? recurrence.endMode),
    recurrenceEndValue: closed
      ? recurrence.endValue
      : (native?.recurrenceEndValue ?? recurrence.endValue),
  };
}

/**
 * O aparelho mudou a cadência desta tarefa? Compara com o que o servidor enviou a ele. Fim e
 * horários ficam de fora de propósito: não mudam as datas da série, e a série encerrada recebe de
 * volta o "Nunca" antigo a cada sincronização.
 */
function mobileCadenceChanged(item: MobileTask, task: NativeTask) {
  const sent = mobileRecurrenceWire(task);
  return (
    item.recurrenceRule !== sent.recurrenceRule ||
    item.recurrenceDetail !== sent.recurrenceDetail ||
    Number(item.recurrenceInterval) !== Number(sent.recurrenceInterval)
  );
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
  const isNativeOwner = task.nativeOwnerId === currentUser.id;
  const recurrence = mobileRecurrence(task);
  const recurrenceWire = mobileRecurrenceWire(task);
  const responsibleIds = Array.from(
    new Set([task.responsibleId, ...(task.responsibleIds ?? [])].filter(Boolean)),
  ).slice(0, 3);
  const assignees = responsibleIds
    .map(
      (id) =>
        workspace.employees.find((employee) => employee.id === id)?.name ??
        workspace.invitations.find((invitation) => invitation.id === id)?.name,
    )
    .filter((name): name is string => Boolean(name));
  const assignee = assignees.join(", ") || "Sem responsável";
  const canReadPrivateAttachment = canReadNativeAttachment(workspace, task, currentUser);
  const assignedBy =
    task.assignedById && task.assignedById !== currentUser.id
      ? (workspace.employees.find((employee) => employee.id === task.assignedById)?.name ?? "")
      : "";
  const justification = activeJustification(task);
  const creatorId = task.assignedById ?? task.nativeOwnerId;
  const createdBy = creatorId
    ? (workspace.employees.find((employee) => employee.id === creatorId)?.name ?? "")
    : "";
  return {
    id: native?.id ?? mobileId(task.id),
    serverId: task.id,
    clientId: native?.clientId ?? "",
    title: task.title,
    department: task.target.label,
    dueLabel: native?.dueLabel ?? task.dueDate,
    priority: mobilePriority(task.priority),
    dueDate: task.dueDate,
    completed: task.status === "completed",
    completedById: task.status === "completed" ? task.completedById ?? "" : "",
    completedByName: task.status === "completed" ? task.completedByName ?? "" : "",
    completedAt: task.status === "completed" ? task.completedAt ?? "" : "",
    description: task.description === "Tarefa criada no aplicativo" ? "" : task.description,
    assignee,
    assignedBy: native?.assignedBy ?? assignedBy,
    // Só leitura: o schema de entrada não tem este campo, então ele nunca volta pela gravação. Vem
    // da tarefa e não do nativeData, para o filtro "Empresa" dos aplicativos usar a mesma regra do
    // painel (`taskMatchesCompany`: destino empresa e criada pelo usuário atual).
    assignedById: task.assignedById ?? "",
    createdBy: native?.createdBy ?? createdBy,
    recurrence: native?.recurrence ?? recurrence.rule,
    reminder: task.nativeRemindersByUser?.[currentUser.id] ?? native?.reminder ?? "Sem lembrete",
    attachmentName: canReadPrivateAttachment ? (native?.attachmentName ?? "") : "",
    attachmentUri: canReadPrivateAttachment ? (native?.attachmentUri ?? "") : "",
    attachmentMimeType: canReadPrivateAttachment ? (native?.attachmentMimeType ?? "") : "",
    attachmentData: canReadPrivateAttachment ? (native?.attachmentData ?? "") : "",
    dueTime: native?.dueTime ?? task.dueTime ?? "",
    recurrenceTimes: native?.recurrenceTimes ?? task.recurrence?.times ?? [],
    duration:
      task.durationMinutes != null
        ? formatTaskDuration(task.durationMinutes)
        : (native?.duration ?? "Sem duração"),
    ...recurrenceWire,
    recurrenceOccurrence: native?.recurrenceOccurrence ?? task.recurrenceOccurrence ?? 1,
    recurrenceSeriesId: task.recurrenceParentId ?? task.id,
    recurrenceExcludedDates: task.recurrenceExcludedDates ?? [],
    recurrenceSlotDate: task.recurrenceSlotDate ?? "",
    // O dono nativo pode editar a própria tarefa mesmo sem as permissões do painel: é a mesma
    // exceção que o PUT aplica ao gravar, e os dois lados precisam dizer a mesma coisa.
    canEdit: permissions.canEditContent || isNativeOwner,
    canMove: permissions.canMove || isNativeOwner,
    canAssign: permissions.canAssign || isNativeOwner,
    canManageRecurrence: permissions.canManageRecurrence || isNativeOwner,
    canComplete: task.status === "completed" ? permissions.canReopen : permissions.canComplete,
    canCompleteAnytime: permissions.canCompleteAnytime,
    canDelete: permissions.canDelete,
    requiresReview: task.requiresReview ?? false,
    // O administrador pode resolver qualquer fila de revisão, mesmo quando outro superior foi
    // escolhido como revisor principal. O aplicativo usa este campo para concluir de fato em vez
    // de reenviar a tarefa para a mesma fila.
    isReviewer: permissions.canApproveReview,
    awaitingReview: task.status === "waiting_review",
    assignmentType: native?.assignmentType ?? task.target.type,
    assignmentTargetId: native?.assignmentTargetId ?? task.target.id,
    assignmentTargetLabel: native?.assignmentTargetLabel ?? task.target.label,
    assignees: native?.assignees?.slice(0, 3) ?? assignees,
    checklist: task.subtasks?.map((item) => ({
      id: item.id,
      title: item.title,
      done: item.done,
    })),
    panelAttachments: (task.attachmentItems ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      sizeLabel: item.sizeLabel,
      fileId: item.fileId ?? "",
    })),
    canceled: task.status === "canceled",
    justification: justification
      ? {
          text: justification.text,
          authorName:
            workspace.employees.find((employee) => employee.id === justification.authorId)?.name ??
            "",
          createdAt: justification.updatedAt ?? justification.createdAt,
        }
      : undefined,
    canJustify: permissions.canChangeStatus,
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
    )?.id ??
    workspace.invitations.find(
      (invitation) =>
        invitation.name.toLocaleLowerCase("pt-BR") === normalized.toLocaleLowerCase("pt-BR") ||
        invitation.email.toLocaleLowerCase("pt-BR") === normalized.toLocaleLowerCase("pt-BR"),
    )?.id ??
    ""
  );
}

// O anexo enviado pelo aparelho e privado: so o le quem o enviou, o responsavel, o admin e o
// dono do espaco pessoal. Quem le vazio reenvia vazio, entao a gravacao usa a mesma regra para
// nao apagar nem descontar o anexo que aquela pessoa nunca recebeu.
function canReadNativeAttachment(
  workspace: Database,
  task: NativeTask,
  currentUser: Database["employees"][number],
) {
  const responsibleIds = [task.responsibleId, ...(task.responsibleIds ?? [])].filter(Boolean);
  return (
    (workspace.company.kind === "personal" && workspace.company.ownerId === currentUser.id) ||
    task.nativeOwnerId === currentUser.id ||
    task.assignedById === currentUser.id ||
    responsibleIds.includes(currentUser.id) ||
    isAdminUser({
      currentUser,
      employees: workspace.employees,
      permissionGroups: workspace.permissionGroups,
    })
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
    const invitation = workspace.invitations.find(
      (candidate) =>
        candidate.id === id ||
        candidate.name.toLocaleLowerCase("pt-BR") === label.toLocaleLowerCase("pt-BR"),
    );
    if (invitation) return { type: "user", id: invitation.id, label: invitation.name };
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
  const dayMap = new Map([
    ["S", 1],
    ["T", 2],
    ["Q", 3],
    ["Q2", 4],
    ["S2", 5],
    ["Sá", 6],
    ["D", 7],
  ]);
  const weekDays = item.recurrenceDetail
    .split(",")
    .map((day) => dayMap.get(day))
    .filter((day): day is number => day != null);

  if (item.recurrenceRule === "Diária") {
    return interval === 1
      ? { frequency: "daily", excludedWeekDays: weekDays, times: item.recurrenceTimes, endDate }
      : {
          frequency: "daily",
          interval,
          excludedWeekDays: weekDays,
          times: item.recurrenceTimes,
          endDate,
        };
  }
  if (item.recurrenceRule === "Semanal") {
    if (interval === 1) return { frequency: "weekly", weekDays, endDate };
    if (interval === 2) return { frequency: "biweekly", weekDays, endDate };
    return { frequency: "weekly", interval, weekDays, endDate };
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

function taskStatusReceipt(
  task: NativeTask,
  workspace: Database,
  user: Database["employees"][number],
) {
  const mobile = taskToMobileTask(task, workspace, user);
  return {
    id: mobile.id,
    serverId: mobile.serverId!,
    clientId: mobile.clientId,
    completed: mobile.completed,
    completedById: mobile.completedById,
    completedByName: mobile.completedByName,
    completedAt: mobile.completedAt,
    awaitingReview: mobile.awaitingReview,
    requiresReview: mobile.requiresReview,
    isReviewer: mobile.isReviewer,
    canComplete: mobile.canComplete,
    canCompleteAnytime: mobile.canCompleteAnytime,
  };
}

export async function replaceMobileTasks(
  request: Request,
  tasks: MobileTask[],
  deletedServerIds: string[] = [],
  baseTasks?: MobileTask[],
  taskOrder?: string[],
  baseTaskOrder?: string[],
  statusChanges: Array<{ serverId: string; completed: boolean; mutationId: string }> = [],
  syncRequest?: { mutationId: string; policy: "arrival" },
) {
  const requestDigest = syncRequest
    ? createHash("sha256")
        .update(
          JSON.stringify({
            tasks,
            deletedServerIds,
            baseTasks,
            taskOrder,
            baseTaskOrder,
            statusChanges,
          }),
        )
        .digest("hex")
    : undefined;
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
        (request.headers.get("x-workspace-kind") === "personal"
          ? item.company.kind === "personal" && item.company.ownerId === session.userId
          : item.company.id === (requestedWorkspaceId || session.activeCompanyId)) &&
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
    if (syncRequest) {
      if (!baseTasks || statusChanges.length)
        throw Object.assign(new Error("Envio identificado inválido."), { statusCode: 400 });
      const receipt = workspace.mobileTaskSyncMutations?.[syncRequest.mutationId];
      if (receipt) {
        if (receipt.actorId !== account.id || receipt.digest !== requestDigest) {
          throw Object.assign(new Error("Identificação de envio reutilizada com outro conteúdo."), {
            statusCode: 409,
          });
        }
        return {
          ok: true,
          count: 0,
          created: 0,
          updated: 0,
          deleted: 0,
          statusResults: [],
          mutationId: syncRequest.mutationId,
          replayed: true,
        };
      }
    }
    const permissionSet = resolvePermissionSet({
      currentUser,
      employees: workspace.employees,
      permissionGroups: workspace.permissionGroups,
    });
    const canCreateTasks = hasPermission(permissionSet, "tasks.create");
    const isAdministrator = isAdminUser({
      currentUser,
      employees: workspace.employees,
      permissionGroups: workspace.permissionGroups,
    });
    const today = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Sao_Paulo",
    }).format(new Date());
    materializeRecurringTasks(workspace, today);
    let created = 0;
    let updated = 0;
    let deleted = 0;
    const requestedTaskOrder: string[] = [];
    const splitTaskIds = new Set<string>();
    const shiftedTaskIds = new Set<string>();
    const rejectedCreations: string[] = [];

    if (taskOrder) {
      if (!baseTaskOrder || !baseTasks)
        throw Object.assign(new Error("A ordem das tarefas precisa de uma versão de origem."), {
          statusCode: 400,
        });
      const visible = new Set(visibleMobileTasks(workspace, account).map((task) => task.serverId));
      const common = new Set(
        baseTaskOrder.filter((id) => visible.has(id) && taskOrder.includes(id)),
      );
      const current = workspace.tasks.map((task) => task.id).filter((id) => common.has(id));
      const original = baseTaskOrder.filter((id) => common.has(id));
      const desired = taskOrder.filter((id) => common.has(id));
      if (
        !syncRequest &&
        JSON.stringify(current) !== JSON.stringify(original) &&
        JSON.stringify(current) !== JSON.stringify(desired)
      ) {
        throw Object.assign(
          new Error(
            "A ordem das tarefas mudou em outro aparelho. Abra Sincronização para revisar.",
          ),
          { statusCode: 409 },
        );
      }
    }

    // Checked under the database row lock, before any deletion or edit. Legacy clients
    // keep their protocol; modern clients send only changes with their original base.
    if (baseTasks) {
      const bases = new Map(
        baseTasks.filter((task) => task.serverId).map((task) => [task.serverId!, task]),
      );
      const currentTask = (id: string) => {
        const task = workspace.tasks.find((task) => task.id === id) as NativeTask | undefined;
        if (
          task &&
          !canViewTask({
            task,
            currentUser,
            employees: workspace.employees,
            departments: workspace.departments,
            groups: workspace.groups,
            permissionGroups: workspace.permissionGroups,
          })
        ) {
          throw Object.assign(new Error("Você não tem mais acesso a esta tarefa."), {
            statusCode: 403,
          });
        }
        return task ? taskToMobileTask(task, workspace, currentUser) : undefined;
      };
      for (const id of deletedServerIds) {
        const current = currentTask(id);
        if (!current) continue; // deletion retries are idempotent
        const base = bases.get(id);
        if (!base || (!syncRequest && changedMobileTaskFields(base, current).length)) {
          throw Object.assign(
            new Error(
              "A tarefa que você tentou excluir foi alterada. Atualize e revise a exclusão.",
            ),
            { statusCode: 409 },
          );
        }
      }
      tasks = tasks.flatMap((item) => {
        if (!item.serverId) {
          // The response to a successful create can be lost. A retry must not rewrite
          // a task which somebody may already have edited on the website.
          const creationId = `native-${account.id}-${item.clientId || item.id}`;
          if (workspace.tasks.some((task) => task.id === creationId)) return [];
          if (item.clientId && workspace.mobileTaskCreationIds?.includes(creationId)) {
            throw Object.assign(
              new Error(
                "Esta tarefa foi excluída em outro aparelho. Abra Sincronização para revisar a cópia local.",
              ),
              { statusCode: 409 },
            );
          }
          return [item];
        }
        const base = bases.get(item.serverId);
        const current = currentTask(item.serverId);
        if (!current) return []; // a deleted task must never be resurrected
        if (!base)
          throw Object.assign(new Error("Atualize esta tarefa antes de enviar alterações."), {
            statusCode: 409,
          });
        const changed = changedMobileTaskFields(base, item);
        if (!changed.length) return [];
        const task = workspace.tasks.find((task) => task.id === item.serverId) as NativeTask;
        const permissions = getTaskPermissions({
          task,
          currentUser,
          employees: workspace.employees,
          departments: workspace.departments,
          groups: workspace.groups,
          permissionGroups: workspace.permissionGroups,
        });
        const nativeOwner = task.nativeOwnerId === account.id;
        const denied = changed.some((field) => {
          const key = field as keyof MobileTask;
          if (JSON.stringify(base[key]) === JSON.stringify(item[key])) return false;
          if (field === "reminder") return false;
          if (field === "completed")
            return item.completed
              ? !permissions.canComplete || (item.dueDate > today && !isAdministrator)
              : !permissions.canReopen;
          if (field === "checklist") return !isAdministrator;
          if (!permissions.canEditContent && !nativeOwner) return true;
          if (["assignee", "assignees"].includes(field))
            return !permissions.canAssign && !nativeOwner;
          if (
            [
              "assignmentType",
              "assignmentTargetId",
              "assignmentTargetLabel",
              "department",
            ].includes(field)
          )
            return !permissions.canMove && !permissions.canAssign && !nativeOwner;
          if (field.startsWith("recurrence"))
            return !permissions.canManageRecurrence && !nativeOwner;
          return false;
        });
        if (denied)
          throw Object.assign(
            new Error(
              "Sua permissão não permite aplicar uma das alterações pendentes. Atualize e revise a tarefa.",
            ),
            { statusCode: 403 },
          );
        return [
          {
            ...reconcileMobileTask(base, item, current, syncRequest ? "arrival" : "conflict"),
            dateMoveFrom: item.dateMoveFrom,
            dateMoveScope: item.dateMoveScope,
          },
        ];
      });
    }

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
      if ((task as NativeTask).nativeData?.clientId) {
        workspace.mobileTaskCreationIds = Array.from(
          new Set([...(workspace.mobileTaskCreationIds ?? []), task.id]),
        );
      }
      workspace.tasks.splice(taskIndex, 1);
      deleted += 1;
      // Apagar a linha não bastava: o materializeRecurringTasks caminha do modelo até hoje e
      // recria toda data que não esteja em recurrenceExcludedDates, então a ocorrência
      // excluída voltava na chamada seguinte. Registrar a data nas tarefas que sobraram da
      // série é o mesmo que o painel faz em "somente esta data", e o materialize lê a exclusão
      // de qualquer linha da série, não só do modelo. Quando a série inteira é apagada não
      // sobra ninguém para anotar — e também não sobra modelo de onde materializar, então
      // "toda a recorrência" funciona sem isto.
      if (task.recurrence) {
        const seriesId = task.recurrenceParentId ?? task.id;
        for (const sibling of workspace.tasks) {
          if ((sibling.recurrenceParentId ?? sibling.id) !== seriesId) continue;
          sibling.recurrenceExcludedDates = Array.from(
            new Set([...(sibling.recurrenceExcludedDates ?? []), task.dueDate]),
          );
        }
      }
    }

    const findExisting = (item: MobileTask) =>
      workspace.tasks.find((rawTask) => {
        const task = rawTask as NativeTask;
        return (
          task.id === item.serverId ||
          (!item.serverId &&
            task.nativeSource === NATIVE_SOURCE &&
            task.nativeOwnerId === account.id &&
            (item.clientId
              ? task.nativeData?.clientId === item.clientId
              : !task.nativeData?.clientId && task.nativeData?.id === item.id))
        );
      }) as NativeTask | undefined;

    // Os ids se repetem entre espaços. Um aparelho que misturou espaços ao trocar de um para o outro
    // reenviaria tarefas alheias com ids que existem aqui, e cada uma sobrescreveria uma linha. Uma
    // edição normal muda poucos títulos; a maioria mudando de uma vez é carga do espaço errado.
    const matchedTasks = tasks.flatMap((item) => {
      const existing = findExisting(item);
      return existing ? [{ item, existing }] : [];
    });
    const changedTitles = matchedTasks.filter(
      ({ item, existing }) => item.title.trim() !== existing.title.trim(),
    ).length;
    if (!baseTasks && changedTitles >= 3 && changedTitles * 2 > matchedTasks.length) {
      console.error(
        `Mobile task sync refused: ${changedTitles} of ${matchedTasks.length} titles changed.`,
      );
      throw Object.assign(
        new Error("As tarefas deste aparelho não correspondem a este espaço. Atualize a lista."),
        { statusCode: 409 },
      );
    }

    // O aparelho reenvia todas as tarefas, então uma linha com cadência diferente da enviada pode
    // ser edição de verdade ou só divergência de formato. Edição mexe numa linha da série; se a
    // série inteira chega diferente, é formato, e a série não pode ser dividida linha a linha.
    // Decidido antes de gravar qualquer coisa: dividir uma série muda as linhas vizinhas, e elas
    // não podem ser reavaliadas depois disso.
    const cadenceChangesBySeries = new Map<string, string[]>();
    for (const item of tasks) {
      const existing = findExisting(item);
      if (!existing || !mobileCadenceChanged(item, existing)) continue;
      const seriesId = existing.recurrenceParentId ?? existing.id;
      cadenceChangesBySeries.set(seriesId, [
        ...(cadenceChangesBySeries.get(seriesId) ?? []),
        existing.id,
      ]);
    }
    const seriesSplitIds = new Set(
      [...cadenceChangesBySeries.values()].filter((ids) => ids.length === 1).flat(),
    );

    for (const { dateMoveFrom, dateMoveScope, ...item } of tasks) {
      const isFutureCompletion =
        item.completed &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.dueDate) &&
        item.dueDate > today &&
        !isAdministrator;
      // Uma atividade futura continua pendente no servidor, mas não pode
      // cancelar a sincronização inteira (inclusive exclusões já solicitadas).
      const completed = item.completed && !isFutureCompletion;
      const existing = findExisting(item);

      // Com `serverId` e sem linha no servidor, a tarefa foi apagada aqui — pelo painel, por outro
      // aparelho ou pela divisão de uma série logo acima, neste mesmo envio. Recriá-la como tarefa
      // nova a ressuscitava como série solta, duplicando ocorrências.
      if (!existing && item.serverId) continue;
      if (
        !existing &&
        item.clientId &&
        workspace.mobileTaskCreationIds?.includes(`native-${account.id}-${item.clientId}`)
      ) {
        throw Object.assign(
          new Error("Esta tarefa foi excluída em outro aparelho. Revise a cópia local."),
          { statusCode: 409 },
        );
      }

      if (existing) {
        // permissionGroups PRECISA vir aqui, como ja vem nas outras duas chamadas de canViewTask
        // deste arquivo (a listagem e a exclusao em lote). Sem ele, canViewTask nem consulta
        // tasks.viewAll (permissions.ts:44) e cai direto na hierarquia de responsavel/gestor.
        //
        // Quem tem acesso amplo SO por tasks.viewAll -- o grupo de sistema "Gestor" (pg2), que
        // nasce em toda empresa -- via a tarefa na lista e perdia a edicao aqui: o `continue`
        // pula o item antes de qualquer gravacao, sem erro e sem entrar na contagem, entao o
        // aparelho da a sincronizacao por concluida e a alteracao some na proxima leitura.
        if (
          !canViewTask({
            task: existing,
            currentUser,
            employees: workspace.employees,
            departments: workspace.departments,
            groups: workspace.groups,
            permissionGroups: workspace.permissionGroups,
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
        if (completed !== (existing.status === "completed")) {
          if (completed && permissions.canComplete) {
            setTaskStatus(existing,
              existing.requiresReview && existing.reviewerId !== account.id
                ? "waiting_review"
                : "completed", account);
          }
          // Espelha reviewAwareStatus (src/routes/v2.tsx): só sair de "waiting_review" é
          // reabertura de verdade; desmarcar uma tarefa concluída volta para "pending". Daqui
          // saía "reopened" em qualquer caso, e como "pending" só era atribuído na criação,
          // nenhuma tarefa voltava a Pendente depois de concluída uma vez — o painel mostrava
          // "Pendente 0" com tarefa claramente em aberto.
          if (!completed && permissions.canReopen)
            setTaskStatus(existing, existing.status === "waiting_review" ? "reopened" : "pending", account);
        }
        const isNativeOwner = existing.nativeOwnerId === account.id;
        if (permissions.canEditContent || isNativeOwner) {
          existing.title = normalizeMobileTaskTitle(item.title);
          existing.description = item.description.trim();
          existing.priority = priority(item.priority);
          // A data de uma ocorrência materializada é a IDENTIDADE dela: é o que a distingue das
          // outras linhas da mesma série, e o materializeRecurringTasks usa exatamente isso para
          // saber o que já existe. Adotar a data que o aparelho manda tirava a série de fase de
          // forma permanente, e também para o Android e o painel — foi assim que o app quebrou
          // dado ao fingir "excluir só esta ocorrência" avançando a data localmente.
          //
          // A guarda é ESTREITA de propósito: só a ocorrência (a que tem recurrenceParentId). A
          // tarefa modelo continua aceitando data nova, porque mudar a data de início da série é
          // edição legítima — o painel faz isso, e o app do André pode ter tela para isso. Na
          // operação normal isto é no-op: o aparelho devolve a mesma data que recebeu.
          //
          // O caminho para mudar a data de uma recorrente é o pedido explícito (`dateMoveFrom`): só
          // vale se a data que o aparelho conhece for a gravada, então aparelho desatualizado e
          // reenvio do mesmo pedido não mudam nada. "Esta e as seguintes" mexe na regra e fica no
          // bloco da recorrência, com a permissão dela.
          const previousDueDate = existing.dueDate;
          const moveValid = dateMoveFrom === existing.dueDate && item.dueDate !== existing.dueDate;
          const canManageRecurrence = isNativeOwner || permissions.canManageRecurrence;
          const isSeriesSplit = seriesSplitIds.has(existing.id) && canManageRecurrence;
          const moveFollowing = moveValid && !isSeriesSplit && dateMoveScope === "following";
          if (!dateMoveFrom) {
            if (!existing.recurrenceParentId && !existing.recurrenceSlotDate) {
              existing.dueDate = item.dueDate;
            }
          } else if (moveValid && (!existing.recurrence || isSeriesSplit)) {
            existing.dueDate = item.dueDate;
          } else if (moveValid && !moveFollowing) {
            moveOccurrenceDate(workspace, existing, item.dueDate);
          }
          const nextDueTime = item.dueTime.trim();
          existing.dueTime = nextDueTime || undefined;
          existing.durationMinutes = parseTaskDuration(item.duration);
          if (existing.nativeData) existing.nativeData.duration = item.duration;
          if (!isNativeOwner && existing.nativeData) existing.nativeData.dueTime = nextDueTime;
          // Alvo, responsáveis e recorrência têm permissão própria no painel (`updateTaskDetails`).
          // Sem elas o valor enviado é só ignorado, e não recusado: o PUT carrega o espaço inteiro
          // e uma recusa derrubaria a sincronização toda por causa de um item. Quem não é o dono
          // nativo não reescreve a cópia crua, então o que mudou precisa sair dela, senão a
          // próxima leitura devolve o valor antigo.
          if (isNativeOwner || permissions.canAssign) {
            const responsibleIds = mobileResponsibleIds(workspace, account.id, item);
            const responsibleChanged =
              JSON.stringify(
                [...new Set([existing.responsibleId, ...(existing.responsibleIds ?? [])])]
                  .filter(Boolean)
                  .sort(),
              ) !== JSON.stringify([...responsibleIds].sort());
            existing.responsibleId = responsibleIds[0] ?? "";
            existing.responsibleIds = responsibleIds;
            if (responsibleChanged && !isNativeOwner) {
              invalidateNativeShadow(existing, "responsible");
            }
          }
          if (isNativeOwner || permissions.canMove || permissions.canAssign) {
            const target = mobileTaskTarget(workspace, account.id, item);
            const targetChanged =
              target.type !== existing.target.type || target.id !== existing.target.id;
            existing.target = target;
            if (targetChanged && !isNativeOwner) invalidateNativeShadow(existing, "target");
          }
          if (canManageRecurrence) {
            // Regra sem dia marcado deduz o dia da data da tarefa. Numa ocorrência movida "só esta",
            // a dedução parte da posição dela na série, senão a regra mudaria junto.
            const nextRecurrence = mobileTaskRecurrence(
              existing.recurrenceSlotDate
                ? { ...item, dueDate: existing.recurrenceSlotDate }
                : item,
            );
            const canRemoveOccurrence = (item: Task) =>
              canViewTask({
                task: item,
                currentUser,
                employees: workspace.employees,
                departments: workspace.departments,
                groups: workspace.groups,
                permissionGroups: workspace.permissionGroups,
              }) &&
              getTaskPermissions({
                task: item,
                currentUser,
                employees: workspace.employees,
                departments: workspace.departments,
                groups: workspace.groups,
                permissionGroups: workspace.permissionGroups,
              }).canDelete;
            if (isSeriesSplit) {
              changeSeriesRecurrence(
                workspace,
                existing,
                nextRecurrence,
                previousDueDate < existing.dueDate ? previousDueDate : existing.dueDate,
                canRemoveOccurrence,
              );
              splitTaskIds.add(existing.id);
            } else if (moveFollowing) {
              moveSeriesFromOccurrence(workspace, existing, item.dueDate, canRemoveOccurrence);
              splitTaskIds.add(existing.id);
              shiftedTaskIds.add(existing.id);
            } else {
              existing.recurrence = clampRecurrenceToSeriesEnd(
                nextRecurrence,
                existing.recurrenceSeriesEndDate,
              );
            }
          }
          // O aparelho só conhece o anexo dele; os do painel não podem sumir da contagem. Quem não
          // recebeu o anexo privado manda o nome vazio, e isso não quer dizer que ele foi removido.
          const deviceAttachmentName = canReadNativeAttachment(workspace, existing, currentUser)
            ? item.attachmentName
            : (existing.nativeData?.attachmentName ?? "");
          existing.attachments =
            (existing.attachmentItems?.length ?? 0) + (deviceAttachmentName ? 1 : 0);
        }
        if (isAdministrator) {
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
            ...existing.nativeData,
            ...item,
            id: existing.nativeData?.id ?? item.id,
            clientId: existing.nativeData?.clientId || item.clientId,
            completed,
            title: normalizeMobileTaskTitle(item.title),
            serverId: existing.id,
          };
          // A ocorrência virou a primeira da série nova; a contagem antiga não vale mais.
          if (splitTaskIds.has(existing.id))
            invalidateNativeShadow(existing, "recurrenceOccurrence");
          // O aparelho enviou a regra de antes; a que vale agora é a que o servidor ancorou na data.
          if (shiftedTaskIds.has(existing.id)) invalidateNativeShadow(existing, "recurrence");
        }
        requestedTaskOrder.push(existing.id);
        updated += 1;
        continue;
      }

      // Pula só esta tarefa: recusar o lote inteiro prendia no aparelho as outras mudanças dele
      // (conclusões, edições), reenviadas e recusadas para sempre.
      if (!canCreateTasks) {
        rejectedCreations.push(item.clientId || String(item.id));
        continue;
      }

      const usedMobileIds = new Set(
        workspace.tasks.map((task) => (task as NativeTask).nativeData?.id ?? mobileId(task.id)),
      );
      let nativeId = item.id;
      while (usedMobileIds.has(nativeId)) nativeId = nativeId >= 2147483647 ? 1 : nativeId + 1;
      const newTask: NativeTask = {
        id: `native-${account.id}-${item.clientId || item.id}`,
        title: normalizeMobileTaskTitle(item.title),
        description: item.description.trim(),
        priority: priority(item.priority),
        status: "pending",
        dueDate: item.dueDate,
        dueTime: item.dueTime.trim() || undefined,
        durationMinutes: parseTaskDuration(item.duration),
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
        subtasks: isAdministrator
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
          id: nativeId,
          completed,
          title: normalizeMobileTaskTitle(item.title),
        },
      };
      setTaskStatus(newTask, completed ? "completed" : "pending", account);
      workspace.tasks.unshift(newTask as Task);
      if (item.clientId)
        workspace.mobileTaskCreationIds = [...(workspace.mobileTaskCreationIds ?? []), newTask.id];
      requestedTaskOrder.push(newTask.id);
      created += 1;
    }

    const tasksById = new Map(workspace.tasks.map((task) => [task.id, task]));
    const visibleOrderIds = new Set(
      visibleMobileTasks(workspace, account).map((task) => task.serverId),
    );
    const liveTaskOrder = [...new Set(baseTasks ? (taskOrder ?? []) : requestedTaskOrder)].filter(
      (id) => tasksById.has(id) && visibleOrderIds.has(id),
    );
    if (liveTaskOrder.length > 1) {
      const orderedIds = new Set(liveTaskOrder);
      let orderedIndex = 0;
      workspace.tasks = workspace.tasks.map((task) => {
        if (!orderedIds.has(task.id)) return task;
        const orderedTask = tasksById.get(liveTaskOrder[orderedIndex]);
        orderedIndex += 1;
        return orderedTask ?? task;
      });
    }
    // Explicit status commands do not carry an old task snapshot or depend on unrelated
    // drafts, checklist edits, or ordering. Persist the receipt in the SAME transaction.
    const statusResults: Array<{
      mutationId: string;
      task: ReturnType<typeof taskStatusReceipt>;
      replayed: boolean;
    }> = [];
    for (const change of statusChanges) {
      const task = workspace.tasks.find((item) => item.id === change.serverId) as
        | NativeTask
        | undefined;
      if (!task)
        throw Object.assign(new Error("A tarefa foi removida deste espaço."), { statusCode: 404 });
      const input = {
        task,
        currentUser,
        employees: workspace.employees,
        departments: workspace.departments,
        groups: workspace.groups,
        permissionGroups: workspace.permissionGroups,
      };
      if (!canViewTask(input))
        throw Object.assign(new Error("Você não tem mais acesso a esta tarefa."), {
          statusCode: 403,
        });
      const previous = workspace.mobileTaskStatusMutations?.[change.mutationId];
      if (previous) {
        if (
          previous.actorId !== account.id ||
          previous.taskId !== task.id ||
          previous.completed !== change.completed
        ) {
          throw Object.assign(
            new Error("A confirmação desta alteração não corresponde à tarefa."),
            { statusCode: 409 },
          );
        }
        statusResults.push({
          mutationId: change.mutationId,
          task: taskStatusReceipt(task, workspace, currentUser),
          replayed: true,
        });
        continue;
      }
      const permissions = getTaskPermissions(input);
      if (change.completed && task.status !== "completed") {
        if (!permissions.canComplete)
          throw Object.assign(new Error("Seu acesso não permite concluir esta tarefa."), {
            statusCode: 403,
          });
        if (task.dueDate > today && !permissions.canCompleteAnytime) {
          throw Object.assign(new Error("Somente o administrador pode concluir antes da data."), {
            statusCode: 403,
          });
        }
        setTaskStatus(task,
          task.requiresReview &&
          !permissions.canApproveReview &&
          permissions.reviewManagerId !== account.id
            ? "waiting_review"
            : "completed", account);
      } else if (
        !change.completed &&
        (task.status === "completed" || task.status === "waiting_review")
      ) {
        if (!permissions.canReopen)
          throw Object.assign(new Error("Seu acesso não permite reabrir esta tarefa."), {
            statusCode: 403,
          });
        setTaskStatus(task, task.status === "waiting_review" ? "reopened" : "pending", account);
      }
      if (task.nativeData) task.nativeData.completed = task.status === "completed";
      workspace.mobileTaskStatusMutations ??= {};
      workspace.mobileTaskStatusMutations[change.mutationId] = {
        actorId: account.id,
        taskId: task.id,
        completed: change.completed,
      };
      statusResults.push({
        mutationId: change.mutationId,
        task: taskStatusReceipt(task, workspace, currentUser),
        replayed: false,
      });
      updated += 1;
    }
    if (syncRequest) {
      workspace.mobileTaskSyncMutations ??= {};
      workspace.mobileTaskSyncMutations[syncRequest.mutationId] = {
        actorId: account.id,
        digest: requestDigest!,
      };
    }
    return {
      ok: true,
      count: created + updated + deleted,
      created,
      updated,
      deleted,
      statusResults,
      rejectedCreations,
      ...(syncRequest ? { mutationId: syncRequest.mutationId, replayed: false } : {}),
    };
  });
}
