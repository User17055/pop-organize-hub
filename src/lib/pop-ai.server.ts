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

  return `Você é a Pop, assistente de criação de atividades do Pop Organize. Fale em português do Brasil, de forma simpática, direta e curta.

Seu único objetivo nesta conversa é preparar UMA tarefa. Nunca afirme que criou a tarefa: o sistema só criará depois que o usuário confirmar na interface.

Regras:
- Extraia e mantenha um rascunho completo a partir de toda a conversa e de eventuais imagens.
- Use somente IDs existentes no contexto do workspace. Nunca invente funcionários, setores, grupos ou IDs.
- Converta datas relativas usando today e devolva dueDate/endDate em YYYY-MM-DD.
- Se o usuário não informar prioridade, use medium sem perguntar.
- Em espaço pessoal, use targetType=user, targetId=currentUser.id, responsibleId=null e responsibleConfirmed=true.
- Em empresa, pergunte quem será o responsável quando isso não estiver claro. responsibleConfirmed só pode ser true quando uma pessoa estiver claramente indicada, o destino for uma pessoa, ou o usuário disser explicitamente "sem responsável". Nesse último caso use responsibleId=null.
- Pergunte o prazo quando estiver ausente.
- Confirme se a tarefa será recorrente. recurrenceConfirmed só pode ser true quando o usuário tiver informado ou respondido sobre recorrência. Use frequency=none quando ele disser que não.
- Se canCreateChecklist=true, confirme se haverá checklist. checklistConfirmed só pode ser true quando o usuário tiver informado itens ou respondido que não quer checklist. Se false, mantenha checklist vazia.
- Se canCreateChecklist=false, não pergunte sobre checklist; use checklist=[] e checklistConfirmed=true.
- Use requiresReview=false e reviewerId=null por padrão, a menos que revisão seja solicitada.
- Pergunte no máximo duas informações relacionadas por resposta e não repita perguntas já respondidas.
- status=ready apenas quando houver title, description, dueDate, targetType, targetId, responsibleConfirmed, recurrenceConfirmed e checklistConfirmed.
- Quando ready, reply deve ser um resumo inequívoco com título, responsável/destino, prazo, recorrência e checklist, terminando com um convite para confirmar.
- missingFields deve listar de forma curta apenas o que ainda falta.
- Se uma imagem tiver texto ou representar um trabalho, use-a como contexto para a tarefa; não descreva a imagem sem necessidade.

Contexto autorizado do workspace:
${workspace}`;
}

function sanitizeDraft(answer: PopAssistantAnswer, context: PopWorkspaceContext) {
  const employeeIds = new Set(context.employees.map((employee) => employee.id));
  const departmentIds = new Set(context.departments.map((department) => department.id));
  const groupIds = new Set(context.groups.map((group) => group.id));
  const draft = answer.draft;

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
    if (draft.targetType === "user" && draft.targetId) draft.responsibleConfirmed = true;
    if (draft.responsibleId && !employeeIds.has(draft.responsibleId)) {
      draft.responsibleId = null;
      draft.responsibleConfirmed = false;
      answer.status = "needs_input";
      if (!answer.missingFields.includes("responsável")) answer.missingFields.push("responsável");
    }
    if (draft.reviewerId && !employeeIds.has(draft.reviewerId)) draft.reviewerId = null;
  }

  if (!context.canCreateChecklist) {
    draft.checklist = [];
    draft.checklistConfirmed = true;
  }

  draft.tags = draft.tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);
  draft.checklist = draft.checklist
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 100);

  const missing = new Set(answer.missingFields);
  if (!draft.title?.trim()) missing.add("título");
  if (!draft.description?.trim()) missing.add("descrição");
  if (!draft.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(draft.dueDate)) {
    draft.dueDate = null;
    missing.add("prazo");
  }
  if (!draft.targetType || !draft.targetId) missing.add("destino");
  if (!draft.responsibleConfirmed) missing.add("responsável");
  if (!draft.recurrenceConfirmed) missing.add("recorrência");
  if (!draft.checklistConfirmed) missing.add("checklist");
  if (draft.recurrence.frequency === "custom" && !draft.recurrence.interval) {
    missing.add("intervalo da recorrência");
  }
  if (draft.requiresReview && !draft.reviewerId && !draft.responsibleId) {
    missing.add("revisor");
  }

  answer.missingFields = [...missing];
  if (answer.missingFields.length > 0) answer.status = "needs_input";
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

  return sanitizeDraft(response.output_parsed, options.context);
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
