import { createHash } from "node:crypto";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { today, type Database } from "./database";
import { mutateDatabase } from "./database.server";
import { requireMobileWorkspace } from "./mobile-api.server";
import { createTaskInWorkspace } from "./api/pop-organize.functions";
import { hasPermission, resolvePermissionSet } from "./permission-groups";
import { validatePopCallDraft, buildPopCallInstructions } from "./pop-call-policy";
import { popCallDraftSchema, restorePopDraft, type PopWorkspaceContext } from "./pop-draft";

const windows = new Map<string, { count: number; expires: number }>();
const httpError = (message: string, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });
function contextFor(workspace: Database, userId: string): PopWorkspaceContext {
  const user = workspace.employees.find((item) => item.id === userId);
  if (!user || user.status !== "active") throw httpError("Usuário sem acesso ao espaço.", 403);
  if (
    !hasPermission(
      resolvePermissionSet({
        currentUser: user,
        employees: workspace.employees,
        permissionGroups: workspace.permissionGroups,
      }),
      "tasks.create",
    )
  )
    throw httpError("Seu grupo de permissão não pode criar tarefas.", 403);
  return {
    company: {
      id: workspace.company.id,
      name: workspace.company.name,
      kind: workspace.company.kind === "personal" ? "personal" : "company",
    },
    currentUser: { id: user.id, name: user.name },
    employees: workspace.employees
      .filter((e) => e.status === "active")
      .map(({ id, name, status, departmentId }) => ({ id, name, status, departmentId })),
    departments: workspace.departments.map(({ id, name }) => ({ id, name })),
    groups: workspace.groups.map(({ id, name, memberIds }) => ({ id, name, memberIds })),
    canCreateChecklist: true,
  };
}

export function buildPopLiveSession(context: PopWorkspaceContext, draft: unknown = null) {
  return {
    model: process.env.OPENAI_LIVE_MODEL?.trim() || "gpt-live-1",
    store: false,
    audio: { output: { voice: "tempo" } },
    instructions: `Você é o Pop, assistente masculino do Pop Organize. Converse em português brasileiro com energia boa, simpatia e um toque de bom humor. Seja caloroso e animado, sem exagerar, rir à toa ou fazer discursos. Use confirmações naturais como "Boa!", "Combinado!" e "Vamos nessa" quando fizer sentido. Respostas curtas, uma pergunta de cada vez. Você é uma IA; não se apresente como pessoa real.
Backchannel policy: Use confirmações breves e moderadas, sem disputar a fala do usuário.
Interruption policy: Pare de falar quando o usuário interromper e ouça a correção. Não reinicie sua explicação.
Delegation policy:
Backend tools: preparar_rascunho valida os dados de uma tarefa para revisão na tela; nenhuma ferramenta cria tarefas sozinha.
Generate <|SpawnThinking|> when: o usuário pede para preparar ou corrigir uma tarefa, trocar pessoa, data, horário, duração, prioridade ou checklist.
Do not generate <|SpawnThinking|> when: cumprimentar, tirar uma dúvida geral ou repetir um resultado ainda válido. Uma dúvida sobre os dados precisa de uma pergunta curta.
Generate <|SpawnThinking|> antes de afirmar que um rascunho está pronto ou atualizado. Aguarde o resultado e não invente nomes, horários ou ações. Preserve as correções e o restante já combinado.
A criação só acontece quando o aplicativo confirmar o botão Confirmar e criar. Não peça IDs. Não repita todos os campos nem a instrução de confirmar em toda fala.`,
    delegation: {
      type: "responses",
      responses: {
        model: process.env.OPENAI_POP_BACKEND_MODEL?.trim() || "gpt-6-luna",
        instructions:
          buildPopCallInstructions(context, restorePopDraft(draft), today()) +
          "\nVocê é o backend: retorne dados corretos e curtos ao Pop. Não escreva roteiro de fala nem anuncie ferramentas. Para toda alteração concreta use preparar_rascunho; sem persistência automática.",
        max_output_tokens: 1600,
        parallel_tool_calls: false,
        tools: [
          {
            type: "function",
            name: "preparar_rascunho",
            description: "Valida um rascunho completo no espaço atual. Não cria tarefas.",
            parameters: zodTextFormat(popCallDraftSchema, "pop_call_draft").schema,
            strict: true,
          },
        ],
        tool_choice: "auto",
      },
    },
  };
}

export async function handleMobilePop(request: Request, raw: unknown) {
  const { workspace, account, session } = await requireMobileWorkspace(request);
  if (session.expiresAt <= new Date().toISOString()) throw httpError("Sessão expirada.", 401);
  const context = contextFor(workspace, account.id);
  const input = z
    .object({
      action: z.enum(["connect", "prepare", "create"]),
      sdp: z.string().max(60_000).optional(),
      draft: z.unknown().optional(),
      missingFields: z.array(z.string().max(100)).max(10).optional(),
      requestId: z.string().uuid().optional(),
    })
    .parse(raw);
  const rateKey = account.id + ":" + input.action,
    now = Date.now();
  const rate = windows.get(rateKey);
  if (rate && rate.expires > now) {
    if (rate.count >= (input.action === "connect" ? 4 : 40))
      throw httpError("Aguarde um momento antes de tentar novamente.", 429);
    rate.count++;
  } else windows.set(rateKey, { count: 1, expires: now + 60_000 });
  for (const [key, value] of windows) if (value.expires <= now) windows.delete(key);
  if (input.action === "connect") {
    if (!input.sdp?.trim().startsWith("v=0")) throw httpError("Não foi possível iniciar o áudio.");
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) throw httpError("O Pop ainda não foi configurado.", 503);
    const response = await fetch("https://api.openai.com/v1/live/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "OpenAI-Safety-Identifier": createHash("sha256")
          .update(workspace.company.id + ":" + account.id)
          .digest("hex"),
      },
      body: JSON.stringify({
        session: buildPopLiveSession(context, input.draft),
        transport: { type: "webrtc", sdp: input.sdp },
      }),
      signal: AbortSignal.timeout(25_000),
    });
    const result = await response.json();
    if (!response.ok || !result.transport?.sdp) {
      console.error("Pop Live startup failed", response.status, result.error?.code);
      throw httpError("O Pop não conseguiu atender agora. Tente novamente.", 502);
    }
    // Credentials and backend configuration remain on the VPS.
    return { session: { id: result.session.id }, transport: { sdp: result.transport.sdp } };
  }
  const parsed = popCallDraftSchema.parse({
    draft: input.draft,
    missingFields: input.missingFields ?? [],
  });
  const answer = validatePopCallDraft(parsed.draft, context, parsed.missingFields, today());
  if (input.action === "prepare")
    return {
      ...answer,
      created: false,
      preview: {
        responsible:
          context.employees.find(
            (person) =>
              person.id ===
              (answer.draft.targetType === "user"
                ? answer.draft.targetId
                : answer.draft.responsibleId),
          )?.name ?? (context.company.kind === "personal" ? context.currentUser.name : ""),
        target:
          answer.draft.targetType === "department"
            ? context.departments.find((item) => item.id === answer.draft.targetId)?.name
            : answer.draft.targetType === "group"
              ? context.groups.find((item) => item.id === answer.draft.targetId)?.name
              : context.company.name,
      },
    };
  if (!input.requestId) throw httpError("Identificação da confirmação ausente.");
  const receiptKey = `pop:${account.id}:${input.requestId}`;
  const taskId = `pop-${account.id}-${input.requestId}`;
  const digest = createHash("sha256").update(JSON.stringify(parsed.draft)).digest("hex");
  return mutateDatabase((platform) => {
    const validSession = platform.sessions.find(
      (s) =>
        s.id === session.id &&
        s.tokenHash === session.tokenHash &&
        s.expiresAt > new Date().toISOString(),
    );
    const target = platform.workspaces.find((w) => w.company.id === workspace.company.id);
    if (!validSession || !target) throw httpError("Sessão expirada.", 401);
    const current = contextFor(target, account.id);
    const receipt = target.mobileTaskSyncMutations?.[receiptKey];
    if (receipt) {
      if (receipt.actorId !== account.id || receipt.digest !== digest)
        throw httpError("Confirmação reutilizada com outros dados.", 409);
      return { created: true, id: taskId, replayed: true };
    }
    const verified = validatePopCallDraft(parsed.draft, current, parsed.missingFields, today());
    if (verified.status !== "ready") throw httpError(verified.reply);
    const draft = verified.draft;
    const task = createTaskInWorkspace(target, account.id, {
      title: draft.title,
      description: draft.description ?? "",
      priority: draft.priority ?? "medium",
      dueDate: draft.dueDate,
      dueTime: draft.dueTime ?? undefined,
      durationMinutes: draft.durationMinutes ?? undefined,
      target: { type: draft.targetType, id: draft.targetId },
      responsibleId: draft.responsibleId ?? "",
      reviewerId: draft.reviewerId ?? undefined,
      requiresReview: Boolean(draft.requiresReview),
      tags: draft.tags,
      checklist: draft.checklist,
      recurrence:
        draft.recurrence.frequency === "none"
          ? undefined
          : Object.fromEntries(Object.entries(draft.recurrence).filter(([, v]) => v !== null)),
    });
    task.id = taskId;
    target.mobileTaskSyncMutations ??= {};
    target.mobileTaskSyncMutations[receiptKey] = { actorId: account.id, digest };
    return { created: true, id: taskId, replayed: false };
  });
}
