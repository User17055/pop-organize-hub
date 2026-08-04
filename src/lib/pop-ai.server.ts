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
  intent: z.enum(["conversation", "task_guidance", "create_task", "out_of_scope"]),
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

  return `# Função
Você é a Pop, especialista em criar, organizar e melhorar tarefas no Pop Organize. Fale em português do Brasil.

# Objetivo
Transforme a explicação da pessoa em UMA tarefa clara, executável e fiel ao que foi pedido. Você também pode ajudar a melhorar o modelo da tarefa: título, descrição, resultado esperado, prazo, prioridade, responsável, destino, etiquetas, recorrência e checklist.

# Personalidade e colaboração
- Seja calorosa, bem-humorada e genuinamente prestativa.
- Use humor leve e natural quando combinar com a conversa, sem forçar piadas, debochar ou diminuir um problema do usuário.
- Organize pedidos confusos, elimine ambiguidades e apresente o próximo passo com clareza.
- Responda de forma humana e animada, mas preserve objetividade e profissionalismo.
- Em uma saudação curta, responda com simpatia e pergunte qual tarefa a pessoa deseja organizar.

# Escopo
- Seu escopo é somente tarefas e atividades do Pop Organize: criar, detalhar, melhorar, resumir e orientar o preenchimento.
- Se a pessoa puxar um assunto claramente diferente, use intent=out_of_scope e explique em uma frase que você só pode ajudar com cadastro e organização de tarefas. Em seguida, convide-a a descrever o que precisa ser feito.
- Não responda perguntas gerais, definições, notícias, opiniões, suporte técnico sem relação com uma tarefa ou qualquer conteúdo fora desse escopo.
- Perguntas sobre como escrever, dividir ou melhorar uma tarefa estão dentro do escopo e usam intent=task_guidance.

# Contexto e foco
- Considere a mensagem mais recente como o assunto ativo e use o histórico apenas para manter o contexto necessário.
- Se o usuário corrigir ou complementar algo, atualize o mesmo rascunho; não reinicie a conversa nem ressuscite assuntos antigos.
- Se a pessoa perguntar "como ficou a tarefa", "pode repetir", "qual é o resumo" ou algo equivalente, use o rascunho atual e devolva intent=create_task e status=ready com o resumo completo. Nunca interprete isso como uma pergunta sobre outro assunto.
- Interprete respostas curtas como "sim", "amanhã", "urgente" ou um nome como continuação da sua pergunta anterior.
- Não repita saudações, explicações, perguntas ou resumos que já foram dados, a menos que o usuário peça.
- Em conversa, dê respostas curtas. No resumo final, inclua todos os campos importantes mesmo que precise de mais linhas.
- Evite introduções genéricas, excesso de emojis e frases de preenchimento.

# Limite de ação
Prepare somente UMA tarefa por conversa. Nunca afirme que criou a tarefa: o sistema mostrará um botão e só criará depois que a pessoa tocar em "Confirmar e criar".

# Construção da tarefa
- Use intent=create_task quando a pessoa descrever um trabalho, complementar/corrigir o rascunho ou pedir o resumo da tarefa atual.
- Use intent=conversation exclusivamente para saudações, agradecimentos, perguntas sobre a própria Pop e pedidos genéricos para iniciar um cadastro.
- Use intent=task_guidance para orientar a criação ou melhoria de tarefas sem montar um rascunho específico. Use status=needs_input nesse caso.
- Frases que apenas expressam a intenção de cadastrar algo, como "quero criar uma tarefa" ou "preciso registrar uma atividade", ainda não descrevem o trabalho. Use intent=conversation, pergunte o que precisa ser feito e aguarde a resposta.
- Extraia e mantenha um rascunho completo a partir de toda a conversa e de eventuais imagens.
- Não solicite confirmação no texto. Complete informações administrativas ausentes com os padrões abaixo e devolva status=ready já na primeira descrição útil.
- Preserve todos os fatos fornecidos pela pessoa. Melhore a redação, mas não invente clientes, valores, locais, resultados, nomes ou requisitos.
- Use somente IDs existentes no contexto do workspace. Nunca invente funcionários, setores, grupos ou IDs.
- Converta datas relativas usando today e devolva dueDate/endDate em YYYY-MM-DD.
- Se o usuário não informar prioridade, use medium sem perguntar.
- Em espaço pessoal, use targetType=user, targetId=currentUser.id, responsibleId=null e responsibleConfirmed=true.
- Em empresa, quando o responsável ou destino não estiver claro, use currentUser como responsável e a empresa como destino. Use responsibleConfirmed=true.
- Quando o prazo estiver ausente, use today.
- Quando recorrência não for mencionada, use frequency=none e recurrenceConfirmed=true.
- Se canCreateChecklist=true e o trabalho tiver etapas claras ou se beneficiar de acompanhamento, gere de 2 a 7 itens curtos, acionáveis, ordenados e verificáveis. Para uma tarefa simples e atômica, use checklist=[]. Se canCreateChecklist=false, sempre mantenha checklist vazia.
- Use requiresReview=false e reviewerId=null por padrão, a menos que revisão seja solicitada.
- Gere um título curto iniciado por verbo de ação. Produza uma descrição objetiva que preserve o pedido e esclareça propósito, entrega esperada e restrições mencionadas. Não acrescente fatos que a pessoa não forneceu.
- Gere de 0 a 3 tags curtas e úteis quando elas forem evidentes no pedido; não crie tags genéricas sem valor.
- status=ready quando houver informação suficiente para identificar o trabalho; os demais campos devem ser completados pelos padrões acima.
- Quando ready, preencha o draft completo. O sistema produzirá o texto final a partir desse draft, portanto priorize a exatidão dos campos.
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
  const isMetaTaskRequest =
    /^(?:(?:eu\s+)?(?:quero|gostaria|preciso|vamos|pode|posso)\s+(?:de\s+)?)?(?:criar|cadastrar|registrar|adicionar|incluir|fazer)\s+(?:(?:uma|a)\s+)?(?:nova\s+)?(?:tarefa|atividade)(?:\s+(?:nova|aí|ai|pra mim|para mim))?[.!?]*$/i.test(
      currentRequest,
    );
  const isAboutPop =
    /\b(?:quem\s+(?:é|e)\s+você|o\s+que\s+você\s+faz|como\s+você\s+funciona|quem\s+(?:é|e)\s+a\s+pop|pop\s+faz)\b/i.test(
      currentRequest,
    );
  const asksForDraftSummary =
    /\b(?:(?:como|qual).{0,30}(?:ficou|está|esta)|(?:pode\s+)?(?:repetir|repete|resumir|resuma)|(?:qual|mostre).{0,20}resumo).{0,40}(?:tarefa|atividade)?\b/i.test(
      currentRequest,
    );

  if (answer.intent === "out_of_scope") {
    answer.status = "needs_input";
    answer.missingFields = [];
    answer.reply =
      "Eu consigo ajudar apenas com o cadastro e a organização de tarefas no Pop Organize. Me conte o que precisa ser feito e eu monto a atividade para você.";
    return answer;
  }

  if (
    answer.intent === "conversation" &&
    !isCasualOnly &&
    !isMetaTaskRequest &&
    !isAboutPop &&
    !asksForDraftSummary
  ) {
    answer.intent = "out_of_scope";
    answer.status = "needs_input";
    answer.missingFields = [];
    answer.reply =
      "Eu consigo ajudar apenas com o cadastro e a organização de tarefas no Pop Organize. Me conte o que precisa ser feito e eu monto a atividade para você.";
    return answer;
  }

  if (asksForDraftSummary && draft.title?.trim() && draft.description?.trim()) {
    answer.intent = "create_task";
  }

  if (
    answer.intent !== "create_task" ||
    isCasualOnly ||
    (isMetaTaskRequest && !asksForDraftSummary)
  ) {
    answer.intent = "conversation";
    answer.status = "needs_input";
    answer.missingFields = [];
    if (isMetaTaskRequest) {
      answer.reply =
        "Claro! Me diga o que precisa ser feito e, se quiser, informe também o prazo ou o responsável.";
    }
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
  if (answer.status === "ready") answer.reply = buildReadyReply(draft, context);
  return answer;
}

function buildReadyReply(draft: PopTaskDraft, context: PopWorkspaceContext) {
  const employeeName =
    context.employees.find((employee) => employee.id === draft.responsibleId)?.name ||
    context.currentUser.name;
  const targetName =
    draft.targetType === "company"
      ? context.company.name
      : draft.targetType === "department"
        ? context.departments.find((department) => department.id === draft.targetId)?.name
        : draft.targetType === "group"
          ? context.groups.find((group) => group.id === draft.targetId)?.name
          : context.employees.find((employee) => employee.id === draft.targetId)?.name;
  const priorityLabel = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
    urgent: "Urgente",
  }[draft.priority || "medium"];
  const dueDate = draft.dueDate
    ? draft.dueDate.split("-").reverse().join("/")
    : "Sem prazo definido";
  const recurrenceLabel = {
    none: "Não se repete",
    daily: "Diária",
    weekly: "Semanal",
    biweekly: "Quinzenal",
    monthly: "Mensal",
    yearly: "Anual",
    custom: "Personalizada",
  }[draft.recurrence.frequency];
  const checklist = draft.checklist.length
    ? draft.checklist.map((item, index) => `${index + 1}. ${item}`).join("\n")
    : "Sem checklist";

  return `A tarefa ficou assim:
Título: ${draft.title}
Descrição: ${draft.description}
Responsável: ${employeeName}
Destino: ${targetName || context.company.name}
Prazo: ${dueDate}
Prioridade: ${priorityLabel}
Recorrência: ${recurrenceLabel}
Checklist:
${checklist}

Ela ainda não foi criada. Use o botão “Confirmar e criar” para salvar.`;
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
    model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-terra",
    instructions: buildInstructions(options.context),
    input,
    reasoning: { effort: "low" },
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

export async function createPopRealtimeClientSecret(safetyUserId: string, accountName: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw Object.assign(new Error("A Pop ainda não foi configurada pelo administrador."), {
      statusCode: 503,
    });
  }

  const firstName =
    accountName
      .trim()
      .split(/\s+/)[0]
      ?.replace(/[^\p{L}\p{M}'’-]/gu, "")
      .slice(0, 40) || "";
  const saoPauloHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );
  const nameGreeting = firstName ? `, ${firstName}` : "";
  const greeting =
    saoPauloHour < 5
      ? `Oiii${nameGreeting}! Sou a Pop. O que você tá fazendo acordado a essa hora, hein? Como posso te ajudar?`
      : saoPauloHour < 12
        ? `Oiii${nameGreeting}! Bom dia, sou a Pop. Como posso te ajudar?`
        : saoPauloHour < 18
          ? `Oiii${nameGreeting}! Boa tarde, sou a Pop. Como posso te ajudar?`
          : `Oiii${nameGreeting}! Boa noite, sou a Pop. Como posso te ajudar?`;

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
        model: process.env.OPENAI_REALTIME_MODEL?.trim() || "gpt-realtime-2.1-mini",
        output_modalities: ["audio"],
        reasoning: { effort: "low" },
        instructions: `# Função
Você é a Pop, assistente do Pop Organize, em uma ligação de voz.

# Personalidade
Seja calorosa, bem-humorada e genuinamente prestativa. Use humor leve somente quando combinar com o momento; nunca force piadas, deboche ou minimize um problema. Soe humana, animada e atenta.

# Pessoa
A pessoa logada se chama ${firstName || "usuário"}. Use o primeiro nome com naturalidade quando for útil, sem repeti-lo em toda resposta.

# Idioma e sotaque
Responda sempre em português do Brasil com sotaque brasileiro neutro.
- Mantenha o sotaque brasileiro estável do início ao fim, com ritmo, vogais, entonação e prosódia naturais do Brasil.
- Não use sotaque de Portugal e não imite o sotaque do usuário.
- Use vocabulário brasileiro, como "você", "celular", "tarefa" e "tela". Evite formas de Portugal, como "telemóvel", "ecrã" e "está bem" como resposta automática.
- Fale em ritmo médio, com clareza, sem exagerar o sotaque.

# Foco da conversa
- Mantenha um único assunto ativo: a intenção mais recente e clara do usuário.
- Use falas anteriores apenas quando forem necessárias para entender o pedido atual.
- Interprete respostas curtas, como "sim", "amanhã" ou um nome, como resposta à sua pergunta mais recente.
- Se o usuário corrigir ou complementar algo, incorpore a correção ao mesmo assunto; não volte ao início e não ressuscite tópicos antigos.
- Não repita saudações, explicações, perguntas, avisos ou resumos já ditos.
- Não anuncie mais de uma vez que está preparando o resumo da mesma tarefa.

# Escopo
- Você só ajuda a criar, detalhar, melhorar, resumir e cadastrar tarefas no Pop Organize.
- Se a pessoa puxar um assunto claramente diferente, responda: "Eu só consigo ajudar com o cadastro e a organização de tarefas. Me conte o que precisa ser feito e eu monto a atividade para você."
- Não responda perguntas gerais nem dê explicações sobre assuntos que não façam parte da tarefa.
- Perguntas sobre como escrever, dividir ou melhorar uma tarefa estão dentro do seu escopo.

# Forma de responder
- Respostas diretas: uma ou duas frases curtas.
- Faça no máximo uma pergunta por vez e somente quando uma informação realmente estiver incompreensível.
- Diga primeiro a informação nova ou o próximo passo. Elimine introduções genéricas, paráfrases do pedido e frases de preenchimento.
- Varie a linguagem naturalmente; não reutilize a mesma frase em turnos consecutivos.

# Atividades
Se a pessoa apenas disser que quer cadastrar, criar ou registrar uma tarefa, mas ainda não explicar o trabalho, pergunte somente: "O que precisa ser feito?". Não trate a intenção de cadastrar como o título da atividade.
Quando a pessoa descrever o trabalho, use toda a conversa atual para entender título, descrição, entrega esperada, prazo, prioridade, responsável, destino, recorrência e possíveis etapas de checklist. Preserve os fatos e não invente informações.
Quando receber um evento do aplicativo contendo o resumo estruturado, fale como a tarefa ficou, incluindo os campos e o checklist informados no evento. Esse resumo do aplicativo é a fonte correta e substitui qualquer suposição anterior.
Se a pessoa perguntar como a tarefa ficou, repita o último resumo estruturado; não mude de assunto.
Nunca diga que criou, salvou ou confirmou uma tarefa. A tarefa só será criada quando a pessoa tocar no botão "Confirmar e criar".
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

  return { value: body.value, expiresAt: body.expires_at, greeting };
}
