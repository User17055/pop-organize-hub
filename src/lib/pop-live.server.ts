import { createHash } from "node:crypto";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { today, type Database } from "./database";
import { buildPopConversationInstructions } from "./pop-conversation-policy";
import { mutateDatabase } from "./database.server";
import { requireMobileWorkspace } from "./mobile-api.server";
import { createTaskInWorkspace } from "./api/pop-organize.functions";
import { hasPermission, resolvePermissionSet, isAdminUser } from "./permission-groups";
import { validatePopCallDraft, buildPopCallInstructions } from "./pop-call-policy";
import { popCallDraftSchema, restorePopDraft, type PopWorkspaceContext } from "./pop-draft";
import {
  preparePopChatDraft,
  popTaskSearchSchema,
  searchPopTasks,
  compactPopVoiceSearch,
} from "./pop-chat-policy";
import {
  popAdminIndicators,
  popAdminStructure,
  popIndicatorsSchema,
  popStructureSchema,
} from "./pop-admin-report";

const windows = new Map<string, { count: number; expires: number }>();
const httpError = (message: string, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });
function contextFor(workspace: Database, userId: string): PopWorkspaceContext {
  const user = workspace.employees.find((item) => item.id === userId);
  if (!user || user.status !== "active") throw httpError("Usuário sem acesso ao espaço.", 403);
  if (
    workspace.company.kind !== "company" ||
    (workspace.company.ownerId !== userId &&
      !isAdminUser({
        currentUser: user,
        employees: workspace.employees,
        permissionGroups: workspace.permissionGroups,
      }))
  )
    throw httpError("O Pop está disponível somente para administradores da empresa.", 403);
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
      kind: "company",
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

export function buildPopLiveSession(
  context: PopWorkspaceContext,
  draft: unknown = null,
  messages: Array<{ role: "user" | "assistant"; content: string }> = [],
) {
  return {
    model: process.env.OPENAI_LIVE_MODEL?.trim() || "gpt-live-1",
    store: false,
    input: messages.slice(-12).map((message) => ({
      type: "message",
      role: message.role,
      content: [
        {
          type: message.role === "assistant" ? "output_text" : "input_text",
          text: message.content.slice(0, 1000),
        },
      ],
    })),
    audio: { output: { voice: "tempo" } },
    // Estrutura do guia "Prompting GPT-Live" da OpenAI. A API Live não tem campo de velocidade nem de
    // detecção de fim de fala (testado: "Unknown parameter"); ritmo, sotaque e vez de falar vêm daqui.
    instructions: `Você é o Pop, assistente do Pop Organize, de São Paulo, que conversa em português do Brasil com um colega de trabalho. Você é uma IA; se perguntarem, diga isso sem rodeio e nunca finja ser pessoa.
Jeito de falar: português correto e bem articulado, com dicção clara, palavras completas e frases fáceis de entender, num tom caloroso e animado, com sorriso na voz e ritmo de conversa que segue em frente, sem correr e sem arrastar. Varie a entonação como gente de verdade. Sem gírias; no máximo um "beleza" ou "combinado" de vez em quando. Frases curtas, uma pergunta por vez; para coisas simples, uma ou duas frases.
Pronúncia: paulistana neutra, como a de um apresentador de telejornal de São Paulo, nunca carioca. O "s" antes de consoante e no fim da palavra é sibilante [s]/[z], nunca chiado [ʃ]/[ʒ]: "mesmo" [ˈmezmu], "festa" [ˈfɛstɐ], "as tarefas" [as taˈɾɛfas], "três" [ˈtɾes]. O "r" no fim de sílaba é um toque leve [ɾ], nunca aspirado [h]/[x]: "porta" [ˈpɔɾtɐ], "fazer" [faˈzeɾ], "certo" [ˈsɛɾtu].
Se o usuário desligar o microfone, continue falando normalmente até terminar o que estava dizendo.
Backchannel policy: Não faça nenhuma interjeição enquanto o usuário estiver falando.
Interruption policy: Quando o usuário interromper, pare de falar na hora, mesmo no meio da frase. Escute até ele terminar e responda ao que ele disse; não retome uma resposta que ele substituiu. Continue ouvindo enquanto ele faz pausas para pensar: pausa curta não é fim da fala. Não trate tosse, música ou conversa ao redor como pedido. Só interrompa o usuário para evitar um erro grave.
Delegation policy:
Backend tools: consultar_tarefas, consultar_indicadores e consultar_estrutura leem dados autorizados da empresa selecionada; preparar_rascunho valida uma atividade nova ou sugestões para uma existente; confirmar_criacao cria a atividade nova revisada depois de "eu confirmo"; descartar_rascunho tira o rascunho da tela; encerrar_chamada desliga. Só confirmar_criacao grava algo.
Generate <|SpawnThinking|> when: o usuário pede para consultar ou analisar tarefas, indicadores ou a equipe ("quais são minhas tarefas hoje?", "o que priorizar?"); pede para preparar, melhorar ou mudar uma atividade (pessoa, data, horário, duração, prioridade, checklist); diz exatamente "eu confirmo" para o rascunho novo revisado; recusa, cancela ou desiste do rascunho ("não", "cancela", "deixa pra lá", "não quero"); pede para encerrar, parar ou desligar a chamada, inclusive durante uma consulta.
Do not generate <|SpawnThinking|> when: cumprimentar, bater papo, tirar uma dúvida geral ou repetir um resultado que ainda vale.
Ao delegar, diga uma frase curtinha, como "Um momentinho, estou consultando.". Se o aplicativo avisar que a consulta continua, diga só algo como "Quase lá…", sem adiantar nenhum resultado. Generate <|SpawnThinking|> antes de dizer que um rascunho está pronto ou atualizado. Não adivinhe resultados nem invente nomes, horários ou ações; só diga que criou depois do retorno created=true. Se não houver rascunho novo pronto, peça para prepará-lo primeiro.
Regras: o Pop é dos administradores e só cria e consulta; em tarefas existentes, só sugere melhorias. Nunca conclua, reabra, cancele nem exclua tarefas, e nunca trate "eu confirmo" como concluir tarefa. Não peça IDs. Não repita todos os campos do rascunho nem peça confirmação em toda fala. Entenda "essa", "dela" e "amanhã" pelo contexto e não peça filtros já claros. Você tem acesso às consultas: nunca diga que não consegue ver o sistema; uma busca vazia vale só para o recorte consultado. Se a consulta trouxer teamFallback, apresente essas tarefas como da equipe, sem atribuí-las ao usuário. Ao falar de tarefas, siga a ordem do horário e responda só o que foi pedido: não abra pelas pendentes, não ofereça criar tarefa e não termine toda resposta com pergunta.
Limite: você não tem internet e não pesquisa nada fora do Pop Organize. Só faz o básico do aplicativo: consultar tarefas, indicadores e equipe da empresa e montar atividades com o que o usuário disser. Nunca diga que vai pesquisar na internet. Para assuntos de fora (notícias, clima, preços, curiosidades, conhecimento geral), diga com simpatia que só cuida das tarefas do Pop Organize. Ao montar uma atividade, use só o que o usuário falou e os dados do sistema, sem inventar conteúdo.`,
    delegation: {
      type: "responses",
      responses: {
        model: process.env.OPENAI_POP_BACKEND_MODEL?.trim() || "gpt-6-luna",
        instructions:
          buildPopCallInstructions(context, restorePopDraft(draft), today())
            .replace(
              /Não há ferramenta para consultar tarefas existentes nesta ligação:[^.]+\./,
              "Consulte tarefas cadastradas com consultar_tarefas.",
            )
            .replace(
              "a criação acontece pelo botão Confirmar e criar",
              "a criação acontece pelo botão Confirmar e criar ou por confirmar_criacao após o usuário dizer eu confirmo",
            ) +
          "\nQuando o usuário disser exatamente eu confirmo para o rascunho novo já revisado, use confirmar_criacao com confirmation=eu confirmo. Não prepare novamente nem troque campos ao confirmar. A ferramenta nativa verifica a fala recente, o rascunho e a resposta da VPS. Só anuncie criação se created=true. Quando pedirem para encerrar/parar/desligar a chamada, use encerrar_chamada; isso não conclui tarefas. Quando o usuário recusar, cancelar ou desistir do rascunho, use descartar_rascunho, que o tira da tela; confirme em uma frase e não prepare outro sem pedido." +
          `\nVocê é o backend: retorne dados corretos e curtos ao Pop. Use só as ferramentas declaradas e o que o usuário disse; não há internet nem pesquisa externa, e conhecimento geral não entra nas respostas nem nas atividades. Para perguntas sobre tarefas cadastradas, use consultar_tarefas. Para "minhas tarefas hoje" ou "o que preciso fazer", use assignee=me,date=${today()},status=pending,query vazia. Consulte também atrasadas com date=null,beforeDate=${today()} quando pedirem o que priorizar. Não misture tarefas de colegas; assignee=all somente para visão da empresa solicitada. Retorne quantidade e primeiras 3–5, com horário, prioridade e ordem prática. Listar não cria rascunho nem conclui tarefas. A consulta assignee=me de um dia sem tarefas pessoais já inclui teamFallback com as tarefas dos grupos/setores na mesma data. Use esse resultado, sem repetir a consulta nem remover o filtro de data. Apresente os detalhes imediatamente: quantidade, títulos, horários, prioridade e responsáveis; não pergunte se o usuário quer ver a lista que já pediu. Apresente os dois resultados: "Não encontrei tarefas atribuídas diretamente a você hoje, mas encontrei ... no grupo ... / setor ...", com quantidade e até 3–5 títulos, horários e responsáveis. Use os nomes de destino e responsibleDepartments para identificar de onde vem cada tarefa. Essas tarefas são compartilhadas ou de colegas do setor; não as atribua ao usuário nem diga que ele precisa concluí-las. Se my_team também estiver vazio, diga que não encontrou tarefas hoje nos grupos/setores vinculados ao perfil. Se memberships estiver vazio, informe que não há vínculo cadastrado, sem escolher um setor por conta própria. Nunca use assignee=all como substituto de my_team. Para melhorar uma tarefa existente, consulte-a primeiro, preserve os campos não alterados e envie seu id em sourceTaskId de preparar_rascunho. Para tarefa nova envie sourceTaskId=null. Não escreva roteiro de fala nem anuncie ferramentas. Para toda alteração concreta use preparar_rascunho; sem persistência automática.` +
          "\n" +
          buildPopConversationInstructions(today()),
        max_output_tokens: 1600,
        reasoning: { effort: "low" },
        text: { verbosity: "low" },
        parallel_tool_calls: false,
        tools: [
          {
            type: "function",
            name: "confirmar_criacao",
            description:
              "Confirma pelo aplicativo o rascunho novo já revisado, somente após o usuário dizer explicitamente eu confirmo. Não conclui nem altera tarefas existentes.",
            parameters: zodTextFormat(
              z.object({ confirmation: z.literal("eu confirmo") }),
              "pop_voice_confirmation",
            ).schema,
            strict: true,
          },
          {
            type: "function",
            name: "encerrar_chamada",
            description:
              "Encerra a chamada e o microfone quando o usuário pede para parar, encerrar ou desligar. Não conclui tarefas.",
            parameters: zodTextFormat(z.object({}), "pop_end_call").schema,
            strict: true,
          },
          {
            type: "function",
            name: "descartar_rascunho",
            description:
              "Tira da tela o rascunho atual quando o usuário o recusa, cancela ou desiste. Não exclui nem altera tarefas cadastradas.",
            parameters: zodTextFormat(z.object({}), "pop_discard_draft").schema,
            strict: true,
          },
          {
            type: "function",
            name: "preparar_rascunho",
            description: "Valida um rascunho completo no espaço atual. Não cria tarefas.",
            parameters: zodTextFormat(
              popCallDraftSchema.extend({ sourceTaskId: z.string().nullable() }),
              "pop_call_draft",
            ).schema,
            strict: true,
          },
          {
            type: "function",
            name: "consultar_tarefas",
            description:
              "Consultar atividades autorizadas do espaço atual, filtrando palavras, data, status e quantidade.",
            parameters: zodTextFormat(popTaskSearchSchema, "pop_task_search").schema,
            strict: true,
          },
          {
            type: "function",
            name: "consultar_indicadores",
            description:
              "Indicadores reais da empresa: setores atrasados, autoria de conclusões e totais; não presume autoria histórica.",
            parameters: zodTextFormat(popIndicatorsSchema, "pop_indicators").schema,
            strict: true,
          },
          {
            type: "function",
            name: "consultar_estrutura",
            description:
              "Consultar equipe, setores, grupos, permissões e convites da empresa selecionada.",
            parameters: zodTextFormat(popStructureSchema, "pop_structure").schema,
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
      action: z.enum(["connect", "prepare", "create", "chat", "search", "indicators", "structure"]),
      sdp: z.string().max(60_000).optional(),
      draft: z.unknown().optional(),
      missingFields: z.array(z.string().max(100)).max(10).optional(),
      requestId: z.string().uuid().optional(),
      sourceTaskId: z.string().max(200).nullable().optional(),
      messages: z
        .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
        .max(16)
        .optional(),
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
  if (input.action === "chat") {
    const { runPopChat } = await import("./pop-chat.server");
    return runPopChat(workspace, context, raw, request.signal);
  }
  if (input.action === "search")
    return compactPopVoiceSearch(searchPopTasks(workspace, account.id, raw));
  if (input.action === "indicators") return popAdminIndicators(workspace, raw, today());
  if (input.action === "structure") return popAdminStructure(workspace, raw);
  if (input.action === "connect") {
    if (!input.sdp?.trim().startsWith("v=0")) throw httpError("Não foi possível iniciar o áudio.");
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) throw httpError("O Pop ainda não foi configurado.", 503);
    const config = buildPopLiveSession(context, input.draft, input.messages);
    if (input.sourceTaskId) {
      const draft = restorePopDraft(input.draft);
      if (!draft) throw httpError("Rascunho inválido.");
      preparePopChatDraft(workspace, context, draft, [], today(), input.sourceTaskId);
      config.delegation.responses.instructions += `\nA revisão atual pertence à atividade existente ${input.sourceTaskId}; preserve esse sourceTaskId ao corrigi-la. Uma tarefa nova deve usar sourceTaskId=null.`;
    }
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
        session: config,
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
  const answer = preparePopChatDraft(
    workspace,
    context,
    parsed.draft,
    parsed.missingFields,
    today(),
    input.sourceTaskId,
  );
  if (input.action === "prepare") return answer;
  if (input.action !== "create") throw httpError("O Pop apenas cria e consulta atividades.");
  if (!input.requestId) throw httpError("Identificação da confirmação ausente.");
  if (input.action === "create" && input.sourceTaskId)
    throw httpError("O Pop apenas sugere melhorias para atividades existentes.");
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
    const verified = preparePopChatDraft(
      target,
      current,
      parsed.draft,
      parsed.missingFields,
      today(),
      input.sourceTaskId,
    );
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
