import { createHash } from "node:crypto";
import OpenAI, { toFile } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const recurrenceSchema = z.object({
  frequency: z.enum(["none", "daily", "weekly", "biweekly", "monthly", "yearly", "custom"]),
  interval: z.number().int().min(1).max(120).nullable(),
  customUnit: z.enum(["days", "weeks", "months", "years"]).nullable(),
  dayOfMonth: z.number().int().min(1).max(31).nullable(),
  monthOfYear: z.number().int().min(1).max(12).nullable(),
  endDate: z.string().nullable(),
});

export const popDraftSchema = z.object({
  title: z.string().nullable(),
  description: z.string().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).nullable(),
  dueDate: z.string().nullable(),
  targetType: z.enum(["company", "department", "group", "user"]).nullable(),
  targetId: z.string().nullable(),
  responsibleId: z.string().nullable(),
  responsibleConfirmed: z.boolean(),
  reviewerId: z.string().nullable(),
  requiresReview: z.boolean().nullable(),
  tags: z.array(z.string()),
  checklist: z.array(z.string()),
  checklistConfirmed: z.boolean(),
  recurrence: recurrenceSchema,
  recurrenceConfirmed: z.boolean(),
});

const popAnswerSchema = z.object({
  intent: z.enum(["conversation", "create_task"]),
  reply: z.string(),
  status: z.enum(["needs_input", "ready"]),
  missingFields: z.array(z.string()),
  draft: popDraftSchema,
});

export type PopTaskDraft = z.infer<typeof popDraftSchema>;
export type PopAssistantAnswer = z.infer<typeof popAnswerSchema>;

export type PopWorkspaceContext = {
  company: { id: string; name: string; kind: "personal" | "company" };
  currentUser: { id: string; name: string };
  employees: Array<{ id: string; name: string; status: string; departmentId: string }>;
  departments: Array<{ id: string; name: string }>;
  groups: Array<{ id: string; name: string; memberIds: string[] }>;
  canCreateChecklist: boolean;
};

export type PopConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw Object.assign(new Error("A Pop ainda não foi configurada pelo administrador."), {
      statusCode: 503,
    });
  }
  return new OpenAI({ apiKey });
}

function currentDateInSaoPaulo() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function buildInstructions(context: PopWorkspaceContext) {
  const workspace = JSON.stringify({
    today: currentDateInSaoPaulo(),
    company: context.company,
    currentUser: context.currentUser,
    employees: context.employees.filter((employee) => employee.status === "active"),
    departments: context.departments,
    groups: context.groups,
    canCreateChecklist: context.canCreateChecklist,
  });

  return `Você é a Pop, assistente de criação de atividades do Pop Organize. Fale em português do Brasil.

Personalidade e colaboração:
- Seja calorosa, bem-humorada e genuinamente prestativa.
- Use humor leve e natural quando combinar com a conversa, sem forçar piadas, debochar ou diminuir um problema do usuário.
- Demonstre iniciativa: organize pedidos confusos, escolha padrões sensatos e apresente o próximo passo com clareza.
- Responda de forma humana e animada, mas preserve objetividade e profissionalismo.
- Em saudações e conversa casual, responda com simpatia e convide a pessoa a contar o que deseja organizar.

Foco e concisão:
- Considere a mensagem mais recente como o assunto ativo e use o histórico apenas para manter o contexto necessário.
- Se o usuário corrigir ou complementar algo, atualize o mesmo rascunho; não reinicie a conversa nem ressuscite assuntos antigos.
- Não repita saudações, explicações, perguntas ou resumos que já foram dados, a menos que o usuário peça.
- Dê respostas diretas em uma ou duas frases curtas. Preserve apenas informações úteis, decisões e o próximo passo.
- Evite introduções genéricas, excesso de emojis e frases de preenchimento.

Seu único objetivo nesta conversa é preparar UMA tarefa. Nunca afirme que criou a tarefa: quando o rascunho estiver pronto, o sistema mostrará um botão de confirmação e só criará depois que o usuário tocar nele.

Regras:
- Classifique intent=create_task somente quando o usuário descrever uma ação, trabalho ou atividade que deseja registrar. Saudações, agradecimentos, conversa casual e perguntas sobre a Pop usam intent=conversation e status=needs_input; nesses casos responda normalmente e não monte uma tarefa.
- Extraia e mantenha um rascunho completo a partir de toda a conversa e de eventuais imagens.
- Não faça perguntas nem solicite confirmações. Complete sozinho as informações ausentes usando os padrões abaixo e devolva status=ready já na primeira solicitação útil.
- Use somente IDs existentes no contexto do workspace. Nunca invente funcionários, setores, grupos ou IDs.
- Converta datas relativas usando today e devolva dueDate/endDate em YYYY-MM-DD.
- Se o usuário não informar prioridade, use medium sem perguntar.
- Em espaço pessoal, use targetType=user, targetId=currentUser.id, responsibleId=null e responsibleConfirmed=true.
- Em empresa, quando o responsável ou destino não estiver claro, use currentUser como responsável e a empresa como destino. Use responsibleConfirmed=true.
- Quando o prazo estiver ausente, use today.
- Quando recorrência não for mencionada, use frequency=none e recurrenceConfirmed=true.
- Quando checklist não for mencionado, use checklist=[] e checklistConfirmed=true. Se canCreateChecklist=false, sempre mantenha checklist vazia.
- Use requiresReview=false e reviewerId=null por padrão, a menos que revisão seja solicitada.
- Gere um título curto e uma descrição objetiva a partir do pedido quando eles não vierem separados explicitamente.
- status=ready quando houver informação suficiente para identificar o trabalho; os demais campos devem ser completados pelos padrões acima.
- Quando ready, reply deve ser um resumo inequívoco com título, responsável/destino, prazo, recorrência e checklist. Não peça confirmação nem diga que a tarefa já foi criada.
- missingFields deve listar de forma curta apenas o que ainda falta.
- Se uma imagem tiver texto ou representar um trabalho, use-a como contexto para a tarefa; não descreva a imagem sem necessidade.

Contexto autorizado do workspace:
${workspace}`;
}

function sanitizeDraft(
  answer: PopAssistantAnswer,
  context: PopWorkspaceContext,
  sourceMessage: string,
) {
  const employeeIds = new Set(context.employees.map((employee) => employee.id));
  const departmentIds = new Set(context.departments.map((department) => department.id));
  const groupIds = new Set(context.groups.map((group) => group.id));
  const draft = answer.draft;
  const currentRequest = sourceMessage
    .split("[Rascunho atual mantido pelo sistema]")[0]
    .trim()
    .replace(/\s+/g, " ");
  const isCasualOnly =
    /^(?:(?:oi|olá|ola|eae|e aí|hey|hello|bom dia|boa tarde|boa noite)(?:[,!?.\s]*(?:tudo bem|como vai|beleza|blz))?|tudo bem|como vai|obrigad[oa])[,!?.\s]*$/i.test(
      currentRequest,
    );

  if (answer.intent !== "create_task" || isCasualOnly) {
    answer.intent = "conversation";
    answer.status = "needs_input";
    answer.missingFields = [];
    return answer;
  }

  if (context.company.kind === "personal") {
    draft.targetType = "user";
    draft.targetId = context.currentUser.id;
    draft.responsibleId = null;
    draft.responsibleConfirmed = true;
    draft.reviewerId = null;
    draft.requiresReview = false;
  } else {
    const validTarget =
      (draft.targetType === "company" && draft.targetId === context.company.id) ||
      (draft.targetType === "department" &&
        Boolean(draft.targetId && departmentIds.has(draft.targetId))) ||
      (draft.targetType === "group" && Boolean(draft.targetId && groupIds.has(draft.targetId))) ||
      (draft.targetType === "user" && Boolean(draft.targetId && employeeIds.has(draft.targetId)));
    if (!validTarget) {
      draft.targetType = "company";
      draft.targetId = context.company.id;
    }
    if (draft.targetType === "user" && draft.targetId && !draft.responsibleId) {
      draft.responsibleId = draft.targetId;
    }
    if (draft.responsibleId && !employeeIds.has(draft.responsibleId)) {
      draft.responsibleId = context.currentUser.id;
    }
    draft.responsibleId ??= context.currentUser.id;
    draft.responsibleConfirmed = true;
    if (draft.reviewerId && !employeeIds.has(draft.reviewerId)) draft.reviewerId = null;
  }

  draft.priority ??= "medium";
  draft.dueDate =
    draft.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(draft.dueDate)
      ? draft.dueDate
      : currentDateInSaoPaulo();
  draft.recurrenceConfirmed = true;
  draft.checklistConfirmed = true;
  if (!context.canCreateChecklist) draft.checklist = [];
  if (draft.recurrence.frequency === "custom" && !draft.recurrence.interval) {
    draft.recurrence.interval = 1;
  }
  if (draft.requiresReview) {
    draft.reviewerId ??= draft.responsibleId ?? context.currentUser.id;
  } else {
    draft.requiresReview = false;
    draft.reviewerId = null;
  }

  draft.tags = draft.tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);
  draft.checklist = draft.checklist
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 100);

  const fallbackText = currentRequest;
  const canUseFallback =
    fallbackText.length >= 3 && fallbackText !== "Use a imagem para criar a tarefa.";
  if (!draft.title?.trim() && canUseFallback) draft.title = fallbackText.slice(0, 120);
  if (!draft.description?.trim() && canUseFallback)
    draft.description = fallbackText.slice(0, 2_000);

  const missing = new Set<string>();
  if (!draft.title?.trim()) missing.add("título");
  if (!draft.description?.trim()) missing.add("descrição");
  if (!draft.targetType || !draft.targetId) missing.add("destino");

  answer.missingFields = [...missing];
  answer.status = answer.missingFields.length > 0 ? "needs_input" : "ready";
  return answer;
}

export async function runPopAssistant(options: {
  context: PopWorkspaceContext;
  messages: PopConversationMessage[];
  message: string;
  imageDataUrl?: string;
  safetyUserId: string;
}) {
  const input: OpenAI.Responses.ResponseInput = options.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const latestContent: Array<
    { type: "input_text"; text: string } | { type: "input_image"; image_url: string; detail: "low" }
  > = [{ type: "input_text", text: options.message || "Use a imagem para criar a tarefa." }];
  if (options.imageDataUrl) {
    latestContent.push({ type: "input_image", image_url: options.imageDataUrl, detail: "low" });
  }
  input.push({ role: "user", content: latestContent });

  const response = await getClient().responses.parse({
    model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna",
    instructions: buildInstructions(options.context),
    input,
    reasoning: { effort: "none" },
    text: {
      format: zodTextFormat(popAnswerSchema, "pop_task_draft"),
      verbosity: "low",
    },
    max_output_tokens: 1_200,
    safety_identifier: createHash("sha256").update(options.safetyUserId).digest("hex").slice(0, 32),
  });

  if (!response.output_parsed) {
    throw Object.assign(
      new Error("A Pop não conseguiu interpretar este pedido. Tente novamente."),
      {
        statusCode: 502,
      },
    );
  }

  return sanitizeDraft(response.output_parsed, options.context, options.message);
}

export async function transcribePopAudio(audioDataUrl: string) {
  const match = /^data:(audio\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i.exec(audioDataUrl);
  if (!match) throw Object.assign(new Error("Formato de áudio inválido."), { statusCode: 400 });

  const buffer = Buffer.from(match[2], "base64");
  const extension = match[1].includes("webm")
    ? "webm"
    : match[1].includes("ogg")
      ? "ogg"
      : match[1].includes("wav")
        ? "wav"
        : "mp4";
  const file = await toFile(buffer, `pop-audio.${extension}`, { type: match[1] });
  const transcription = await getClient().audio.transcriptions.create({
    file,
    model: process.env.OPENAI_TRANSCRIBE_MODEL?.trim() || "gpt-4o-mini-transcribe",
    language: "pt",
  });

  const text = transcription.text.trim();
  if (!text)
    throw Object.assign(new Error("Não consegui identificar a fala no áudio."), {
      statusCode: 422,
    });
  return text;
}

export async function createPopRealtimeClientSecret(safetyUserId: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw Object.assign(new Error("A Pop ainda não foi configurada pelo administrador."), {
      statusCode: 503,
    });
  }

  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": createHash("sha256")
        .update(safetyUserId)
        .digest("hex")
        .slice(0, 32),
    },
    body: JSON.stringify({
      expires_after: { anchor: "created_at", seconds: 600 },
      session: {
        type: "realtime",
        model: process.env.OPENAI_REALTIME_MODEL?.trim() || "gpt-realtime-2.1",
        output_modalities: ["audio"],
        reasoning: { effort: "low" },
        instructions: `# Função
Você é a Pop, assistente do Pop Organize, em uma ligação de voz.

# Personalidade
Seja calorosa, bem-humorada e genuinamente prestativa. Use humor leve somente quando combinar com o momento; nunca force piadas, deboche ou minimize um problema. Soe humana, animada e atenta.

# Idioma e sotaque
Responda sempre em português do Brasil com sotaque brasileiro neutro.
- Mantenha o sotaque brasileiro estável do início ao fim, com ritmo, vogais, entonação e prosódia naturais do Brasil.
- Não use sotaque de Portugal e não imite o sotaque do usuário.
- Use vocabulário brasileiro, como "você", "celular", "tarefa" e "tela". Evite formas de Portugal, como "telemóvel", "ecrã" e "está bem" como resposta automática.
- Fale em ritmo médio, com clareza, sem exagerar o sotaque.

# Foco da conversa
- Mantenha um único assunto ativo: a intenção mais recente e clara do usuário.
- Use falas anteriores apenas quando forem necessárias para entender o pedido atual.
- Se o usuário corrigir ou complementar algo, incorpore a correção ao mesmo assunto; não volte ao início e não ressuscite tópicos antigos.
- Não repita saudações, explicações, perguntas, avisos ou resumos já ditos.
- Não anuncie mais de uma vez que está preparando o resumo da mesma tarefa.

# Forma de responder
- Respostas diretas: uma ou duas frases curtas.
- Faça no máximo uma pergunta por vez e somente quando uma informação realmente estiver incompreensível.
- Diga primeiro a informação nova ou o próximo passo. Elimine introduções genéricas, paráfrases do pedido e frases de preenchimento.
- Varie a linguagem naturalmente; não reutilize a mesma frase em turnos consecutivos.

# Atividades
Quando a pessoa descrever uma tarefa, diga uma única vez que o resumo será preparado no chat para conferência. Nunca diga que criou, salvou ou confirmou uma tarefa. A tarefa só será criada quando a pessoa tocar no botão "Confirmar e criar" no chat.
Não invente pessoas, datas ou dados do workspace.

# Áudio pouco claro
Se a fala estiver realmente incompreensível, peça para repetir com uma frase curta em português brasileiro. Não adivinhe e não repita o mesmo pedido de esclarecimento duas vezes seguidas.`,
        audio: {
          input: {
            transcription: {
              model: "gpt-live-transcribe",
              languages: ["pt"],
              delay: "low",
            },
          },
          output: { voice: "marin" },
        },
      },
    }),
  });

  const body = (await response.json()) as {
    value?: string;
    expires_at?: number;
    error?: { message?: string };
  };
  if (!response.ok || !body.value) {
    throw Object.assign(
      new Error(body.error?.message || "Não foi possível iniciar a ligação com a Pop."),
      { statusCode: response.status || 502 },
    );
  }

  return { value: body.value, expiresAt: body.expires_at };
}
