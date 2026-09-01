/**
 * Órbita Board — painel de projetos de um estúdio de design.
 * Todos os dados são fictícios e vivem em memória: recarregar volta ao estado inicial.
 */

/* ============================ tipos ============================ */

type StatusId = "todo" | "doing" | "review" | "done";
type Priority = "alta" | "media" | "baixa";
type GroupId = "clientes" | "estudio";

interface Person {
  /** Nome como aparece na interface. */
  name: string;
  /** Papel no estúdio. */
  role: string;
  /** Matiz HSL usada no avatar. */
  hue: number;
  /** Foto cadastrada no Pop Organize. */
  avatar?: string;
}

interface Section {
  id: string;
  name: string;
  desc: string;
  /** Horas apontadas, já formatadas. */
  hours: string;
  from: string;
  to: string;
}

interface Project {
  id: string;
  name: string;
  favorite: boolean;
  group: GroupId;
  /** Matiz da bolinha usada quando o projeto aparece em Favoritos. */
  hue: number;
  sections: Section[];
}

interface Task {
  id: string;
  project: string;
  section: string;
  status: StatusId;
  tag: string;
  title: string;
  desc: string;
  /** Chaves em PEOPLE. */
  who: string[];
  links: number;
  comments: number;
  /** Prazo em ISO (AAAA-MM-DD). */
  due: string;
  priority: Priority;
}

interface StatusDef { id: StatusId; name: string; color: string; fill: string }

interface State {
  /** Tela ativa: quadro do projeto ou painel geral. */
  screen: "board" | "dash" | "cal";
  /** Quadro mostrando só o que está atribuído a mim. */
  mine: boolean;
  /** Recorte de "Atribuído a mim". */
  mineRange: "hoje" | "semana" | "tudo";
  project: string;
  section: string;
  view: "kanban" | "lista" | "tabela";
  query: string;
  tags: Set<string>;
  who: Set<string>;
  priorities: Set<Priority>;
  open: Record<string, boolean>;
  week: Date;
  weekOn: boolean;
  /** Cartões do painel exibidos como tabela em vez de gráfico. */
  dashTables: Set<string>;
  /** Recorte da linha do tempo do painel. */
  range: "hoje" | "semana" | "mes" | "ano";
  /** Id da tarefa com o cronômetro rodando, se houver. */
  running: string | null;
  /** Segundos já apontados hoje. */
  elapsed: number;
  /** Dia aberto no calendário. */
  calDate: Date;
  /** Mês exibido no mini-calendário. */
  calMonth: Date;
  /** Filtro da agenda. */
  calFilter: "tarefas" | "reunioes" | "lembretes" | "tudo";
  /** Recorte do calendário. */
  calView: "dia" | "semana" | "mes" | "ano";
}

/* ============================ dados ============================ */

let PEOPLE: Record<string, Person> = {
  ar: { name: "André R.",  role: "Design lead",           hue: 32  },
  mc: { name: "Marina C.", role: "UX researcher",         hue: 168 },
  lf: { name: "Lucas F.",  role: "Designer de produto",   hue: 262 },
  bs: { name: "Bia S.",    role: "Redatora",              hue: 344 },
  tn: { name: "Téo N.",    role: "Dev front-end",         hue: 212 },
  jp: { name: "Joana P.",  role: "QA",                    hue: 140 },
  rg: { name: "Rafa G.",   role: "Motion designer",       hue: 18  },
  cv: { name: "Caio V.",   role: "Mídia paga",            hue: 96  },
};

let TAGS: Record<string, number> = {
  "UI Design": 18, "UX Research": 344, "Marketing": 142, "Web Design": 212,
  "3D": 262, "Copywriting": 74, "Motion": 14, "Dev": 186, "QA": 38,
};

const STATUS: StatusDef[] = [
  { id: "todo",   name: "A fazer",      color: "var(--s-todo)",   fill: "var(--f-todo)"   },
  { id: "doing",  name: "Em andamento", color: "var(--s-doing)",  fill: "var(--f-doing)"  },
  { id: "review", name: "Revisão / QA", color: "var(--s-review)", fill: "var(--f-review)" },
  { id: "done",   name: "Concluído",    color: "var(--s-done)",   fill: "var(--f-done)"   },
];

const PRIO_NAME: Record<Priority, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

let PROJECTS: Project[] = [
  { id: "nebula", name: "Nébula: app de streaming", favorite: true, group: "clientes", hue: 145, sections: [
    { id: "visao",    name: "Visão geral",     desc: "Painel de status do contrato, escopo fechado e pontos de decisão com o cliente.", hours: "41d, 6h, 12min", from: "03.02.2026", to: "30.10.2026" },
    { id: "branding", name: "Branding",        desc: "Identidade do Nébula: marca, sistema de cor, tipografia e o mascote que aparece nos estados vazios.", hours: "19d, 4h, 40min", from: "03.02.2026", to: "22.04.2026" },
    { id: "ios",      name: "App iOS",         desc: "O Nébula é um app de streaming com curadoria por editores. Esta frente cobre a interface iOS: feed, player, fila e onboarding.", hours: "28d, 2h, 28min", from: "24.02.2026", to: "12.11.2026" },
    { id: "landing",  name: "Landing page",    desc: "Página de lançamento com lista de espera, prova social e o anúncio do evento presencial.", hours: "9d, 1h, 05min", from: "12.06.2026", to: "30.09.2026" },
    { id: "dev",      name: "Desenvolvimento", desc: "Entrega dos componentes para o time de engenharia: tokens, specs e revisão de build.", hours: "22d, 7h, 55min", from: "01.05.2026", to: "20.12.2026" },
  ]},
  { id: "corvo", name: "Corvo Café — rebrand", favorite: true, group: "clientes", hue: 28, sections: [
    { id: "visao", name: "Visão geral", desc: "Rebrand completo de uma rede de cafeterias com 14 lojas: marca, embalagem e fachada.", hours: "12d, 3h, 20min", from: "05.05.2026", to: "18.12.2026" },
    { id: "ident", name: "Identidade",  desc: "Marca, paleta e tipografia do Corvo, do logotipo às aplicações de loja.", hours: "8d, 0h, 45min", from: "05.05.2026", to: "14.08.2026" },
    { id: "pack",  name: "Embalagem",   desc: "Linha de embalagens: pacote de grãos, copo, sachê e caixa de assinatura.", hours: "4d, 2h, 35min", from: "01.07.2026", to: "18.12.2026" },
  ]},
  { id: "tempero", name: "Tempero Delivery", favorite: false, group: "clientes", hue: 200, sections: [
    { id: "visao",  name: "Visão geral", desc: "App de delivery de refeições prontas. Frente de produto e de aquisição rodando em paralelo.", hours: "15d, 5h, 10min", from: "20.03.2026", to: "28.11.2026" },
    { id: "app",    name: "App",         desc: "Redesenho do carrinho e do fluxo de pagamento, principal ponto de abandono hoje.", hours: "11d, 1h, 30min", from: "20.03.2026", to: "30.09.2026" },
    { id: "growth", name: "Aquisição",   desc: "Campanhas, cupons e o programa de indicação que entra no ar em outubro.", hours: "4d, 3h, 40min", from: "01.08.2026", to: "28.11.2026" },
  ]},
  { id: "vitalis", name: "Clínica Vitalis", favorite: false, group: "clientes", hue: 275, sections: [
    { id: "visao", name: "Visão geral", desc: "Site institucional e agendamento online para uma clínica com quatro unidades.", hours: "6d, 4h, 15min", from: "11.08.2026", to: "20.01.2027" },
    { id: "site",  name: "Site",        desc: "Arquitetura de conteúdo, páginas de especialidade e o fluxo de agendamento em três passos.", hours: "6d, 4h, 15min", from: "11.08.2026", to: "20.01.2027" },
  ]},
  { id: "shots",   name: "Shots no Dribbble", favorite: false, group: "estudio", hue: 330, sections: [{ id: "fila",  name: "Fila de posts",    desc: "Recortes dos projetos que já foram ao ar, publicados às terças.", hours: "2d, 1h, 00min", from: "01.01.2026", to: "31.12.2026" }] },
  { id: "behance", name: "Cases no Behance",  favorite: false, group: "estudio", hue: 190, sections: [{ id: "cases", name: "Cases",            desc: "Estudos de caso longos: contexto, processo e resultado de cada projeto entregue.", hours: "5d, 6h, 30min", from: "01.01.2026", to: "31.12.2026" }] },
  { id: "site",    name: "Site do estúdio",   favorite: false, group: "estudio", hue: 52,  sections: [{ id: "v3",    name: "Versão 3",         desc: "Reescrita do site do Órbita com portfólio filtrável e página de processo.", hours: "7d, 2h, 50min", from: "15.06.2026", to: "15.02.2027" }] },
  { id: "manual",  name: "Manual de marca",   favorite: false, group: "estudio", hue: 10,  sections: [{ id: "v1",    name: "Primeira edição",  desc: "Como o Órbita se apresenta: voz, marca, grid e regras de aplicação.", hours: "3d, 0h, 20min", from: "02.09.2026", to: "20.12.2026" }] },
];

let seq = 100;

function task(
  project: string, section: string, status: StatusId, tag: string,
  title: string, desc: string, who: string[],
  links: number, comments: number, due: string, priority: Priority,
): Task {
  return { id: "t" + ++seq, project, section, status, tag, title, desc, who, links, comments, due, priority };
}

let TASKS: Task[] = [
  /* Nébula — App iOS */
  task("nebula","ios","todo","UI Design","Refazer os títulos dos cards do feed","O cliente mandou uma nova rodada de títulos e descrições. Atualizar os cards no arquivo mestre e avisar o time de dev antes do handoff de sexta.",["ar","mc","lf","tn","jp"],2,118,"2026-09-08","alta"),
  task("nebula","ios","todo","Copywriting","Microcopy dos estados vazios","Fila vazia, sem conexão e busca sem resultado. Três textos curtos, tom leve, sem culpar quem está lendo.",["bs"],1,19,"2026-09-10","media"),
  task("nebula","ios","todo","Dev","Tokens do tema escuro","Mapear cor, elevação e opacidade para o modo escuro e publicar como variáveis no repositório.",["tn","lf"],3,24,"2026-09-12","media"),
  task("nebula","ios","todo","QA","Checklist de acessibilidade do onboarding","Rodar VoiceOver nas quatro telas, conferir alvo de toque mínimo e contraste dos botões secundários.",["jp"],0,7,"2026-09-19","baixa"),
  task("nebula","ios","doing","UX Research","Ordenação da fila [2ª rodada]","Primeira rodada não conclusiva: metade dos participantes esperava ordem cronológica, metade por progresso. Testando com 8 assinantes e um protótipo com as duas opções.",["mc","bs","jp"],1,97,"2026-09-04","alta"),
  task("nebula","ios","doing","Motion","Transições entre as abas do app","Entrada e saída das abas, mais o comportamento do player quando ele encolhe para o rodapé.",["rg"],3,12,"2026-08-28","alta"),
  task("nebula","ios","review","Marketing","Anúncios em vídeo para TikTok, Reels e Stories","Seis peças de 9:16, duas por plataforma, com a legenda queimada no vídeo.",["cv","rg"],2,235,"2026-09-03","alta"),
  task("nebula","ios","review","3D","Animação 3D do mascote","Loop de 4 segundos do mascote para o estado vazio da fila. Render em três resoluções.",["lf","rg","mc"],12,85,"2026-09-05","media"),
  task("nebula","ios","review","UI Design","Player em tela cheia — estados de erro","Falha de rede, conteúdo indisponível na região e assinatura expirada.",["ar","tn"],4,31,"2026-09-06","media"),
  task("nebula","ios","done","UI Design","Grid e espaçamentos do feed","Grid de 4 colunas com respiro de 20px, validado nos três tamanhos de tela.",["ar"],5,66,"2026-08-21","media"),
  task("nebula","ios","done","Dev","Protótipo navegável no TestFlight","Build 0.9 no ar para os 12 participantes da pesquisa.",["tn","lf"],8,40,"2026-08-14","alta"),
  task("nebula","ios","done","UX Research","Entrevistas com 12 assinantes","Uma hora cada, transcritas e codificadas em cinco temas.",["mc","bs"],6,152,"2026-08-07","alta"),
  task("nebula","ios","done","Copywriting","Nomes das seções da home","Sete seções nomeadas e aprovadas pelo cliente na primeira rodada.",["bs","cv"],1,28,"2026-07-31","baixa"),
  /* Nébula — outras frentes */
  task("nebula","branding","doing","3D","Modelagem do mascote","Malha limpa, rig simples e três poses de referência.",["lf"],4,44,"2026-09-11","media"),
  task("nebula","branding","todo","UI Design","Escala tipográfica da marca","Nove tamanhos, do rótulo ao display, com altura de linha definida.",["ar","bs"],2,16,"2026-09-16","baixa"),
  task("nebula","branding","done","Marketing","Kit de imprensa","Logo, paleta e três frases de apresentação empacotados para a assessoria.",["cv"],3,58,"2026-08-19","media"),
  task("nebula","landing","doing","Web Design","Landing do evento presencial + anúncio do app","Peça única com contagem regressiva, inscrição e o vídeo de 30 segundos no topo.",["rg","tn","cv"],21,43,"2026-09-09","alta"),
  task("nebula","landing","todo","Copywriting","Chamada principal da página","Três versões para teste A/B, no máximo doze palavras cada.",["bs"],1,9,"2026-09-13","media"),
  task("nebula","landing","review","Dev","Formulário de lista de espera","Validação de e-mail, mensagem de erro clara e confirmação sem recarregar a página.",["tn"],5,22,"2026-09-07","alta"),
  task("nebula","visao","doing","UX Research","Consolidar aprendizados das duas rodadas","Um documento só, com os cinco temas e o que cada um muda no roadmap.",["mc"],7,64,"2026-09-18","media"),
  task("nebula","visao","todo","Marketing","Plano de mídia do lançamento","Verba, canais e janela de veiculação das quatro semanas de campanha.",["cv","ar"],3,31,"2026-09-25","alta"),
  task("nebula","dev","doing","Dev","Biblioteca de componentes v2","Trinta e um componentes documentados, com estados de foco e carregamento.",["tn","lf"],9,77,"2026-10-02","alta"),
  task("nebula","dev","review","QA","Regressão visual do build 1.2","Comparar 40 telas contra a base e abrir issue para cada diferença acima do limiar.",["jp"],2,18,"2026-09-14","media"),
  task("nebula","dev","todo","Dev","Specs de animação para o time iOS","Curvas, durações e o que deve respeitar 'reduzir movimento'.",["rg","tn"],4,11,"2026-09-22","baixa"),
  /* Corvo Café */
  task("corvo","ident","doing","UI Design","Logotipo — terceira rodada","O cliente pediu o corvo mais anguloso e a palavra em caixa alta.",["ar","lf"],6,73,"2026-09-05","alta"),
  task("corvo","ident","todo","Copywriting","Assinatura da marca","Uma linha que caiba embaixo do logo e funcione sozinha na fachada.",["bs"],1,14,"2026-09-17","media"),
  task("corvo","ident","review","Web Design","Aplicações em fachada","Simulação nas três fachadas mais visíveis da rede.",["rg"],3,26,"2026-09-08","media"),
  task("corvo","pack","doing","UI Design","Pacote de grãos 250g","Frente, verso e a janela transparente que o cliente quer manter.",["lf","ar"],5,39,"2026-09-19","alta"),
  task("corvo","pack","todo","3D","Mockup dos quatro formatos","Render em estúdio para o case e para o e-commerce.",["rg"],2,8,"2026-09-26","baixa"),
  task("corvo","visao","done","Marketing","Diagnóstico da marca atual","Auditoria das 14 lojas, com foto de cada aplicação inconsistente.",["cv","mc"],11,102,"2026-06-30","media"),
  /* Tempero Delivery */
  task("tempero","app","doing","UX Research","Onde as pessoas abandonam o carrinho","Gravações de 30 sessões, marcando o passo exato da desistência.",["mc","jp"],4,55,"2026-09-10","alta"),
  task("tempero","app","todo","UI Design","Carrinho — nova estrutura","Resumo fixo no rodapé e cupom em um passo só.",["ar"],2,21,"2026-09-15","alta"),
  task("tempero","app","review","Dev","Pagamento em uma tela","Cartão salvo, Pix e vale-refeição sem trocar de tela.",["tn"],7,48,"2026-09-06","alta"),
  task("tempero","growth","doing","Marketing","Programa de indicação","Regra, valor do crédito e as telas de convite e resgate.",["cv","bs"],3,33,"2026-10-01","media"),
  task("tempero","growth","todo","Motion","Vinheta de 6s para pré-roll","Fecha com o prato montado e o logo.",["rg"],1,6,"2026-09-24","baixa"),
  /* Clínica Vitalis */
  task("vitalis","site","doing","Web Design","Fluxo de agendamento em três passos","Especialidade, profissional e horário. Sem cadastro antes do último passo.",["ar","tn"],5,29,"2026-09-12","alta"),
  task("vitalis","site","todo","Copywriting","Textos das páginas de especialidade","Sete páginas, linguagem simples, sem promessa de resultado.",["bs"],2,13,"2026-09-20","media"),
  task("vitalis","site","todo","QA","Teste em leitores de tela","Percorrer o agendamento inteiro só com teclado.",["jp"],0,4,"2026-09-30","media"),
  task("vitalis","visao","done","UX Research","Conversa com as recepções das 4 unidades","Como o agendamento funciona hoje e o que trava na prática.",["mc"],3,47,"2026-08-12","media"),
  /* Estúdio */
  task("shots","fila","doing","Marketing","Shot do rebrand do Corvo","Recorte da embalagem, publicar quando o cliente liberar.",["cv"],1,5,"2026-09-09","baixa"),
  task("shots","fila","todo","Motion","Shot animado das transições do Nébula","Loop de 3 segundos, fundo neutro.",["rg"],1,2,"2026-09-23","baixa"),
  task("behance","cases","doing","Copywriting","Case do Tempero Delivery","Contexto, processo e o número de abandono antes e depois.",["bs","mc"],4,17,"2026-09-27","media"),
  task("behance","cases","todo","UI Design","Capas padronizadas dos cases","Mesmo grid e mesma família tipográfica nos nove cases.",["ar"],2,9,"2026-10-06","baixa"),
  task("site","v3","doing","Web Design","Portfólio filtrável","Filtro por tipo de trabalho e por ano, sem recarregar a página.",["ar","tn"],6,35,"2026-10-10","media"),
  task("site","v3","todo","Copywriting","Página de processo","Como o estúdio trabalha, em quatro etapas e sem jargão.",["bs"],1,7,"2026-10-15","baixa"),
  task("manual","v1","todo","UI Design","Grid e margens do manual","Formato A4 deitado, coluna dupla.",["ar","lf"],1,3,"2026-10-20","baixa"),
  task("manual","v1","doing","Copywriting","Capítulo de voz e tom","Como o estúdio escreve, com exemplo do que fazer e do que evitar.",["bs"],2,11,"2026-10-08","media"),
];

/* ============================ utilidades ============================ */

let TODAY = new Date("2026-09-01T00:00:00");
/** A pessoa logada — as tarefas dela alimentam "Atribuído a mim". */
let ME = "ar";
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const MES_CURTO = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

function weekStart(d: Date): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  x.setHours(0, 0, 0, 0);
  return x;
}

const state: State = {
  screen: "board",
  mine: false,
  mineRange: "hoje",
  project: "nebula",
  section: "ios",
  view: "kanban",
  query: "",
  tags: new Set<string>(),
  who: new Set<string>(),
  priorities: new Set<Priority>(),
  open: { fav: true, clientes: true, estudio: true },
  week: weekStart(TODAY),
  weekOn: false,
  dashTables: new Set<string>(),
  range: "semana",
  running: null,
  elapsed: 5283,
  calDate: new Date(TODAY.getTime()),
  calMonth: new Date(TODAY.getTime()),
  calFilter: "tarefas",
  calView: "dia",
};

function $<T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error("elemento não encontrado: " + sel);
  return el;
}

const esc = (s: unknown): string =>
  String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

function project(id: string = state.project): Project {
  return PROJECTS.find(p => p.id === id) ?? PROJECTS[0]!;
}
function section(): Section {
  const p = project();
  return p.sections.find(s => s.id === state.section) ?? p.sections[0]!;
}
const statusOf = (id: StatusId): StatusDef => STATUS.find(s => s.id === id)!;

const initials = (key: string): string => {
  const p = PEOPLE[key];
  if (!p) return "??";
  const parts = p.name.split(" ");
  return (parts[0]![0]! + (parts[1] ? parts[1][0]! : "")).toUpperCase();
};

function avatar(key: string, cls = ""): string {
  const p = PEOPLE[key];
  if (!p) return "";
  const photoStyle = p.avatar
    ? `;background-image:url(${JSON.stringify(p.avatar)});background-size:cover;background-position:center`
    : "";
  return `<span class="av ${cls}" style="${esc(`--h:${p.hue}${photoStyle}`)}" title="${esc(p.name + " · " + p.role)}">${p.avatar ? "" : initials(key)}</span>`;
}
function avatarStack(keys: string[], max = 3): string {
  const head = keys.slice(0, max).map(k => avatar(k)).join("");
  const rest = keys.length > max ? `<span class="av more">+${keys.length - max}</span>` : "";
  return `<span class="stack">${head}${rest}</span>`;
}
const tagChip = (name: string): string =>
  `<span class="tag" style="--h:${TAGS[name] ?? 0}">${esc(name)}</span>`;

const dayDiff = (iso: string): number =>
  Math.round((new Date(iso + "T00:00:00").getTime() - TODAY.getTime()) / 86_400_000);

/** Classe do prazo: vencido, vence em até 3 dias, ou normal. */
function dueClass(t: Task): string {
  if (t.status === "done") return "";
  const d = dayDiff(t.due);
  return d < 0 ? " late" : d <= 3 ? " soon" : "";
}
const isLate = (t: Task): boolean => t.status !== "done" && dayDiff(t.due) < 0;

function fmtShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function fmtLong(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MES_CURTO[d.getMonth()]} ${d.getFullYear()}`;
}
const dm = (d: Date): string =>
  `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;

/* ============================ ícones ============================ */

const I = {
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/></svg>`,
  flag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4h13l-2.4 4L18 12H5"/></svg>`,
  link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7L11.4 6"/><path d="M14 11a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7L12.6 18"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-8 8H7l-4 2 1.4-4A8 8 0 1 1 21 12Z"/></svg>`,
  cal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.4"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8Z"/></svg>`,
  starOn: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8Z"/></svg>`,
  chev: `<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  pen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16Z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 4h4M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>`,
  mytasks: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h9M4 12h7M4 18h5"/><path d="m14 15 2.4 2.4L21 13"/></svg>`,
  mag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>`,
  dots: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>`,
  alta: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 6-6 6 6"/></svg>`,
  media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 9h14M5 15h14"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.2v13.6L19 12Z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.4"/><rect x="13.5" y="5" width="4" height="14" rx="1.4"/></svg>`,
  right: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m10 6 6 6-6 6"/></svg>`,
  left: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m14 6-6 6 6 6"/></svg>`,
  video: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="13" height="12" rx="3"/><path d="m15.5 10.5 6-3v9l-6-3Z"/></svg>`,
  mic2: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0M16.5 5.3a3.2 3.2 0 0 1 0 5.4M18 20a5.8 5.8 0 0 0-2.6-4.8"/></svg>`,
  ext: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-8 8M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></svg>`,
  baixa: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 10 6 6 6-6"/></svg>`,
} as const;

const prioChip = (p: Priority): string =>
  `<span class="prio ${p}" title="Prioridade ${PRIO_NAME[p].toLowerCase()}">${I[p]}${PRIO_NAME[p]}</span>`;

/* ============================ filtros ============================ */

const weekEnd = (): Date => {
  const e = new Date(state.week.getTime());
  e.setDate(e.getDate() + 6);
  return e;
};

const inSection = (t: Task): boolean => t.project === state.project && t.section === state.section;

/** A tarefa está agendada para este dia da semana na linha do tempo? */
const scheduledOn = (t: Task, day: number): boolean =>
  SCHEDULE.some(b => b.day === day && b.task === t.title);

/** O que está atribuído a mim dentro do recorte escolhido. */
function isMine(t: Task, range: State["mineRange"] = state.mineRange): boolean {
  if (!t.who.includes(ME)) return false;
  if (range === "tudo") return true;
  const d = dayDiff(t.due);
  const open = t.status !== "done";
  if (range === "hoje") return scheduledOn(t, weekdayOf(TODAY)) || d === 0 || (open && d < 0);
  return scheduledOn(t, 0) || scheduledOn(t, 1) || scheduledOn(t, 2) || scheduledOn(t, 3) || scheduledOn(t, 4)
    || (d >= 0 && d <= 6) || (open && d < 0);
}

function isVisible(t: Task): boolean {
  if (state.mine ? !isMine(t) : !inSection(t)) return false;
  if (state.tags.size && !state.tags.has(t.tag)) return false;
  if (state.priorities.size && !state.priorities.has(t.priority)) return false;
  if (state.who.size && !t.who.some(k => state.who.has(k))) return false;
  if (state.weekOn) {
    const d = new Date(t.due + "T00:00:00");
    if (d < state.week || d > weekEnd()) return false;
  }
  if (state.query) {
    const q = state.query.toLowerCase();
    if (!`${t.title} ${t.desc} ${t.tag}`.toLowerCase().includes(q)) return false;
  }
  return true;
}

const visibleTasks = (): Task[] => TASKS.filter(isVisible);

/** Os mesmos filtros de etiqueta, prioridade e pessoa, sem prender à frente aberta. */
function matchesFilters(t: Task): boolean {
  if (state.tags.size && !state.tags.has(t.tag)) return false;
  if (state.priorities.size && !state.priorities.has(t.priority)) return false;
  if (state.who.size && !t.who.some(k => state.who.has(k))) return false;
  if (state.query && !`${t.title} ${t.desc} ${t.tag}`.toLowerCase().includes(state.query.toLowerCase())) return false;
  return true;
}
const filterCount = (): number =>
  state.tags.size + state.who.size + state.priorities.size + (state.query ? 1 : 0) + (state.weekOn ? 1 : 0);

/* ============================ barra lateral ============================ */

function projectRow(p: Project, expand: boolean, colored: boolean): string {
  const active = p.id === state.project;
  const cls = `pitem${colored ? " hue" : ""}`;
  let html =
    `<button class="${cls}" data-project="${p.id}" style="--dh:${p.hue}"${active ? ' aria-current="true"' : ""}>` +
    `<span class="dotm"></span><span class="nm">${esc(p.name)}</span>` +
    `<span class="star${p.favorite ? " on" : ""}" data-fav="${p.id}" role="button" tabindex="0" ` +
    `aria-label="Favoritar ${esc(p.name)}">${p.favorite ? I.starOn : I.star}</span></button>`;
  if (active && expand) {
    html += `<div class="subs">`;
    for (const s of p.sections) {
      html += `<button class="sitem" data-section="${s.id}"${s.id === state.section ? ' aria-current="true"' : ""}>` +
        `<span class="dotm"></span>${esc(s.name)}</button>`;
    }
    html += `</div><button class="addtask" data-new="1">${I.plus}Criar nova tarefa</button>`;
  }
  return html;
}

function groupBlock(key: string, label: string, items: Project[], colored: boolean, expand: boolean): string {
  const rows = items.map(p => projectRow(p, expand, colored)).join("");
  return `<div class="grp${state.open[key] ? "" : " closed"}">` +
    `<button class="grp-h" data-group="${key}">${I.chev}${label}</button>` +
    `<div class="grp-body"><div>${rows}</div></div></div>`;
}

function renderSidebar(): void {
  const favs = PROJECTS.filter(p => p.favorite);
  const hoje = TASKS.filter(t => isMine(t, "hoje")).length;
  let html =
    `<button class="mine" data-mine="1"${state.mine ? ' aria-current="true"' : ""}>` +
    `${I.mytasks}<span class="nm">Atribuído a mim</span>` +
    (hoje ? `<span class="cnt2">${hoje}</span>` : "") + `</button>`;
  // Só em Favoritos a bolinha usa a cor do projeto; nos outros grupos ela segue o tema.
  if (favs.length) html += groupBlock("fav", "Favoritos", favs, true, false);
  html += groupBlock("clientes", "Todos os projetos", PROJECTS.filter(p => p.group === "clientes"), false, true);
  const studioProjects = PROJECTS.filter(p => p.group === "estudio");
  if (studioProjects.length) html += groupBlock("estudio", "Coisas do estúdio", studioProjects, false, true);
  $("#sideScroll").innerHTML = html;
  $("#sideScroll").querySelectorAll<HTMLElement>(".pitem").forEach((el, i) => {
    el.style.animationDelay = `${Math.min(i, 12) * 22}ms`;
  });
}

/* ============================ cabeçalho ============================ */

function renderWeek(): void {
  const end = weekEnd();
  $("#weekRange").textContent = `${dm(state.week)} – ${dm(end)}`;
  const mes = MESES[end.getMonth()]!;
  $("#weekSub").textContent = `${mes[0]!.toUpperCase()}${mes.slice(1)}, semana ${Math.ceil(end.getDate() / 7)}`;
  $("#weekLab").setAttribute("aria-pressed", String(state.weekOn));
}

function renderHeader(): void {
  if (state.mine) { renderMineHeader(); return; }
  const p = project();
  const s = section();

  $("#headLeft").innerHTML =
    `<span class="tree" aria-hidden="true"></span>` +
    `<h1 class="ptitle"><span class="dotm"></span>${esc(p.name)}` +
    `<button class="lk" id="linkBtn" title="Copiar link do projeto" aria-label="Copiar link do projeto">${I.link}</button></h1>` +
    `<div class="tabs">` + p.sections.map(x =>
      `<button class="tab" data-section="${x.id}"${x.id === state.section ? ' aria-current="true"' : ""}>` +
      `<span class="dotm"></span>${esc(x.name)}</button>`).join("") + `</div>`;

  const all = TASKS.filter(inSection);
  const done = all.filter(t => t.status === "done").length;
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;
  const late = all.filter(isLate).length;
  const team = [...new Set(all.flatMap(t => t.who))];

  $("#brief").innerHTML =
    `<div class="brief-h"><h2>${esc(s.name)}</h2>` +
    `<button class="ed" data-edit-section="1" title="Editar esta frente" aria-label="Editar esta frente">${I.pen}</button>` +
    `<div class="brief-tools">` +
      `<button data-focus-search="1" title="Buscar nesta frente" aria-label="Buscar nesta frente">${I.mag}</button>` +
      `<button data-fav="${p.id}" title="Favoritar projeto" aria-label="Favoritar projeto"` +
        `${p.favorite ? ' style="color:#C6CAD1"' : ""}>${p.favorite ? I.starOn : I.star}</button>` +
      `<button data-more="1" title="Mais ações" aria-label="Mais ações">${I.dots}</button>` +
    `</div></div>` +
    `<p>${esc(s.desc)}</p>` +
    `<div class="brief-b"><div class="meta">` +
      `<i>${I.clock}<span>${s.hours}</span></i>` +
      `<i class="flag">${I.flag}<span>${s.from} <em>—</em> ${s.to}</span></i>` +
      (late ? `<i style="color:var(--red)">${I.cal}<span>${late} atrasada${late > 1 ? "s" : ""}</span></i>` : "") +
    `</div><span class="push"></span>` +
    avatarStack(team, 3) +
    `<button class="invite" data-invite="1">Convidar</button></div>` +
    `<div class="bar"><span style="width:${pct}%"></span></div>` +
    `<div class="barlab"><span>${done} de ${all.length} tarefas concluídas</span><span>${pct}%</span></div>`;

  const n = filterCount();
  const badge = $("#filterCount");
  badge.hidden = n === 0;
  badge.textContent = String(n);
  renderWeek();
}

/* ============================ views ============================ */

/** Cabeçalho do quadro quando o recorte é "Atribuído a mim". */
function renderMineHeader(): void {
  const ranges: [State["mineRange"], string][] = [["hoje", "Hoje"], ["semana", "Esta semana"], ["tudo", "Tudo"]];
  const all = TASKS.filter(t => isMine(t));
  const open = all.filter(t => t.status !== "done");
  const late = open.filter(t => dayDiff(t.due) < 0);
  const done = all.length - open.length;
  const agora = all.filter(t => scheduledOn(t, weekdayOf(TODAY)));
  const legenda =
    state.mineRange === "hoje" ? "O que está na sua agenda de hoje, mais o que vence hoje e o que já passou do prazo."
    : state.mineRange === "semana" ? "Tudo em que você é responsável nesta semana, incluindo o que ficou atrasado."
    : "Todas as tarefas em que você aparece como responsável, em qualquer projeto.";

  $("#headLeft").innerHTML =
    `<h1 class="ptitle"><span class="dotm"></span>Atribuído a mim</h1>` +
    `<div class="dashsub" style="padding-left:22px">` +
    `${esc(PEOPLE[ME]!.name)} · ${DIA_LONGO[weekdayOf(TODAY)]}, ${fmtLong(isoOf(TODAY))}</div>`;

  $("#brief").innerHTML =
    `<div class="brief-h"><h2>${state.mineRange === "hoje" ? "Para fazer hoje"
      : state.mineRange === "semana" ? "Para fazer nesta semana" : "Tudo que é meu"}</h2>` +
    `<div class="rangeseg" style="margin-left:auto">` + ranges.map(([k, l]) =>
      `<button data-minerange="${k}"${state.mineRange === k ? ' aria-current="true"' : ""}>${l}</button>`).join("") +
    `</div></div>` +
    `<p>${legenda}</p>` +
    `<div class="brief-b"><div class="meta">` +
      `<i>${I.pen}<span>${plural(open.length, "tarefa aberta", "tarefas abertas")}</span></i>` +
      (agora.length ? `<i>${I.clock}<span>${agora.length} na agenda de hoje</span></i>` : "") +
      (late.length ? `<i style="color:var(--red)">${I.cal}<span>${late.length} atrasada${late.length > 1 ? "s" : ""}</span></i>` : "") +
    `</div></div>` +
    `<div class="bar"><span style="width:${all.length ? (done / all.length) * 100 : 0}%"></span></div>` +
    `<div class="barlab"><span>${done} de ${all.length} concluídas neste recorte</span>` +
    `<span>${all.length ? Math.round((done / all.length) * 100) : 0}%</span></div>`;

  const n = filterCount(), c = $("#filterCount");
  c.hidden = n === 0; c.textContent = String(n);
  renderWeek();
}

function cardHTML(t: Task, i: number): string {
  return `<article class="card${t.priority === "alta" ? " p-alta" : ""}" draggable="true" data-id="${t.id}" ` +
    `style="--i:${Math.min(i, 8)}" tabindex="0" role="button">` +
    `<div class="cbody">` +
      `<div class="crow">${tagChip(t.tag)}<span class="push"></span>${prioChip(t.priority)}</div>` +
      `<h3>${esc(t.title)}</h3>` +
      (state.mine ? `<span class="cproj">${esc(project(t.project).name)}</span>` : "") +
      (t.desc ? `<p>${esc(t.desc)}</p>` : "") +
    `</div>` +
    `<div class="cfoot">${avatarStack(t.who)}<span class="push"></span>` +
      `<span class="due${dueClass(t)}" title="Prazo: ${fmtLong(t.due)}">${I.cal}${fmtShort(t.due)}</span>` +
      (t.links ? `<span class="stat" title="${t.links} links">${I.link}${t.links}</span>` : "") +
      `<span class="stat" title="${t.comments} comentários">${I.chat}${t.comments}</span>` +
    `</div></article>`;
}

function emptyState(): string {
  return `<div class="empty" style="max-width:420px;margin:40px auto;padding:32px">` +
    `Nenhuma tarefa corresponde aos filtros nesta frente.</div>`;
}

function renderKanban(list: Task[]): string {
  return `<div class="board">` + STATUS.map((s, ci) => {
    const items = list.filter(t => t.status === s.id);
    const body = items.length
      ? items.map(cardHTML).join("")
      : `<div class="empty">Nada aqui. Arraste um cartão ou crie uma tarefa.</div>`;
    return `<section class="col" data-col="${s.id}" style="--cc:${s.color};--cf:${s.fill}">` +
      `<div class="col-h" style="--ci:${ci}"><b>${s.name}</b><span class="n">${items.length}</span></div>` +
      `<div class="col-body">${body}</div></section>`;
  }).join("") + `</div>`;
}

function renderList(list: Task[]): string {
  return `<div class="list">` + STATUS.map(s => {
    const items = list.filter(t => t.status === s.id);
    if (!items.length) return "";
    const rows = items.map((t, i) =>
      `<button class="lrow" data-id="${t.id}" style="--i:${Math.min(i, 10)}">` +
      `<span class="grip"></span><span class="t">${esc(t.title)}</span>` +
      `<span class="side-meta">${prioChip(t.priority)}${tagChip(t.tag)}` +
      `<span class="due${dueClass(t)} hide-s">${I.cal}${fmtShort(t.due)}</span>` +
      `<span class="stat hide-s">${I.chat}${t.comments}</span>${avatarStack(t.who)}</span></button>`).join("");
    return `<div class="lgroup" style="--cc:${s.color}"><h3><span class="pip"></span>${s.name}` +
      `<span class="n">${items.length}</span></h3><div class="lrows">${rows}</div></div>`;
  }).join("") + `</div>`;
}

function renderTable(list: Task[]): string {
  const rows = list.map(t => {
    const s = statusOf(t.status);
    return `<tr data-id="${t.id}"><td>${esc(t.title)}</td><td>${tagChip(t.tag)}</td>` +
      `<td>${prioChip(t.priority)}</td>` +
      `<td><span class="pill" style="--cc:${s.color}"><span class="pip"></span>${s.name}</span></td>` +
      `<td>${avatarStack(t.who)}</td>` +
      `<td class="num"><span class="due${dueClass(t)}">${fmtLong(t.due)}</span></td>` +
      `<td class="num">${t.links}</td><td class="num">${t.comments}</td></tr>`;
  }).join("");
  return `<div class="tablewrap"><table><thead><tr>` +
    `<th>Tarefa</th><th>Etiqueta</th><th>Prioridade</th><th>Status</th>` +
    `<th>Responsáveis</th><th>Prazo</th><th>Links</th><th>Comentários</th>` +
    `</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderView(): void {
  const view = $("#view");
  const list = visibleTasks();
  if (state.view === "kanban") { view.innerHTML = renderKanban(list); return; }
  if (!list.length) { view.innerHTML = emptyState(); return; }
  view.innerHTML = state.view === "lista" ? renderList(list) : renderTable(list);
}

function renderAll(): void {
  renderSidebar();
  renderScreen();
}

function setScreen(next: State["screen"]): void {
  state.screen = next;
  $("#screenBoard").hidden = next !== "board";
  $("#screenDash").hidden = next !== "dash";
  $("#screenCal").hidden = next !== "cal";
  document.querySelectorAll<HTMLElement>("[data-screen]").forEach(b =>
    b.setAttribute("aria-current", String(b.dataset["screen"] === next)));
  renderAll();
}

/* ============================ camadas ============================ */

const layer = $("#layer");

function closeLayer(): void {
  layer.innerHTML = "";
  document.removeEventListener("keydown", onEsc);
}
function onEsc(e: KeyboardEvent): void { if (e.key === "Escape") closeLayer(); }

function openLayer(html: string, onMount?: () => void): void {
  layer.innerHTML = html;
  document.addEventListener("keydown", onEsc);
  const scrim = layer.querySelector<HTMLElement>(".scrim");
  scrim?.addEventListener("mousedown", e => { if (e.target === scrim) closeLayer(); });
  onMount?.();
  layer.querySelector<HTMLElement>("[data-focus]")?.focus();
}

let toastTimer = 0;
function toast(msg: string): void {
  document.querySelector(".toast")?.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = msg;
  document.body.appendChild(el);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    el.classList.add("out");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }, 2500);
}

const LOG = [
  { who: "mc", what: "anexou o roteiro do teste", when: "há 2 h", text: "Roteiro com as duas ordenações e as perguntas de fechamento." },
  { who: "tn", what: "comentou", when: "ontem", text: "Consigo subir isso no build de quinta se o arquivo estiver fechado até quarta." },
  { who: "bs", what: "mudou o prazo", when: "há 3 dias", text: "Puxei dois dias por causa da apresentação para o cliente." },
];

/* ============================ detalhe da tarefa ============================ */

function openTask(id: string): void {
  const t = TASKS.find(x => x.id === id);
  if (!t) return;
  const p = project(t.project);
  const s = p.sections.find(x => x.id === t.section);
  const st = statusOf(t.status);
  const d = dayDiff(t.due);
  const prazo = t.status === "done" ? "entregue" : d < 0 ? `${-d} dia(s) em atraso` : d === 0 ? "vence hoje" : `faltam ${d} dia(s)`;

  openLayer(
    `<div class="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(t.title)}">` +
    `<div class="sheet-h"><div class="grow"><div class="crumb">${esc(p.name)} · ${esc(s?.name ?? "")}</div>` +
    `<h2>${esc(t.title)}</h2></div>` +
    `<button class="iconbtn" data-close="1" data-focus aria-label="Fechar">${I.x}</button></div>` +
    `<div class="sheet-b">` +
    `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${tagChip(t.tag)}${prioChip(t.priority)}` +
    `<span class="pill" style="--cc:${st.color}"><span class="pip"></span>${st.name}</span>` +
    (isLate(t) ? `<span class="pill" style="--cc:var(--red)"><span class="pip"></span>Atrasada</span>` : "") +
    `</div>` +
    `<p class="desc">${esc(t.desc || "Sem descrição.")}</p>` +
    `<div class="readout">` +
      `<div><span>Responsáveis</span><b>${t.who.length ? avatarStack(t.who, 5) : "—"}</b></div>` +
      `<div><span>Prazo</span><b>${fmtLong(t.due)}</b></div>` +
      `<div><span>Situação</span><b>${prazo}</b></div>` +
      `<div><span>Links</span><b>${t.links}</b></div>` +
      `<div><span>Comentários</span><b>${t.comments}</b></div>` +
    `</div>` +
    `<div class="two">` +
      `<div class="field"><label for="mvSel">Mover para</label><select id="mvSel">` +
        STATUS.map(x => `<option value="${x.id}"${x.id === t.status ? " selected" : ""}>${x.name}</option>`).join("") +
      `</select></div>` +
      `<div class="field"><label for="prSel">Prioridade</label><select id="prSel">` +
        (["alta","media","baixa"] as Priority[]).map(x =>
          `<option value="${x}"${x === t.priority ? " selected" : ""}>${PRIO_NAME[x]}</option>`).join("") +
      `</select></div>` +
    `</div>` +
    `<div class="log">` + LOG.map((l, i) =>
      `<div class="item" style="--i:${i}">${avatar(l.who)}<div class="bd"><b>${esc(PEOPLE[l.who]!.name)}</b> ` +
      `<span style="color:var(--tx3);font-size:12.5px">${l.what}</span><time>${l.when}</time>` +
      `<p>${esc(l.text)}</p></div></div>`).join("") + `</div>` +
    `<div class="acts"><button class="btn" data-edit="${t.id}">${I.pen} Editar</button>` +
    `<button class="btn danger" data-del="${t.id}">${I.trash} Excluir</button>` +
    `<span class="push"></span><button class="btn" data-close="1">Fechar</button></div>` +
    `</div></div></div>`,
    () => {
      $<HTMLSelectElement>("#mvSel").addEventListener("change", e => {
        t.status = (e.target as HTMLSelectElement).value as StatusId;
        popPost("task:status", { id: t.id, status: t.status });
        renderScreen();
        toast(`“${t.title}” → ${statusOf(t.status).name}`);
      });
      $<HTMLSelectElement>("#prSel").addEventListener("change", e => {
        t.priority = (e.target as HTMLSelectElement).value as Priority;
        popPost("task:priority", { id: t.id, priority: t.priority });
        renderScreen();
        toast(`Prioridade ${PRIO_NAME[t.priority].toLowerCase()}.`);
      });
    });
}

/* ============================ formulário de tarefa ============================ */

function openTaskForm(existing?: Task, presetStatus?: StatusId): void {
  const edit = !!existing;
  const d: Pick<Task, "title" | "desc" | "tag" | "status" | "due" | "who" | "links" | "priority"> = existing ?? {
    title: "", desc: "", tag: "UI Design", status: presetStatus ?? "todo",
    due: isoOf(addDays(TODAY, 7)), who: [], links: 0, priority: "media",
  };

  openLayer(
    `<div class="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-label="${edit ? "Editar tarefa" : "Nova tarefa"}">` +
    `<div class="sheet-h"><div class="grow"><div class="crumb">${esc(project().name)} · ${esc(section().name)}</div>` +
    `<h2>${edit ? "Editar tarefa" : "Nova tarefa"}</h2></div>` +
    `<button class="iconbtn" data-close="1" aria-label="Fechar">${I.x}</button></div>` +
    `<form class="sheet-b" id="taskForm">` +
    `<div class="field"><label for="fT">Título</label><input id="fT" type="text" data-focus required maxlength="90" ` +
      `value="${esc(d.title)}" placeholder="Ex.: Revisar o fluxo de assinatura"></div>` +
    `<div class="field"><label for="fD">Descrição</label><textarea id="fD" maxlength="400" ` +
      `placeholder="O que precisa acontecer e por quê.">${esc(d.desc)}</textarea></div>` +
    `<div class="three">` +
      `<div class="field"><label for="fG">Etiqueta</label><select id="fG">` +
        Object.keys(TAGS).map(k => `<option${k === d.tag ? " selected" : ""}>${k}</option>`).join("") + `</select></div>` +
      `<div class="field"><label for="fS">Status</label><select id="fS">` +
        STATUS.map(x => `<option value="${x.id}"${x.id === d.status ? " selected" : ""}>${x.name}</option>`).join("") + `</select></div>` +
      `<div class="field"><label for="fP">Prioridade</label><select id="fP">` +
        (["alta","media","baixa"] as Priority[]).map(x =>
          `<option value="${x}"${x === d.priority ? " selected" : ""}>${PRIO_NAME[x]}</option>`).join("") + `</select></div>` +
    `</div>` +
    `<div class="two">` +
      `<div class="field"><label for="fDue">Prazo</label><input id="fDue" type="date" value="${d.due}"></div>` +
      `<div class="field"><label for="fL">Links anexados</label><input id="fL" type="text" inputmode="numeric" value="${d.links}"></div>` +
    `</div>` +
    `<div class="field"><label>Responsáveis</label><div class="people" id="fW">` +
      Object.keys(PEOPLE).map(k =>
        `<button type="button" class="pbtn" data-p="${k}" aria-pressed="${d.who.includes(k)}">` +
        `${avatar(k)}${esc(PEOPLE[k]!.name)}</button>`).join("") +
    `</div></div>` +
    `<div class="acts">` +
      (edit ? `<button type="button" class="btn danger" data-del="${existing!.id}">${I.trash} Excluir</button>` : "") +
      `<span class="push"></span><button type="button" class="btn" data-close="1">Cancelar</button>` +
      `<button type="submit" class="btn solid">${edit ? "Salvar alterações" : "Criar tarefa"}</button>` +
    `</div></form></div></div>`,
    () => {
      $("#fW").addEventListener("click", e => {
        const b = (e.target as HTMLElement).closest<HTMLElement>(".pbtn");
        if (!b) return;
        b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true");
      });
      $<HTMLFormElement>("#taskForm").addEventListener("submit", e => {
        e.preventDefault();
        const title = $<HTMLInputElement>("#fT").value.trim();
        if (!title) { $<HTMLInputElement>("#fT").focus(); return; }
        const who = [...layer.querySelectorAll<HTMLElement>('.pbtn[aria-pressed="true"]')].map(b => b.dataset["p"]!);
        const links = Math.max(0, parseInt($<HTMLInputElement>("#fL").value, 10) || 0);
        const patch = {
          title,
          desc: $<HTMLTextAreaElement>("#fD").value.trim(),
          tag: $<HTMLSelectElement>("#fG").value,
          status: $<HTMLSelectElement>("#fS").value as StatusId,
          priority: $<HTMLSelectElement>("#fP").value as Priority,
          due: $<HTMLInputElement>("#fDue").value || d.due,
          links, who,
        };
        if (existing) {
          Object.assign(existing, patch);
          popPost("task:update", { id: existing.id, task: patch });
          toast("Tarefa atualizada.");
        } else {
          const temporaryId = "pending-" + ++seq;
          TASKS.push({ id: temporaryId, project: state.project, section: state.section, comments: 0, ...patch });
          popPost("task:create", {
            temporaryId, projectId: state.project, sectionId: state.section, task: patch,
          });
          toast(`Tarefa criada em ${statusOf(patch.status).name}.`);
        }
        closeLayer(); renderScreen();
      });
    });
}

function deleteTask(id: string): void {
  const i = TASKS.findIndex(t => t.id === id);
  if (i < 0) return;
  const name = TASKS[i]!.title;
  TASKS.splice(i, 1);
  popPost("task:delete", { id });
  closeLayer(); renderScreen();
  toast(`“${name}” foi excluída.`);
}

/* ============================ frente e projeto ============================ */

function openSectionForm(): void {
  const s = section();
  openLayer(
    `<div class="scrim"><div class="sheet" role="dialog" aria-modal="true" aria-label="Editar frente">` +
    `<div class="sheet-h"><div class="grow"><div class="crumb">${esc(project().name)}</div><h2>Editar frente</h2></div>` +
    `<button class="iconbtn" data-close="1" aria-label="Fechar">${I.x}</button></div>` +
    `<form class="sheet-b" id="secForm">` +
    `<div class="field"><label for="sN">Nome</label><input id="sN" type="text" data-focus maxlength="60" value="${esc(s.name)}"></div>` +
    `<div class="field"><label for="sD">Descrição</label><textarea id="sD" maxlength="320">${esc(s.desc)}</textarea></div>` +
    `<div class="two">` +
      `<div class="field"><label for="sH">Horas apontadas</label><input id="sH" type="text" value="${esc(s.hours)}"></div>` +
      `<div class="field"><label for="sR">Período</label><input id="sR" type="text" value="${esc(s.from + " — " + s.to)}"></div>` +
    `</div>` +
    `<div class="acts"><span class="push"></span><button type="button" class="btn" data-close="1">Cancelar</button>` +
    `<button type="submit" class="btn solid">Salvar</button></div></form></div></div>`,
    () => {
      $<HTMLFormElement>("#secForm").addEventListener("submit", e => {
        e.preventDefault();
        s.name = $<HTMLInputElement>("#sN").value.trim() || s.name;
        s.desc = $<HTMLTextAreaElement>("#sD").value.trim();
        s.hours = $<HTMLInputElement>("#sH").value.trim() || s.hours;
        const parts = $<HTMLInputElement>("#sR").value.split(/[—–]/);
        if (parts.length > 1) { s.from = parts[0]!.trim(); s.to = parts.slice(1).join("–").trim(); }
        closeLayer(); renderAll(); toast("Frente atualizada.");
      });
    });
}

function openProjectForm(): void {
  openLayer(
    `<div class="scrim"><div class="sheet" style="width:min(480px,100%)" role="dialog" aria-modal="true" aria-label="Novo projeto">` +
    `<div class="sheet-h"><div class="grow"><div class="crumb">Estúdio Órbita</div><h2>Novo projeto</h2></div>` +
    `<button class="iconbtn" data-close="1" aria-label="Fechar">${I.x}</button></div>` +
    `<form class="sheet-b" id="projForm">` +
    `<div class="field"><label for="pN">Nome do projeto</label><input id="pN" type="text" data-focus required maxlength="48" ` +
      `placeholder="Ex.: Padaria Aurora — identidade"></div>` +
    `<div class="two">` +
      `<div class="field"><label for="pC">Grupo</label><select id="pC">` +
        `<option value="clientes">Todos os projetos</option><option value="estudio">Coisas do estúdio</option></select></div>` +
      `<div class="field"><label for="pS">Primeira frente</label><input id="pS" type="text" maxlength="40" value="Visão geral"></div>` +
    `</div>` +
    `<div class="acts"><span class="push"></span><button type="button" class="btn" data-close="1">Cancelar</button>` +
    `<button type="submit" class="btn solid">Criar projeto</button></div></form></div></div>`,
    () => {
      $<HTMLFormElement>("#projForm").addEventListener("submit", e => {
        e.preventDefault();
        const name = $<HTMLInputElement>("#pN").value.trim();
        if (!name) { $<HTMLInputElement>("#pN").focus(); return; }
        const id = "p" + ++seq;
        const sid = "s" + ++seq;
        PROJECTS.push({
          id, name, favorite: false, group: $<HTMLSelectElement>("#pC").value as GroupId,
          hue: (seq * 47) % 360,
          sections: [{
            id: sid, name: $<HTMLInputElement>("#pS").value.trim() || "Visão geral",
            desc: "Frente recém-criada. Descreva aqui o escopo e os pontos de decisão.",
            hours: "0d, 0h, 00min", from: "01.09.2026", to: "31.12.2026",
          }],
        });
        state.project = id; state.section = sid;
        closeLayer(); renderAll(); toast(`Projeto “${name}” criado.`);
      });
    });
}

function openWorkspaceSwitcher(): void {
  if (!popBridgeActive || !POP_WORKSPACES.length) return;
  const anchor = $(".topright .me").getBoundingClientRect();
  const left = Math.max(12, Math.min(anchor.right - 280, window.innerWidth - 292));
  openLayer(
    `<div class="scrim" style="background:transparent;backdrop-filter:none;display:block">` +
    `<div class="pop" style="top:${anchor.bottom + 9}px;left:${left}px;width:280px" ` +
    `role="dialog" aria-label="Trocar empresa"><h4>Trocar empresa</h4>` +
    POP_WORKSPACES.map(workspace =>
      `<button class="menu" data-workspace="${esc(workspace.id)}"` +
      (workspace.id === POP_COMPANY_ID ? ' aria-current="true"' : "") + `>` +
      `<b style="display:block;color:var(--tx)">${esc(workspace.name)}</b>` +
      `<span style="display:block;margin-top:2px;font-size:11px;color:var(--tx3)">` +
      `${workspace.kind === "personal" ? "Espaço pessoal" : esc(workspace.role)}` +
      (workspace.id === POP_COMPANY_ID ? " · Atual" : "") + `</span></button>`
    ).join("") + `</div></div>`,
  );
}

/* ============================ popovers ============================ */

function openFilters(anchor?: HTMLElement): void {
  const b = (anchor ?? $("#filterBtn")).getBoundingClientRect();
  const left = Math.min(b.left, window.innerWidth - 288);
  openLayer(
    `<div class="scrim" style="background:transparent;backdrop-filter:none;display:block">` +
    `<div class="pop" style="top:${b.bottom + 8}px;left:${left}px" role="dialog" aria-label="Filtros">` +
    `<h4>Prioridade</h4><div class="chips">` +
      (["alta","media","baixa"] as Priority[]).map(k =>
        `<button class="chip" data-prio="${k}" aria-pressed="${state.priorities.has(k)}">${PRIO_NAME[k]}</button>`).join("") +
    `</div><h4>Etiquetas</h4><div class="chips">` +
      Object.keys(TAGS).map(k =>
        `<button class="chip" data-tag="${esc(k)}" aria-pressed="${state.tags.has(k)}">${esc(k)}</button>`).join("") +
    `</div><h4>Pessoas</h4><div class="chips">` +
      Object.keys(PEOPLE).map(k =>
        `<button class="chip" data-who="${k}" aria-pressed="${state.who.has(k)}">${esc(PEOPLE[k]!.name)}</button>`).join("") +
    `</div><button class="clear" data-clear="1">Limpar filtros</button></div></div>`,
    () => {
      $(".pop", layer).addEventListener("click", e => {
        const el = e.target as HTMLElement;
        const tag = el.closest<HTMLElement>("[data-tag]");
        const who = el.closest<HTMLElement>("[data-who]");
        const prio = el.closest<HTMLElement>("[data-prio]");
        if (tag) { toggle(state.tags, tag.dataset["tag"]!); tag.setAttribute("aria-pressed", String(state.tags.has(tag.dataset["tag"]!))); }
        else if (who) { toggle(state.who, who.dataset["who"]!); who.setAttribute("aria-pressed", String(state.who.has(who.dataset["who"]!))); }
        else if (prio) { const v = prio.dataset["prio"] as Priority; toggle(state.priorities, v); prio.setAttribute("aria-pressed", String(state.priorities.has(v))); }
        else if (el.closest("[data-clear]")) {
          state.tags.clear(); state.who.clear(); state.priorities.clear();
          state.query = ""; state.weekOn = false;
          $<HTMLInputElement>("#q").value = "";
          closeLayer();
        } else return;
        renderScreen();
      });
    });
}

function toggle<T>(set: Set<T>, v: T): void { set.has(v) ? set.delete(v) : set.add(v); }

function openMore(anchor: HTMLElement): void {
  const b = anchor.getBoundingClientRect();
  const left = Math.min(b.right - 210, window.innerWidth - 222);
  openLayer(
    `<div class="scrim" style="background:transparent;backdrop-filter:none;display:block">` +
    `<div class="pop" style="top:${b.bottom + 8}px;left:${left}px;width:210px;padding:7px" role="menu">` +
    `<button class="menu" data-edit-section="1">Editar frente</button>` +
    `<button class="menu" data-new="1">Nova tarefa</button>` +
    `<button class="menu" data-copy-section="1">Copiar link da frente</button>` +
    `</div></div>`);
}

/* ============================ arrastar e soltar ============================ */

let dragId: string | null = null;

document.addEventListener("dragstart", e => {
  const card = (e.target as HTMLElement).closest<HTMLElement>(".card");
  if (!card) return;
  dragId = card.dataset["id"]!;
  card.classList.add("dragging");
  const dt = (e as DragEvent).dataTransfer;
  if (dt) { dt.effectAllowed = "move"; try { dt.setData("text/plain", dragId); } catch { /* ignora */ } }
});

document.addEventListener("dragend", e => {
  (e.target as HTMLElement).closest<HTMLElement>(".card")?.classList.remove("dragging");
  document.querySelectorAll(".col.over").forEach(c => c.classList.remove("over"));
  dragId = null;
});

document.addEventListener("dragover", e => {
  const col = (e.target as HTMLElement).closest<HTMLElement>(".col");
  if (!col || !dragId) return;
  e.preventDefault();
  const dt = (e as DragEvent).dataTransfer;
  if (dt) dt.dropEffect = "move";
  document.querySelectorAll(".col.over").forEach(c => { if (c !== col) c.classList.remove("over"); });
  col.classList.add("over");
});

document.addEventListener("dragleave", e => {
  const col = (e.target as HTMLElement).closest<HTMLElement>(".col");
  if (col && !col.contains((e as DragEvent).relatedTarget as Node)) col.classList.remove("over");
});

document.addEventListener("drop", e => {
  const col = (e.target as HTMLElement).closest<HTMLElement>(".col");
  if (!col || !dragId) return;
  e.preventDefault();
  const status = col.dataset["col"] as StatusId;
  const t = TASKS.find(x => x.id === dragId);
  if (!t) return;
  const before = (e.target as HTMLElement).closest<HTMLElement>(".card");
  const moved = t.id;
  TASKS = TASKS.filter(x => x.id !== t.id);
  t.status = status;
  popPost("task:status", { id: t.id, status });
  if (before && before.dataset["id"] !== t.id) {
    const i = TASKS.findIndex(x => x.id === before.dataset["id"]);
    TASKS.splice(i < 0 ? TASKS.length : i, 0, t);
  } else TASKS.push(t);
  col.classList.remove("over");
  dragId = null;
  renderScreen();
  requestAnimationFrame(() =>
    document.querySelector<HTMLElement>(`.card[data-id="${moved}"]`)?.classList.add("flash"));
  toast(`“${t.title}” → ${statusOf(status).name}`);
});

/* ============================ eventos ============================ */

document.addEventListener("click", e => {
  const target = e.target as HTMLElement;
  const at = (sel: string) => target.closest<HTMLElement>(sel);

  if (at("[data-close]")) { closeLayer(); return; }

  if (at(".railbtn.out")) { popPost("logout"); return; }
  if (at(".topright .me")) { openWorkspaceSwitcher(); return; }

  const workspace = at("[data-workspace]");
  if (workspace) {
    const companyId = workspace.dataset["workspace"]!;
    if (companyId !== POP_COMPANY_ID) {
      popPost("workspace:switch", { companyId });
      toast("Trocando de empresa…");
    }
    closeLayer();
    return;
  }

  const del = at("[data-del]");
  if (del) { deleteTask(del.dataset["del"]!); return; }

  const edit = at("[data-edit]");
  if (edit) { const t = TASKS.find(x => x.id === edit.dataset["edit"]); closeLayer(); if (t) openTaskForm(t); return; }

  const fav = at("[data-fav]");
  if (fav) {
    e.stopPropagation();
    const p = project(fav.dataset["fav"]!);
    p.favorite = !p.favorite;
    renderSidebar(); renderHeader();
    toast(p.favorite ? "Adicionado aos favoritos." : "Removido dos favoritos.");
    return;
  }

  if (at("[data-mine]")) { state.mine = true; setScreen("board"); return; }

  const mr = at("[data-minerange]");
  if (mr) { state.mineRange = mr.dataset["minerange"] as State["mineRange"]; renderAll(); return; }

  const group = at("[data-group]");
  if (group) { const k = group.dataset["group"]!; state.open[k] = !state.open[k]; renderSidebar(); return; }

  const proj = at("[data-project]");
  if (proj) { const p = project(proj.dataset["project"]!); state.mine = false; state.project = p.id; state.section = p.sections[0]!.id; setScreen("board"); return; }

  const sec = at("[data-section]");
  if (sec) { state.mine = false; state.section = sec.dataset["section"]!; setScreen("board"); return; }

  if (at("[data-new]")) { closeLayer(); openTaskForm(); return; }
  const add = at("[data-add]");
  if (add) { openTaskForm(undefined, add.dataset["add"] as StatusId); return; }
  if (at("#newBtn")) { openTaskForm(); return; }
  if (at("#newProjBtn")) {
    if (popBridgeActive) popPost("navigate", { to: "/setores" });
    else openProjectForm();
    return;
  }
  if (at("[data-edit-section]")) { closeLayer(); openSectionForm(); return; }

  const more = at("[data-more]");
  if (more) { openMore(more); return; }
  if (at("[data-copy-section]")) { closeLayer(); toast(`Link copiado: orbita.studio/p/${state.project}/${state.section}`); return; }
  if (at("[data-focus-search]")) { $("#side").classList.remove("collapsed"); $<HTMLInputElement>("#q").focus(); return; }
  if (at("[data-invite]")) { toast("Convite enviado para o time do projeto."); return; }
  if (at("#bellBtn")) { toast("10 novidades: 6 comentários, 3 revisões, 1 prazo hoje."); return; }

  if (at("#linkBtn")) {
    const url = `orbita.studio/p/${state.project}/${state.section}`;
    navigator.clipboard?.writeText(url).catch(() => { /* sem permissão: só avisa */ });
    toast("Link copiado: " + url);
    return;
  }

  const seg = at("#viewSeg button");
  if (seg) {
    state.view = seg.dataset["view"] as State["view"];
    [...$("#viewSeg").children].forEach(b => b.setAttribute("aria-current", String(b === seg)));
    renderView();
    return;
  }

  const row = at(".card") ?? at(".lrow") ?? at("tbody tr");
  if (row?.dataset["id"]) openTask(row.dataset["id"]!);
});

document.addEventListener("keydown", e => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const el = document.activeElement as HTMLElement | null;
  if (el?.classList.contains("card")) { e.preventDefault(); openTask(el.dataset["id"]!); }
});

$<HTMLInputElement>("#q").addEventListener("input", e => {
  state.query = (e.target as HTMLInputElement).value.trim();
  renderScreen();
});

$("#collapseBtn").addEventListener("click", () => $("#side").classList.toggle("collapsed"));

$("#themePill").addEventListener("click", e => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-theme-set]");
  if (!b) return;
  document.documentElement.setAttribute("data-theme", b.dataset["themeSet"]!);
  [...$("#themePill").children].forEach(x => x.setAttribute("aria-current", String(x === b)));
});

$("#mic").addEventListener("click", e => {
  const b = e.currentTarget as HTMLElement;
  const on = b.classList.toggle("rec");
  b.title = on ? "Parar gravação" : "Gravar nota de voz";
  toast(on ? "Gravando nota de voz…" : "Nota de voz anexada à frente.");
});

document.querySelectorAll<HTMLElement>("[data-wk]").forEach(b =>
  b.addEventListener("click", () => {
    const d = new Date(state.week.getTime());
    d.setDate(d.getDate() + 7 * Number(b.dataset["wk"]));
    state.week = d;
    renderScreen();
  }));

$("#weekLab").addEventListener("click", () => {
  state.weekOn = !state.weekOn;
  renderScreen();
  toast(state.weekOn ? "Mostrando só o que vence nesta semana." : "Filtro de semana desligado.");
});

$("#filterBtn").addEventListener("click", () => { layer.innerHTML ? closeLayer() : openFilters(); });

/* ============================ painel ============================ */

/** Uma fatia de gráfico: rótulo, valor e a cor do traço. */
interface Slice { label: string; value: number; color: string }

const openTasks = (): Task[] => TASKS.filter(t => t.status !== "done");
const pct = (v: number, total: number): number => (total ? (v / total) * 100 : 0);
const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** Distribuição por status, na ordem do fluxo. */
function byStatus(): Slice[] {
  return STATUS.map(s => ({ label: s.name, value: TASKS.filter(t => t.status === s.id).length, color: s.color }));
}

/** Tarefas em aberto por prazo, em faixas semanais a partir de hoje. */
function byDeadline(): Slice[] {
  const buckets: Slice[] = [
    { label: "Atrasado", value: 0, color: "var(--red)" },
    { label: "Esta semana", value: 0, color: "var(--acc-2)" },
    { label: "Próxima", value: 0, color: "var(--acc-2)" },
    { label: "Em 3 sem.", value: 0, color: "var(--acc-2)" },
    { label: "Em 4 sem.", value: 0, color: "var(--acc-2)" },
    { label: "Depois", value: 0, color: "var(--acc-2)" },
  ];
  for (const t of openTasks()) {
    const d = dayDiff(t.due);
    const i = d < 0 ? 0 : d <= 6 ? 1 : d <= 13 ? 2 : d <= 20 ? 3 : d <= 27 ? 4 : 5;
    buckets[i]!.value++;
  }
  return buckets;
}

/** Tarefas em aberto por responsável, da maior carga para a menor. */
function byPerson(): Slice[] {
  const counts = new Map<string, number>();
  for (const t of openTasks()) for (const k of t.who) counts.set(k, (counts.get(k) ?? 0) + 1);
  return [...counts.entries()]
    .map(([k, value]) => ({ label: PEOPLE[k]?.name ?? k, value, color: "var(--acc-2)" }))
    .sort((a, b) => b.value - a.value);
}

/** Percentual concluído por projeto. */
function byProject(): { name: string; done: number; total: number }[] {
  return PROJECTS.map(p => {
    const all = TASKS.filter(t => t.project === p.id);
    return { name: p.name, done: all.filter(t => t.status === "done").length, total: all.length };
  }).filter(x => x.total > 0).sort((a, b) => pct(b.done, b.total) - pct(a.done, a.total));
}

/* -------- peças de gráfico (HTML puro, sem biblioteca) -------- */

function legend(slices: Slice[]): string {
  return `<div class="leg">` + slices.map(s =>
    `<span><i style="background:${s.color}"></i>${esc(s.label)} <b style="color:var(--tx)">${s.value}</b></span>`).join("") + `</div>`;
}

/** Barra empilhada horizontal: parte-todo. Legenda sempre presente. */
function stackedBar(slices: Slice[], total: number): string {
  return `<div class="sbar">` + slices.filter(s => s.value > 0).map(s =>
    `<i style="width:${pct(s.value, total)}%;background:${s.color}" ` +
    `data-tip="${esc(s.label)}: ${s.value} de ${total} (${Math.round(pct(s.value, total))}%)"></i>`).join("") +
    `</div>` + legend(slices);
}

/** Colunas: uma série, altura em px para o rótulo nunca estourar a área. */
function columns(slices: Slice[]): string {
  const max = Math.max(1, ...slices.map(s => s.value));
  const body = slices.map(s =>
    `<div class="colw" data-tip="${esc(s.label)}: ${plural(s.value, "tarefa", "tarefas")}">` +
    `<span class="colv">${s.value}</span>` +
    `<div class="colb" style="height:${Math.max(3, Math.round((s.value / max) * 112))}px;background:${s.color}"></div>` +
    `<span class="coll">${esc(s.label)}</span></div>`).join("");
  return `<div class="cols">${body}</div><div class="colrule"></div>`;
}

/** Barras horizontais com trilho: magnitude, uma cor só. */
function hBars(rows: { name: string; value: number; label?: string; color?: string; max?: number }[]): string {
  const max = Math.max(1, ...rows.map(r => r.max ?? r.value));
  return `<div class="hbars">` + rows.map(r =>
    `<div class="hrow" data-tip="${esc(r.name)}: ${esc(r.label ?? String(r.value))}">` +
    `<span class="nm">${esc(r.name)}</span>` +
    `<span class="htrack"><span class="hfill" style="width:${r.value === 0 ? 0 : Math.max(2, pct(r.value, max))}%;` +
    `background:${r.color ?? "var(--acc-2)"}"></span></span>` +
    `<span class="val">${esc(r.label ?? String(r.value))}</span></div>`).join("") + `</div>`;
}

/** Mesma informação em tabela — alternativa acessível a qualquer gráfico. */
function dataTable(head: [string, string], rows: [string, string][]): string {
  return `<div class="tablewrap" style="border:0;background:none"><table class="dtable"><thead><tr>` +
    `<th>${esc(head[0])}</th><th style="text-align:right">${esc(head[1])}</th></tr></thead><tbody>` +
    rows.map(([a, b]) => `<tr><td>${esc(a)}</td><td class="num" style="text-align:right">${esc(b)}</td></tr>`).join("") +
    `</tbody></table></div>`;
}

/** Cartão do painel, com alternância gráfico ⇄ tabela quando `key` é passada. */
function dcard(opts: {
  span: string; i: number; title: string; sub?: string; key?: string;
  chart: string; table?: string;
}): string {
  const asTable = !!opts.key && state.dashTables.has(opts.key);
  const toggle = opts.key
    ? `<button class="tbtn" data-dtable="${opts.key}" aria-pressed="${asTable}">${asTable ? "Gráfico" : "Tabela"}</button>`
    : "";
  return `<section class="dcard ${opts.span}" style="--i:${opts.i}">` +
    `<div class="dhead"><h3>${esc(opts.title)}</h3>` +
    (opts.sub ? `<span class="sub">${esc(opts.sub)}</span>` : "") + toggle + `</div>` +
    (asTable && opts.table ? opts.table : opts.chart) + `</section>`;
}


/* ============================ agenda fictícia ============================ */

interface Meeting {
  id: string;
  /** Data em ISO (AAAA-MM-DD). */
  date: string;
  hour: number; end: number;
  title: string; desc: string;
  kind: "chamada" | "video" | "onboarding" | "revisao" | "daily";
  who: string[];
}
interface Reminder { date: string; hour: number; text: string }
/** Um bloco na linha do tempo: uma tarefa agendada ou um intervalo. */
interface Block { day: number; start: number; end: number; task?: string; brk?: boolean }

const D = ["2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04",
           "2026-09-07", "2026-09-08", "2026-09-09"] as const;

const MEETINGS: Meeting[] = [
  { id: "m01", date: D[0], hour: 9.5, end: 10,    title: "Daily do estúdio",          desc: "Quinze minutos de status por frente.",                 kind: "daily",      who: ["ar", "mc", "lf", "tn"] },
  { id: "m02", date: D[0], hour: 11,  end: 12,    title: "Kickoff do Corvo Café",     desc: "Alinhar escopo e calendário do rebrand com o cliente.", kind: "video",      who: ["ar", "bs", "cv"] },
  { id: "m03", date: D[1], hour: 9.5, end: 10,    title: "Daily do estúdio",          desc: "Quinze minutos de status por frente.",                 kind: "daily",      who: ["ar", "mc", "lf", "tn"] },
  { id: "m04", date: D[1], hour: 10,  end: 11,    title: "Apresentação do Nébula",    desc: "Apresentar o projeto e colher feedback do cliente.",   kind: "chamada",    who: ["ar", "mc", "cv"] },
  { id: "m05", date: D[1], hour: 13,  end: 13.75, title: "Reunião com o time de UX",  desc: "Fechar o roteiro da segunda rodada de testes.",        kind: "video",      who: ["mc", "bs", "jp"] },
  { id: "m06", date: D[1], hour: 15,  end: 16,    title: "Onboarding do projeto",     desc: "Passar contexto e acessos para quem entrou agora.",    kind: "onboarding", who: ["ar", "tn"] },
  { id: "m07", date: D[1], hour: 16,  end: 17,    title: "Revisão dos anúncios",      desc: "Ver as seis peças antes de mandar para o cliente.",    kind: "revisao",    who: ["cv", "rg"] },
  { id: "m08", date: D[2], hour: 9.5, end: 10,    title: "Daily do estúdio",          desc: "Quinze minutos de status por frente.",                 kind: "daily",      who: ["ar", "mc", "lf", "tn"] },
  { id: "m09", date: D[2], hour: 14,  end: 16,    title: "Teste com usuários",        desc: "Oito sessões de 15 minutos com o protótipo.",          kind: "video",      who: ["mc", "bs", "jp"] },
  { id: "m10", date: D[3], hour: 9.5, end: 10,    title: "Daily do estúdio",          desc: "Quinze minutos de status por frente.",                 kind: "daily",      who: ["ar", "mc", "lf", "tn"] },
  { id: "m11", date: D[3], hour: 11,  end: 12,    title: "Alinhamento com o cliente", desc: "Status das quatro frentes e o que trava o cronograma.", kind: "chamada",   who: ["ar", "cv"] },
  { id: "m12", date: D[3], hour: 17,  end: 18,    title: "Retrospectiva da quinzena", desc: "O que funcionou, o que atrasou e o que muda.",         kind: "revisao",    who: ["ar", "mc", "lf", "tn", "bs"] },
  { id: "m13", date: D[4], hour: 9.5, end: 10,    title: "Daily do estúdio",          desc: "Quinze minutos de status por frente.",                 kind: "daily",      who: ["ar", "mc", "lf", "tn"] },
  { id: "m14", date: D[4], hour: 10,  end: 11.5,  title: "Handoff para engenharia",   desc: "Entregar tokens, specs e a biblioteca de componentes.", kind: "onboarding", who: ["tn", "lf", "ar"] },
  { id: "m15", date: D[5], hour: 10,  end: 11,    title: "Planejamento da semana",    desc: "Fechar o que entra e o que sai da semana.",            kind: "video",      who: ["ar", "mc", "tn"] },
  { id: "m16", date: D[6], hour: 14,  end: 15,    title: "Revisão do manual de marca", desc: "Primeira leitura do capítulo de voz e tom.",          kind: "revisao",    who: ["ar", "bs"] },
];

const REMINDERS: Reminder[] = [
  { date: D[0], hour: 9,     text: "Enviar a agenda da semana para o time" },
  { date: D[1], hour: 9.5,   text: "Conferir os resultados do teste de fila" },
  { date: D[1], hour: 10,    text: "Apresentação para o cliente" },
  { date: D[1], hour: 16.25, text: "Quebrar “Tokens do tema escuro” em subtarefas" },
  { date: D[3], hour: 15,    text: "Fechar as horas do mês" },
  { date: D[4], hour: 17,    text: "Publicar o shot do Corvo no Dribbble" },
];

/** Percentual do dia apontado, de segunda a sexta desta semana. */
const ACTIVITY: { day: string; value: number }[] = [
  { day: "seg", value: 92 }, { day: "ter", value: 41 }, { day: "qua", value: 0 },
  { day: "qui", value: 0 },  { day: "sex", value: 0 },
];

/** Horas trabalhadas por projeto nesta semana. */
const WORKED: { project: string; hours: number }[] = [
  { project: "nebula", hours: 12.5 }, { project: "corvo", hours: 6 },
  { project: "tempero", hours: 4 },   { project: "vitalis", hours: 2 },
];

const SCHEDULE: Block[] = [
  { day: 0, start: 9,    end: 10.5, task: "Grid e espaçamentos do feed" },
  { day: 0, start: 11,   end: 12.5, task: "Entrevistas com 12 assinantes" },
  { day: 0, start: 13,   end: 14,   brk: true },
  { day: 1, start: 9,    end: 11.5, task: "Refazer os títulos dos cards do feed" },
  { day: 1, start: 11.5, end: 12.75, task: "Player em tela cheia — estados de erro" },
  { day: 1, start: 13,   end: 14,   brk: true },
  { day: 1, start: 14,   end: 16.5, task: "Ordenação da fila [2ª rodada]" },
  { day: 1, start: 16.75, end: 18,  task: "Logotipo — terceira rodada" },
  { day: 2, start: 9.5,  end: 11,   task: "Microcopy dos estados vazios" },
  { day: 2, start: 11.5, end: 13,   task: "Animação 3D do mascote" },
  { day: 2, start: 13,   end: 14,   brk: true },
  { day: 3, start: 9,    end: 11.5, task: "Player em tela cheia — estados de erro" },
  { day: 3, start: 13,   end: 14,   brk: true },
  { day: 3, start: 14,   end: 16,   task: "Anúncios em vídeo para TikTok, Reels e Stories" },
  { day: 4, start: 9,    end: 12,   task: "Tokens do tema escuro" },
  { day: 4, start: 13,   end: 14,   brk: true },
  { day: 4, start: 15,   end: 17,   task: "Checklist de acessibilidade do onboarding" },
];

/** Relógio fixo da demonstração: 10h28 de terça, 1 set 2026. */
const NOW_H = 10 + 28 / 60;
const DIA_CURTO = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const DIA_LONGO = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];

const findTask = (title: string): Task | undefined => TASKS.find(t => t.title === title);
const hhmm = (h: number): string =>
  `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
const clock = (secs: number): string =>
  [Math.floor(secs / 3600), Math.floor(secs / 60) % 60, secs % 60].map(n => String(n).padStart(2, "0")).join(":");
const sameDay = (a: Date, b: Date): boolean => a.toDateString() === b.toDateString();
function addDays(d: Date, n: number): Date { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }

const KIND_ICON: Record<Meeting["kind"], string> = {
  chamada: I.mic2, video: I.video, onboarding: I.users, revisao: I.pen, daily: I.chat,
};
const KIND_NAME: Record<Meeting["kind"], string> = {
  chamada: "Chamada de voz", video: "Videochamada", onboarding: "Onboarding",
  revisao: "Revisão", daily: "Chamada rápida",
};

/** Índice do dia da semana (0 = segunda) para uma data. */
const weekdayOf = (d: Date): number => (d.getDay() + 6) % 7;
/** Data em ISO (AAAA-MM-DD). */
const isoOf = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Semana corrente da demonstração, usada para saber se o dia tem plano de trabalho. */
const THIS_WEEK = weekStart(TODAY);

/* ============================ painel: peças ============================ */

function timerCard(): string {
  const t = state.running ? TASKS.find(x => x.id === state.running) : undefined;
  const focus = t ?? findTask("Refazer os títulos dos cards do feed")!;
  const limit = 6 * 3600;
  return `<section class="dcard timer" style="--i:0">` +
    `<div><div class="tt">${esc(focus.title)}</div><div class="tp" style="margin-top:4px">${esc(project(focus.project).name)}</div></div>` +
    `<button class="tbig${state.running ? " on" : ""}" id="bigTimer" data-task="${focus.id}" ` +
      `style="--p:${Math.min(100, (state.elapsed / limit) * 100)}" ` +
      `title="${state.running ? "Pausar apontamento" : "Iniciar apontamento"}" ` +
      `aria-label="${state.running ? "Pausar apontamento" : "Iniciar apontamento"}">` +
      `<span class="ring"></span>${state.running ? I.pause : I.play}</button>` +
    `<div class="tboxes">` +
      `<div class="tbox"><span>Hoje</span><b id="timerNow">${clock(state.elapsed)}</b></div>` +
      `<div class="tbox"><span>Limite</span><b>06:00:00</b></div>` +
    `</div></section>`;
}

function todayTasksCard(): string {
  const list = openTasks()
    .filter(t => dayDiff(t.due) <= 7)
    .sort((a, b) => dayDiff(a.due) - dayDiff(b.due))
    .slice(0, 3);
  return `<section class="dcard" style="--i:1">` +
    `<div class="dhead"><h3>Tarefas de hoje</h3><span class="chip-n">${list.length}</span>` +
    `<button class="dlink" data-screen="board">Gerenciar ${I.right}</button></div>` +
    `<div class="tlist">` + list.map(t => {
      const live = state.running === t.id;
      return `<div class="trow${live ? " live" : ""}">` +
        `<button class="pbtn2" data-task="${t.id}" title="${live ? "Pausar" : "Iniciar"}" ` +
        `aria-label="${live ? "Pausar apontamento" : "Iniciar apontamento"}">${live ? I.pause : I.play}</button>` +
        `<span class="bd" data-open="${t.id}" role="button" tabindex="0"><b>${esc(t.title)}</b>` +
        `<span>${esc(project(t.project).name)}</span></span>` +
        `<button class="st${project(t.project).favorite ? " on" : ""}" data-fav="${t.project}" ` +
        `aria-label="Favoritar projeto">${project(t.project).favorite ? I.starOn : I.star}</button></div>`;
    }).join("") + `</div></section>`;
}

function meetingsCard(): string {
  const today = MEETINGS.filter(m => m.date === isoOf(TODAY));
  const list = today.filter(m => m.hour >= 10).slice(0, 3);
  return `<section class="dcard" style="--i:2">` +
    `<div class="dhead"><h3>Reuniões de hoje</h3><span class="chip-n">${today.length}</span>` +
    `<button class="dlink" data-screen="cal">Ver todas ${I.right}</button></div>` +
    `<div class="mgrid">` + list.map(m => {
      const pm = m.hour >= 12;
      const h = Math.floor(pm && m.hour >= 13 ? m.hour - 12 : m.hour);
      return `<button class="mtile" data-meeting="${m.id}">` +
        `<div class="top"><span class="ap">${pm ? "PM" : "AM"}</span>` +
        `<span class="hh">${String(h).padStart(2, "0")}:${String(Math.round((m.hour % 1) * 60)).padStart(2, "0")}</span>` +
        `<span class="ic" title="${KIND_NAME[m.kind]}">${KIND_ICON[m.kind]}</span></div>` +
        `<p>${esc(m.desc)}</p></button>`;
    }).join("") +
    `<button class="mtile add" data-newmeeting="1"><span class="plus">${I.plus}</span>Agendar reunião</button>` +
    `</div></section>`;
}

function activityCard(): string {
  const done = ACTIVITY.filter(a => a.value > 0);
  const media = Math.round(done.reduce((s, a) => s + a.value, 0) / Math.max(1, done.length));
  const todayIdx = 1;
  return `<section class="dcard" style="--i:3">` +
    `<div class="dhead"><h3>Atividade</h3><span class="trend up">+12%</span>` +
    `<span class="sub" style="margin-left:auto">média da semana</span></div>` +
    `<div class="hero" style="margin-top:-4px"><b>${media}%</b></div>` +
    `<div class="abars">` + ACTIVITY.map((a, i) =>
      `<div class="abar${i === todayIdx ? " now" : ""}" data-tip="${a.day}: ${a.value}% do dia apontado">` +
      `<i style="height:${a.value}%"></i><span class="lb">${a.day}<br>${a.value}%</span></div>`).join("") +
    `</div></section>`;
}

function workedCard(): string {
  const total = WORKED.reduce((s, w) => s + w.hours, 0);
  const cols = ["var(--s-todo)", "var(--s-doing)", "var(--s-review)", "var(--s-done)"];
  const R = 46, C = 2 * Math.PI * R, GAP = 4;
  let acc = 0;
  const arcs = WORKED.map((w, i) => {
    const len = (w.hours / total) * C;
    const seg = `<circle r="${R}" cx="60" cy="60" fill="none" stroke="${cols[i]}" stroke-width="13" ` +
      `stroke-dasharray="${Math.max(1, len - GAP)} ${C - Math.max(1, len - GAP)}" ` +
      `stroke-dashoffset="${-acc}" stroke-linecap="round"></circle>`;
    acc += len;
    return seg;
  }).join("");
  return `<section class="dcard" style="--i:4">` +
    `<div class="dhead"><h3>Projetos da semana</h3><span class="trend down">−5%</span></div>` +
    `<div class="donutwrap"><div class="donut"><svg viewBox="0 0 120 120">` +
      `<circle r="${R}" cx="60" cy="60" fill="none" stroke="var(--panel2)" stroke-width="13"></circle>${arcs}</svg>` +
      `<div class="mid"><span><b>${WORKED.length}</b><br><span>projetos</span></span></div></div>` +
    `<div class="dleg">` + WORKED.map((w, i) =>
      `<span data-tip="${esc(project(w.project).name)}: ${w.hours}h de ${total}h"><i style="background:${cols[i]}"></i>` +
      `<em>${esc(project(w.project).name)}</em></span>`).join("") + `</div></div></section>`;
}

function remindersCard(): string {
  const list = REMINDERS.filter(r => r.date === isoOf(TODAY));
  return `<section class="dcard" style="--i:5">` +
    `<div class="dhead"><h3>Lembretes</h3><span class="chip-n">${list.length}</span></div>` +
    `<div class="rems">` + list.map(r =>
      `<div class="rem"><b>${hhmm(r.hour)}<em>${r.hour < 12 ? "AM" : "PM"}</em></b>` +
      `<span>${esc(r.text)}</span></div>`).join("") +
    `<button class="rem add" data-newreminder="1">+ Novo lembrete</button></div></section>`;
}

/* ============================ painel: linha do tempo ============================ */

const H0 = 9, H1 = 18, ROW = 78;

function blockHTML(b: Block): string {
  const top = (b.start - H0) * ROW + 4;
  const height = (b.end - b.start) * ROW - 8;
  if (b.brk) {
    return `<div class="tlblk brk" style="top:${top}px;height:${height}px"><h4>Intervalo</h4>` +
      `<p>${hhmm(b.start)}–${hhmm(b.end)}</p></div>`;
  }
  const t = findTask(b.task!);
  if (!t || !matchesFilters(t)) return "";
  const hot = t.priority === "alta" && t.status !== "done";
  const color = t.status === "done" ? "var(--s-done)"
    : t.priority === "alta" ? "var(--red)" : t.priority === "media" ? "var(--amber)" : "var(--s-done)";
  const label = t.status === "done" ? "Concluída" : PRIO_NAME[t.priority];
  const tall = height > 120;
  return `<button class="tlblk${hot ? " hot" : ""}" style="top:${top}px;height:${height}px" data-open="${t.id}" ` +
    `data-tip="${esc(t.title)} · ${hhmm(b.start)}–${hhmm(b.end)}">` +
    `<span class="lab" style="color:${color}"><i style="background:${color}"></i>${label}</span>` +
    `<h4>${esc(t.title)}</h4>` +
    (tall ? `<p>${esc(t.desc.slice(0, 70))}${t.desc.length > 70 ? "…" : ""}</p>` : "") +
    `<span class="ft">${avatarStack(t.who, 3)}<span class="push"></span>` +
    `<span class="tmini">${I.clock}${(b.end - b.start).toFixed(1).replace(".", ",")}h</span>` +
    `<span class="tmini">${I.chat}${t.comments}</span></span></button>`;
}

function timeline(days: number[]): string {
  const cols = `56px repeat(${days.length}, minmax(0,1fr))`;
  const head = `<div class="tlhead" style="grid-template-columns:${cols}"><div></div>` +
    days.map(d => {
      const date = addDays(state.week, d);
      const isToday = sameDay(date, TODAY);
      return `<div class="${isToday ? "today" : ""}">${DIA_CURTO[d]}<b>${String(date.getDate()).padStart(2, "0")}</b></div>`;
    }).join("") + `</div>`;

  const hours = Array.from({ length: H1 - H0 }, (_, i) => H0 + i);
  const gutter = `<div class="tlgut">` + hours.map(h => `<i>${hhmm(h)}</i>`).join("") + `</div>`;
  const columns = days.map(d => {
    const isToday = sameDay(addDays(state.week, d), TODAY);
    return `<div class="tlcol${isToday ? " today" : ""}" data-day="${d}">` +
      hours.map(() => `<div class="hr"></div>`).join("") +
      SCHEDULE.filter(b => b.day === d).map(blockHTML).join("") + `</div>`;
  }).join("");

  const showNow = days.some(d => sameDay(addDays(state.week, d), TODAY));
  const now = showNow
    ? `<div class="tlnow" style="top:${(NOW_H - H0) * ROW}px"><b>${hhmm(NOW_H)}</b><i></i></div>`
    : "";

  return `<div class="tlwrap">${head}` +
    `<div class="tlbody" style="grid-template-columns:${cols}">${gutter}${columns}${now}</div></div>`;
}

/** Grade do mês com um ponto por tarefa que vence no dia. */
function monthGrid(base: Date, onDay?: (d: Date) => string): string {
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const start = weekStart(first);
  const cells: string[] = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map(d => `<div class="dow">${d}</div>`);
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i);
    const out = d.getMonth() !== base.getMonth();
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const due = TASKS.filter(t => t.due === iso);
    const dots = due.slice(0, 5).map(t =>
      `<i style="background:${statusOf(t.status).color}"></i>`).join("");
    cells.push(
      `<div class="mday${out ? " out" : ""}${sameDay(d, TODAY) ? " today" : ""}" ` +
      `data-tip="${d.getDate()} ${MES_CURTO[d.getMonth()]}: ${plural(due.length, "tarefa vence", "tarefas vencem")}">` +
      `<b>${d.getDate()}</b><span class="dots">${dots}</span>` +
      (due.length > 5 ? `<span class="more">+${due.length - 5}</span>` : "") +
      (onDay ? onDay(d) : "") + `</div>`);
  }
  return `<div class="mth">${cells.join("")}</div>`;
}

/** Tarefas por mês de vencimento no ano. */
function yearChart(): string {
  const counts = MES_CURTO.map((m, i) => ({
    label: m, color: "var(--acc-2)",
    value: TASKS.filter(t => new Date(t.due + "T00:00:00").getMonth() === i).length,
  }));
  return columns(counts);
}

/* ============================ painel: montagem ============================ */

function renderDashHead(): void {
  const d = TODAY;
  $("#headLeft").innerHTML =
    `<h1 class="ptitle">Painel</h1>` +
    `<div class="dashsub" style="padding-left:0">` +
    `${DIA_LONGO[(d.getDay() + 6) % 7]}, ${fmtLong("2026-09-01")} · Estúdio Órbita · ` +
    `${plural(PROJECTS.length, "projeto", "projetos")}</div>`;
}

function rangeSeg(): string {
  const opts: [State["range"], string][] = [["hoje", "Hoje"], ["semana", "Semana"], ["mes", "Mês"], ["ano", "Ano"]];
  return `<div class="rangeseg" id="rangeSeg">` + opts.map(([k, l]) =>
    `<button data-range="${k}"${state.range === k ? ' aria-current="true"' : ""}>${l}</button>`).join("") + `</div>`;
}

function scheduleView(): string {
  if (state.range === "hoje") return timeline([1]);
  if (state.range === "semana") return timeline([0, 1, 2, 3, 4]);
  if (state.range === "mes") return `<section class="dcard" style="--i:0">${monthGrid(TODAY)}</section>`;
  return `<section class="dcard" style="--i:0"><div class="dhead"><h3>Tarefas por mês de vencimento</h3>` +
    `<span class="sub">2026</span></div>${yearChart()}</section>`;
}

/** Os indicadores que ficam abaixo da agenda. */
function indicatorCards(): string {
  const open = openTasks();
  const late = open.filter(t => dayDiff(t.due) < 0);
  const status = byStatus();
  const deadline = byDeadline();
  const people = byPerson();
  const projects = byProject();
  const cards: string[] = [];

  cards.push(dcard({
    span: "c7", i: 0, title: "Fluxo por status", sub: `${TASKS.length} tarefas`, key: "status",
    chart: stackedBar(status, TASKS.length) +
      `<p class="dnote"><b>${Math.round(pct(status[3]!.value, TASKS.length))}%</b> do escopo total já entregue. ` +
      `<b>${status[2]!.value}</b> em revisão esperando aprovação e <b>${status[1]!.value}</b> em andamento agora.</p>`,
    table: dataTable(["Status", "Tarefas"], status.map(s => [s.label, String(s.value)])),
  }));
  cards.push(dcard({
    span: "c5", i: 1, title: "Prioridade em aberto",
    chart: `<div class="kpis">` + (["alta", "media", "baixa"] as Priority[]).map(k => {
      const n = open.filter(t => t.priority === k).length;
      const c = k === "alta" ? "var(--red)" : k === "media" ? "var(--amber)" : "var(--tx)";
      return `<div class="kpi"><b style="color:${c}">${n}</b><span>${prioChip(k)}</span></div>`;
    }).join("") + `</div>` +
      `<p class="dnote"><b>${late.length}</b> tarefa(s) já vencida(s) no estúdio inteiro.</p>`,
  }));
  cards.push(dcard({
    span: "c7", i: 2, title: "Prazos das tarefas em aberto", sub: "por semana, a partir de hoje", key: "prazos",
    chart: columns(deadline) +
      `<p class="dnote"><b>${deadline[1]!.value + deadline[2]!.value}</b> tarefas vencem nas próximas duas semanas` +
      `${deadline[0]!.value ? `, além de <b>${deadline[0]!.value}</b> já vencida(s)` : ""}.</p>`,
    table: dataTable(["Faixa", "Tarefas"], deadline.map(s => [s.label, String(s.value)])),
  }));
  cards.push(dcard({
    span: "c5", i: 3, title: "Carga por pessoa", sub: "tarefas em aberto", key: "pessoas",
    chart: hBars(people.map(p => ({ name: p.label, value: p.value }))),
    table: dataTable(["Pessoa", "Tarefas"], people.map(p => [p.label, String(p.value)])),
  }));
  cards.push(dcard({
    span: "c12", i: 4, title: "Progresso por projeto", sub: "tarefas concluídas", key: "projetos",
    chart: hBars(projects.map(p => ({
      name: p.name, value: p.done, max: p.total, label: `${Math.round(pct(p.done, p.total))}%`,
    }))),
    table: dataTable(["Projeto", "Concluídas"], projects.map(p => [p.name, `${p.done} de ${p.total}`])),
  }));
  return `<div class="dashgrid">${cards.join("")}</div>`;
}

function renderDashboard(): void {
  $("#dash").innerHTML =
    `<div class="dash">` +
      `<div class="dashcol">` +
        `<div class="dashrow">${timerCard()}${todayTasksCard()}${meetingsCard()}</div>` +
        `<div class="dsec"><h2>Projetos</h2>` +
        `<button class="btn" id="dashFilter" style="padding:6px 14px">Filtros ` +
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">` +
        `<path d="M4 7h4M12 7h8M4 17h8M16 17h4"/><circle cx="10" cy="7" r="2.1"/><circle cx="14" cy="17" r="2.1"/></svg>` +
        (filterCount() ? `<span class="cnt">${filterCount()}</span>` : "") + `</button>` +
        `<span class="push"></span>${rangeSeg()}</div>` +
        scheduleView() +
        `<div class="dsec"><h2>Indicadores</h2></div>` +
        indicatorCards() +
      `</div>` +
      `<div class="dashcol">${activityCard()}${workedCard()}${remindersCard()}</div>` +
    `</div>`;
}

/* ============================ calendário ============================ */

const ROWC = 76;

interface CalEvent {
  id?: string;
  /** id da tarefa, quando o evento é uma tarefa agendada */
  taskId?: string;
  start: number; end: number; title: string; sub: string; who: string[];
  kind: Meeting["kind"] | "intervalo" | "lembrete" | "tarefa";
  /** acontecendo agora */ hot?: boolean;
  /** já terminou */ past?: boolean;
  /** coluna e total de colunas do grupo que se sobrepõe */
  col?: number; cols?: number;
}

/** Distribui eventos sobrepostos em colunas lado a lado. */
/** 0 = faixa de tarefas (e intervalos), 1 = faixa de compromissos. */
const laneOf = (e: CalEvent): number => (e.kind === "tarefa" || e.kind === "intervalo" ? 0 : 1);

function layoutEvents(list: CalEvent[]): CalEvent[] {
  const sorted = [...list].sort((a, b) => a.start - b.start || a.end - b.end);
  /* Cada faixa (reuniões / lembretes) resolve as próprias sobreposições. */
  for (const lane of [0, 1]) {
    const inLane = sorted.filter(e => laneOf(e) === lane);
    let group: CalEvent[] = [];
    let groupEnd = -1;
    const flush = (): void => { group.forEach((e, i) => { e.col = i; e.cols = group.length; }); group = []; };
    for (const e of inLane) {
      if (group.length && e.start >= groupEnd) flush();
      group.push(e);
      groupEnd = Math.max(groupEnd, e.end);
    }
    flush();
  }
  return sorted;
}

/** Os eventos do dia aberto, conforme o seletor Tarefas / Reuniões / Lembretes / Tudo. */
function dayEvents(): CalEvent[] {
  const d = state.calDate;
  const iso = isoOf(d);
  const wd = weekdayOf(d);
  const isToday = sameDay(d, TODAY);
  const out: CalEvent[] = [];
  const stateOf = (start: number, end: number): { hot?: boolean; past?: boolean } =>
    !isToday ? (d < TODAY ? { past: true } : {})
      : NOW_H >= start && NOW_H < end ? { hot: true }
      : NOW_H >= end ? { past: true } : {};

  const wantTask = state.calFilter === "tarefas" || state.calFilter === "tudo";
  const wantMeet = state.calFilter === "reunioes" || state.calFilter === "tudo";
  const wantRem  = state.calFilter === "lembretes" || state.calFilter === "tudo";

  /* Tarefas agendadas: o plano da semana corrente. */
  if (wantTask && sameDay(weekStart(d), THIS_WEEK) && wd <= 4) {
    for (const blk of SCHEDULE.filter(x => x.day === wd)) {
      if (blk.brk) {
        out.push({ start: blk.start, end: blk.end, title: "Intervalo", sub: "almoço",
          who: [], kind: "intervalo", ...stateOf(blk.start, blk.end) });
        continue;
      }
      const t = findTask(blk.task!);
      if (!t || !matchesFilters(t)) continue;
      out.push({ taskId: t.id, start: blk.start, end: blk.end, title: t.title,
        sub: `${project(t.project).name} · ${PRIO_NAME[t.priority]}`, who: t.who,
        kind: "tarefa", ...stateOf(blk.start, blk.end) });
    }
  }
  if (wantMeet) {
    for (const m of MEETINGS.filter(x => x.date === iso)) {
      out.push({ id: m.id, start: m.hour, end: m.end, title: m.title, sub: KIND_NAME[m.kind],
        who: m.who, kind: m.kind, ...stateOf(m.hour, m.end) });
    }
    if (!wantTask) {
      out.push({ start: 12, end: 13, title: "Intervalo", sub: "almoço", who: [],
        kind: "intervalo", ...stateOf(12, 13) });
    }
  }
  if (wantRem && state.calFilter === "lembretes") {
    for (const r of REMINDERS.filter(x => x.date === iso)) {
      out.push({ start: r.hour, end: r.hour + 0.5, title: r.text, sub: "Lembrete",
        who: [], kind: "lembrete", ...stateOf(r.hour, r.hour + 0.5) });
    }
  }
  return layoutEvents(out);
}

/** Tarefas que vencem no dia aberto — vão para a faixa de dia inteiro. */
function dayDue(): Task[] {
  const iso = isoOf(state.calDate);
  return TASKS.filter(t => t.due === iso && matchesFilters(t));
}

function eventRow(e: CalEvent): string {
  const top = (e.start - H0) * ROWC + 3;
  const height = Math.max(34, (e.end - e.start) * ROWC - 6);
  const short = height < 50;
  const cols = e.cols ?? 1, col = e.col ?? 0;
  /* Com "Tudo", tarefas ficam à esquerda e reuniões/lembretes numa faixa própria à direita. */
  const split = state.calFilter === "tudo";
  const lane = laneOf(e);
  const laneLeft = split ? (lane ? 62 : 0) : 0;
  const laneW = split ? (lane ? 38 : 62) : 100;
  const w = laneW / cols;
  const left = laneLeft + col * w;
  const tight = split && lane === 1;
  const brk = e.kind === "intervalo";
  const cls = [e.hot ? "hot" : "", brk ? "brk" : "", e.past && !e.hot ? "past" : ""].filter(Boolean).join(" ");
  const dot = e.hot ? "var(--red)" : brk ? "var(--tx3)"
    : e.kind === "tarefa" ? "var(--acc-2)"
    : e.kind === "lembrete" ? "var(--amber)" : e.past ? "var(--tx3)" : "var(--s-done)";
  const chip = e.hot ? "hot" : brk || e.past ? "past" : "";
  const plat = e.kind === "tarefa" ? `<span class="plat" title="Tarefa">${I.pen}</span>`
    : e.kind === "lembrete" ? `<span class="plat" title="Lembrete">${I.clock}</span>` : brk ? "" :
    `<span class="plat" title="${KIND_NAME[e.kind as Meeting["kind"]]}">${KIND_ICON[e.kind as Meeting["kind"]]}</span>`;
  const open = e.id ? ` data-meeting="${e.id}" role="button" tabindex="0"`
    : e.taskId ? ` data-open="${e.taskId}" role="button" tabindex="0"` : "";
  return `<div class="ev ${cls}${short ? " short" : ""}"${open} ` +
    `style="left:calc(10px + ${left}%);width:calc(${w}% - 14px);top:${top}px;height:${height}px" ` +
    `data-tip="${esc(e.title)} · ${hhmm(e.start)}–${hhmm(e.end)} · ${esc(e.sub)}">` +
    `<span class="dot" style="background:${dot}"></span>` +
    `<span class="bd"><b><em class="t">${esc(e.title)}</em>${brk ? "" : I.ext}</b>` +
    (short ? "" : `<span>${esc(e.sub)}</span>`) + `</span>` +
    `<span class="rt">${e.who.length && !short ? avatarStack(e.who, tight ? 2 : 3) : ""}` +
    `${short || tight ? "" : plat}` +
    `<span class="hchip ${chip}">${hhmm(e.start)}–${hhmm(e.end)}</span></span></div>`;
}

function renderCalHead(): void {
  $("#headLeft").innerHTML =
    `<h1 class="ptitle">Calendário</h1>` +
    `<div class="ttabs">` +
    ([["dia", "Dia"], ["semana", "Semana"], ["mes", "Mês"], ["ano", "Ano"]] as [State["calView"], string][])
      .map(([k, l]) => `<button class="ttab" data-calview="${k}"` +
        `${state.calView === k ? ' aria-current="true"' : ""}>${l}</button>`).join("") + `</div>`;
}

function dayView(): string {
  const hours = Array.from({ length: H1 - H0 }, (_, i) => H0 + i);
  const events = dayEvents();
  const isToday = sameDay(state.calDate, TODAY);
  const iso = isoOf(state.calDate);
  const due = state.calFilter === "lembretes" || state.calFilter === "reunioes" ? [] : dayDue();
  const rems = state.calFilter === "tudo" ? REMINDERS.filter(r => r.date === iso) : [];
  const strips: string[] = [];
  if (due.length) {
    strips.push(`<div class="allday"><span class="lbl">Vencem<br>neste dia</span><div class="chips2">` +
      due.map(t => `<button class="duechip${isLate(t) ? " late" : ""}" data-open="${t.id}">` +
        `<i style="background:${statusOf(t.status).color}"></i>${esc(t.title)}` +
        `<em>${esc(project(t.project).name)}</em></button>`).join("") + `</div></div>`);
  }
  if (rems.length) {
    strips.push(`<div class="allday"><span class="lbl">Lembretes</span><div class="chips2">` +
      rems.map(r => `<span class="duechip rem2"><i style="background:var(--amber)"></i>` +
        `${esc(r.text)}<em>${hhmm(r.hour)}</em></span>`).join("") + `</div></div>`);
  }
  const allday = strips.join("");
  return allday + `<div class="daycal">` +
    `<div class="gut">` + hours.map(h => `<i>${hhmm(h)}</i>`).join("") + `</div>` +
    `<div class="dayplot">` + hours.map(() => `<div class="hr"></div>`).join("") +
      events.map(eventRow).join("") +
      (events.length ? "" : `<div class="evempty">Nenhum compromisso neste dia.</div>`) +
      (isToday ? `<div class="tlnow" style="top:${(NOW_H - H0) * ROWC}px"><b>${hhmm(NOW_H)}</b></div>` : "") +
    `</div></div>`;
}

/** Dias do mês que têm reunião ou lembrete, para o ponto no mini-calendário. */
function hasEvents(d: Date): boolean {
  const iso = isoOf(d);
  if (MEETINGS.some(m => m.date === iso) || REMINDERS.some(r => r.date === iso)) return true;
  if (TASKS.some(t => t.due === iso)) return true;
  return sameDay(weekStart(d), THIS_WEEK) && weekdayOf(d) <= 4 && SCHEDULE.some(b => b.day === weekdayOf(d));
}

function miniMonth(): string {
  const base = state.calMonth;
  const start = weekStart(new Date(base.getFullYear(), base.getMonth(), 1));
  const cells = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]
    .map(d => `<span class="dw">${d}</span>`);
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i);
    const cls = [
      d.getMonth() !== base.getMonth() ? "out" : "",
      weekdayOf(d) > 4 ? "wknd" : "",
      sameDay(d, state.calDate) ? "sel" : sameDay(d, TODAY) ? "now" : "",
    ].filter(Boolean).join(" ");
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    cells.push(`<button class="${cls}" data-calday="${iso}" aria-label="${d.getDate()} de ${MESES[d.getMonth()]}">` +
      `${d.getDate()}${hasEvents(d) && d.getMonth() === base.getMonth() ? "<i></i>" : ""}</button>`);
  }
  const nome = MESES[base.getMonth()]!;
  return `<div class="mini"><div class="mininav">` +
    `<button data-calmonth="-1" aria-label="Mês anterior">${I.left}</button>` +
    `<b>${nome[0]!.toUpperCase()}${nome.slice(1)} ${base.getFullYear()}</b>` +
    `<button data-calmonth="1" aria-label="Próximo mês">${I.right}</button></div>` +
    `<div class="minigrid">${cells.join("")}</div></div>`;
}

function teamList(): string {
  const status = ["var(--green)", "var(--green)", "var(--amber)", "var(--tx3)", "var(--green)"];
  return `<div><h3>Time no projeto</h3><div class="team">` +
    Object.entries(PEOPLE).slice(0, 5).map(([k, p], i) =>
      `<button class="tmrow" data-chat="${k}">` +
      `<span class="wrap">${avatar(k, "lg")}<i class="onstat" style="background:${status[i]}"></i></span>` +
      `<span class="bd"><b>${esc(p.name)}</b><span>${esc(p.role)}</span></span>` +
      `<span class="go">${I.right}</span></button>`).join("") +
    `</div><button class="newchat" data-newchat="1" style="margin-top:12px">${I.plus} Nova conversa</button></div>`;
}

function openMeeting(id: string): void {
  const m = MEETINGS.find(x => x.id === id);
  if (!m) return;
  const dia = `${DIA_LONGO[weekdayOf(new Date(m.date + "T00:00:00"))]}, ${fmtLong(m.date)}`;
  openLayer(
    `<div class="scrim"><div class="sheet" style="width:min(520px,100%)" role="dialog" aria-modal="true" ` +
    `aria-label="${esc(m.title)}">` +
    `<div class="sheet-h"><div class="grow"><div class="crumb">${KIND_NAME[m.kind]} · ${dia}</div>` +
    `<h2>${esc(m.title)}</h2></div>` +
    `<button class="iconbtn" data-close="1" data-focus aria-label="Fechar">${I.x}</button></div>` +
    `<div class="sheet-b">` +
    `<p class="desc">${esc(m.desc)}</p>` +
    `<div class="readout">` +
      `<div><span>Horário</span><b>${hhmm(m.hour)} – ${hhmm(m.end)}</b></div>` +
      `<div><span>Duração</span><b>${Math.round((m.end - m.hour) * 60)} min</b></div>` +
      `<div><span>Participantes</span><b>${avatarStack(m.who, 5)}</b></div>` +
    `</div>` +
    `<div class="acts" style="padding-top:0"><button class="btn" data-editmeeting="${m.id}">${I.pen} Editar</button>` +
    `<button class="btn danger" data-delmeeting="${m.id}">${I.trash} Cancelar reunião</button></div>` +
    `<div class="acts"><button class="btn solid" data-join="1">${KIND_ICON[m.kind]} Entrar na chamada</button>` +
    `<button class="btn" data-copymeeting="1">${I.link} Copiar link</button>` +
    `<span class="push"></span><button class="btn" data-close="1">Fechar</button></div>` +
    `</div></div></div>`);
}

/** Cadastro e edição de reunião. */
function openMeetingForm(existing?: Meeting): void {
  const edit = !!existing;
  const m: Omit<Meeting, "id"> = existing ?? {
    date: isoOf(state.screen === "cal" ? state.calDate : TODAY),
    hour: 14, end: 15, title: "", desc: "", kind: "video", who: ["ar"],
  };
  const kinds: Meeting["kind"][] = ["video", "chamada", "onboarding", "revisao", "daily"];
  openLayer(
    `<div class="scrim"><div class="sheet" role="dialog" aria-modal="true" ` +
    `aria-label="${edit ? "Editar reunião" : "Nova reunião"}">` +
    `<div class="sheet-h"><div class="grow"><div class="crumb">Agenda do estúdio</div>` +
    `<h2>${edit ? "Editar reunião" : "Nova reunião"}</h2></div>` +
    `<button class="iconbtn" data-close="1" aria-label="Fechar">${I.x}</button></div>` +
    `<form class="sheet-b" id="meetForm">` +
    `<div class="field"><label for="mT">Título</label><input id="mT" type="text" data-focus required maxlength="70" ` +
      `value="${esc(m.title)}" placeholder="Ex.: Revisão do protótipo com o cliente"></div>` +
    `<div class="field"><label for="mD">Pauta</label><textarea id="mD" maxlength="280" ` +
      `placeholder="O que precisa ser decidido nesta conversa.">${esc(m.desc)}</textarea></div>` +
    `<div class="three">` +
      `<div class="field"><label for="mK">Tipo</label><select id="mK">` +
        kinds.map(k => `<option value="${k}"${k === m.kind ? " selected" : ""}>${KIND_NAME[k]}</option>`).join("") +
      `</select></div>` +
      `<div class="field"><label for="mDate">Data</label><input id="mDate" type="date" value="${m.date}"></div>` +
      `<div class="field"><label for="mH">Início</label><input id="mH" type="time" value="${hhmm(m.hour)}" step="900"></div>` +
    `</div>` +
    `<div class="field"><label for="mDur">Duração</label><select id="mDur">` +
      [15, 30, 45, 60, 90, 120].map(v =>
        `<option value="${v}"${Math.round((m.end - m.hour) * 60) === v ? " selected" : ""}>${v} min</option>`).join("") +
    `</select></div>` +
    `<div class="field"><label>Participantes</label><div class="people" id="mW">` +
      Object.keys(PEOPLE).map(k =>
        `<button type="button" class="pbtn" data-p="${k}" aria-pressed="${m.who.includes(k)}">` +
        `${avatar(k)}${esc(PEOPLE[k]!.name)}</button>`).join("") +
    `</div></div>` +
    `<div class="acts">` +
      (edit ? `<button type="button" class="btn danger" data-delmeeting="${existing!.id}">${I.trash} Cancelar reunião</button>` : "") +
      `<span class="push"></span><button type="button" class="btn" data-close="1">Cancelar</button>` +
      `<button type="submit" class="btn solid">${edit ? "Salvar" : "Agendar reunião"}</button>` +
    `</div></form></div></div>`,
    () => {
      $("#mW").addEventListener("click", e => {
        const b = (e.target as HTMLElement).closest<HTMLElement>(".pbtn");
        if (!b) return;
        b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true");
      });
      $<HTMLFormElement>("#meetForm").addEventListener("submit", e => {
        e.preventDefault();
        const title = $<HTMLInputElement>("#mT").value.trim();
        if (!title) { $<HTMLInputElement>("#mT").focus(); return; }
        const [hh, mm] = $<HTMLInputElement>("#mH").value.split(":").map(Number);
        const hour = (hh ?? 14) + (mm ?? 0) / 60;
        const dur = Number($<HTMLSelectElement>("#mDur").value) / 60;
        const who = [...layer.querySelectorAll<HTMLElement>('.pbtn[aria-pressed="true"]')].map(b => b.dataset["p"]!);
        const patch = {
          title, desc: $<HTMLTextAreaElement>("#mD").value.trim(),
          kind: $<HTMLSelectElement>("#mK").value as Meeting["kind"],
          date: $<HTMLInputElement>("#mDate").value || m.date,
          hour, end: hour + dur, who,
        };
        if (existing) { Object.assign(existing, patch); toast("Reunião atualizada."); }
        else {
          MEETINGS.push({ id: "m" + ++seq, ...patch });
          state.calDate = new Date(patch.date + "T00:00:00");
          state.calMonth = new Date(state.calDate.getFullYear(), state.calDate.getMonth(), 1);
          if (state.calFilter === "tarefas") state.calFilter = "tudo";
          toast(`Reunião marcada para ${fmtLong(patch.date)}, ${hhmm(hour)}.`);
        }
        closeLayer();
        if (state.screen === "cal") renderCalendar(); else renderDashboard();
      });
    });
}

function deleteMeeting(id: string): void {
  const i = MEETINGS.findIndex(m => m.id === id);
  if (i < 0) return;
  const n = MEETINGS[i]!.title;
  MEETINGS.splice(i, 1);
  closeLayer();
  if (state.screen === "cal") renderCalendar(); else renderDashboard();
  toast(`“${n}” foi cancelada.`);
}

function renderCalendar(): void {
  const d = state.calDate;
  const filters: [State["calFilter"], string][] =
    [["tarefas", "Tarefas"], ["reunioes", "Reuniões"], ["lembretes", "Lembretes"], ["tudo", "Tudo"]];
  const n = filterCount();

  const bar = `<div class="calbar">` +
    `<h2>${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}</h2>` +
    `<div class="daynav">` +
      `<button data-calshift="-1" aria-label="Dia anterior">${I.left}</button>` +
      `<button class="today" data-calshift="0">Hoje</button>` +
      `<button data-calshift="1" aria-label="Próximo dia">${I.right}</button>` +
    `</div><span class="push"></span>` +
    `<div class="rangeseg">` + filters.map(([k, l]) =>
      `<button data-calfilter="${k}"${state.calFilter === k ? ' aria-current="true"' : ""}>${l}</button>`).join("") +
    `</div>` +
    `<button class="btn" id="calFilter" style="padding:7px 15px">Filtros ` +
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">` +
      `<path d="M4 7h4M12 7h8M4 17h8M16 17h4"/><circle cx="10" cy="7" r="2.1"/><circle cx="14" cy="17" r="2.1"/></svg>` +
      (n ? `<span class="cnt">${n}</span>` : "") + `</button>` +
    `<button class="btn solid" data-newmeeting="1">${I.plus} Novo evento</button></div>`;

  const main =
    state.calView === "dia" ? dayView() :
    state.calView === "semana" ? timeline([0, 1, 2, 3, 4]) :
    state.calView === "mes" ? `<section class="dcard">${monthGrid(state.calMonth)}</section>` :
    `<section class="dcard"><div class="dhead"><h3>Tarefas por mês de vencimento</h3>` +
      `<span class="sub">${d.getFullYear()}</span></div>${yearChart()}</section>`;

  $("#cal").innerHTML = bar +
    `<div class="calwrap"><div class="dashcol">${main}</div>` +
    `<div class="calside">${miniMonth()}${teamList()}</div></div>`;
}

/* ============================ roteamento e eventos ============================ */

function renderScreen(): void {
  if (state.screen === "dash") { renderDashHead(); renderDashboard(); }
  else if (state.screen === "cal") { renderCalHead(); renderCalendar(); }
  else { renderHeader(); renderView(); }
}

/* dica flutuante dos gráficos */
const tip = document.createElement("div");
tip.className = "tip";
document.body.appendChild(tip);

document.addEventListener("mousemove", e => {
  const host = (e.target as HTMLElement).closest<HTMLElement>("[data-tip]");
  if (!host) { tip.classList.remove("on"); return; }
  tip.textContent = host.dataset["tip"]!;
  tip.style.left = `${e.clientX}px`;
  tip.style.top = `${e.clientY}px`;
  tip.classList.add("on");
});
document.addEventListener("mouseleave", () => tip.classList.remove("on"));

/* cronômetro */
window.setInterval(() => {
  if (!state.running) return;
  state.elapsed++;
  const el = document.getElementById("timerNow");
  if (el) el.textContent = clock(state.elapsed);
  const big = document.getElementById("bigTimer");
  if (big) big.style.setProperty("--p", String(Math.min(100, (state.elapsed / (6 * 3600)) * 100)));
}, 1000);

function toggleTimer(id: string): void {
  const t = TASKS.find(x => x.id === id);
  if (!t) return;
  state.running = state.running === id ? null : id;
  renderDashboard();
  toast(state.running ? `Apontando “${t.title}”.` : "Apontamento pausado.");
}

document.addEventListener("click", e => {
  const el = e.target as HTMLElement;

  const screenBtn = el.closest<HTMLElement>("[data-screen]");
  if (screenBtn) { setScreen(screenBtn.dataset["screen"] as State["screen"]); return; }

  const timerBtn = el.closest<HTMLElement>("[data-task]");
  if (timerBtn) { toggleTimer(timerBtn.dataset["task"]!); return; }

  const openBtn = el.closest<HTMLElement>("[data-open]");
  if (openBtn) { openTask(openBtn.dataset["open"]!); return; }

  const df = el.closest<HTMLElement>("#dashFilter");
  if (df) { layer.innerHTML ? closeLayer() : openFilters(df); return; }

  const cv = el.closest<HTMLElement>("[data-calview]");
  if (cv) { state.calView = cv.dataset["calview"] as State["calView"]; renderCalHead(); renderCalendar(); return; }

  const range = el.closest<HTMLElement>("[data-range]");
  if (range) { state.range = range.dataset["range"] as State["range"]; renderScreen(); return; }

  const cf = el.closest<HTMLElement>("[data-calfilter]");
  if (cf) { state.calFilter = cf.dataset["calfilter"] as State["calFilter"]; renderCalendar(); return; }

  const cm = el.closest<HTMLElement>("[data-calmonth]");
  if (cm) {
    const d = new Date(state.calMonth.getTime());
    d.setMonth(d.getMonth() + Number(cm.dataset["calmonth"]));
    state.calMonth = d; renderCalendar(); return;
  }

  const cs = el.closest<HTMLElement>("[data-calshift]");
  if (cs) {
    const n = Number(cs.dataset["calshift"]);
    state.calDate = n === 0 ? new Date(TODAY.getTime()) : addDays(state.calDate, n);
    state.calMonth = new Date(state.calDate.getFullYear(), state.calDate.getMonth(), 1);
    renderCalendar(); return;
  }

  const cfb = el.closest<HTMLElement>("#calFilter");
  if (cfb) { layer.innerHTML ? closeLayer() : openFilters(cfb); return; }

  if (el.closest("[data-newmeeting]")) { openMeetingForm(); return; }

  const mt = el.closest<HTMLElement>("[data-meeting]");
  if (mt) { openMeeting(mt.dataset["meeting"]!); return; }
  const em = el.closest<HTMLElement>("[data-editmeeting]");
  if (em) { const m = MEETINGS.find(x => x.id === em.dataset["editmeeting"]); closeLayer(); if (m) openMeetingForm(m); return; }

  const dm = el.closest<HTMLElement>("[data-delmeeting]");
  if (dm) { deleteMeeting(dm.dataset["delmeeting"]!); return; }

  if (el.closest("[data-join]")) { closeLayer(); toast("Abrindo a chamada…"); return; }
  if (el.closest("[data-copymeeting]")) { closeLayer(); toast("Link da reunião copiado."); return; }

  const chat = el.closest<HTMLElement>("[data-chat]");
  if (chat) { toast(`Conversa aberta com ${PEOPLE[chat.dataset["chat"]!]!.name}.`); return; }

  const cd = el.closest<HTMLElement>("[data-calday]");
  if (cd) {
    state.calDate = new Date(cd.dataset["calday"] + "T00:00:00");
    if (state.calView !== "dia") { state.calView = "dia"; renderCalHead(); }
    renderCalendar(); return;
  }

  const tbl = el.closest<HTMLElement>("[data-dtable]");
  if (tbl) { toggle(state.dashTables, tbl.dataset["dtable"]!); renderDashboard(); return; }


  if (el.closest("[data-newreminder]")) { toast("Lembrete criado para hoje às 17:00."); return; }
  if (el.closest("[data-newchat]")) { toast("Conversa iniciada com o time do projeto."); return; }

  const goto = el.closest<HTMLElement>("[data-goto]");
  if (goto) {
    const t = TASKS.find(x => x.id === goto.dataset["goto"]);
    if (!t) return;
    state.project = t.project; state.section = t.section;
    setScreen("board");
    openTask(t.id);
  }
});

document.addEventListener("keydown", e => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const el = document.activeElement as HTMLElement | null;
  const id = el?.dataset?.["open"];
  if (id) { e.preventDefault(); openTask(id); }
});

/* ============================ integração Pop Organize ============================ */

interface PopWorkspacePayload {
  company: { id: string; name: string; description?: string };
  currentUser: { id: string; name: string; role: string };
  departments: Array<{ id: string; name: string; description: string; color: string }>;
  employees: Array<{ id: string; name: string; role: string; departmentId: string; avatar?: string }>;
  workspaces: Array<{
    id: string; name: string; description?: string;
    kind: "personal" | "company"; isOwner: boolean; role: string;
  }>;
  tasks: Array<{
    id: string; title: string; description: string;
    priority: "low" | "medium" | "high" | "urgent";
    status: "pending" | "in_progress" | "waiting_review" | "reopened" | "completed" | "canceled";
    dueDate: string;
    target: { type: "company" | "department" | "group" | "user"; id: string; label: string };
    responsibleId: string; responsibleIds?: string[]; tags: string[];
    comments: number; attachments: number;
  }>;
  today: string;
}

let popBridgeActive = false;
let POP_WORKSPACES: PopWorkspacePayload["workspaces"] = [];
let POP_COMPANY_ID = "";

function popPost(type: string, payload: Record<string, unknown> = {}): void {
  if (!popBridgeActive || window.parent === window) return;
  window.parent.postMessage({ source: "pop-orbita", type, ...payload }, "*");
}

function popStatus(status: PopWorkspacePayload["tasks"][number]["status"]): StatusId {
  if (status === "in_progress") return "doing";
  if (status === "waiting_review") return "review";
  if (status === "completed" || status === "canceled") return "done";
  return "todo";
}

function popPriority(priority: PopWorkspacePayload["tasks"][number]["priority"]): Priority {
  if (priority === "urgent" || priority === "high") return "alta";
  if (priority === "low") return "baixa";
  return "media";
}

function hueFrom(value: string): number {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return Math.abs(hash);
}

function hydratePopWorkspace(data: PopWorkspacePayload): void {
  popBridgeActive = true;
  POP_WORKSPACES = data.workspaces;
  POP_COMPANY_ID = data.company.id;
  TODAY = new Date(`${data.today}T00:00:00`);
  ME = data.currentUser.id;
  SCHEDULE.splice(0, SCHEDULE.length);
  MEETINGS.splice(0, MEETINGS.length);
  REMINDERS.splice(0, REMINDERS.length);

  PEOPLE = Object.fromEntries(data.employees.map(employee => [employee.id, {
    name: employee.name, role: employee.role, hue: hueFrom(employee.id), avatar: employee.avatar,
  }]));
  if (!PEOPLE[ME]) PEOPLE[ME] = {
    name: data.currentUser.name, role: data.currentUser.role, hue: hueFrom(ME),
  };

  const employeeDepartment = new Map(data.employees.map(employee => [employee.id, employee.departmentId]));
  const departmentIds = new Set(data.departments.map(department => department.id));
  const needsGeneralSection = data.tasks.some(item => {
    const targetDepartment = item.target.type === "department" && departmentIds.has(item.target.id);
    const responsibleDepartment = employeeDepartment.get(item.responsibleId);
    return !targetDepartment && !(responsibleDepartment && departmentIds.has(responsibleDepartment));
  });
  const sectorProjectId = `_sectors:${data.company.id}`;
  const sectorSections: Section[] = data.departments.map(department => ({
    id: department.id,
    name: department.name.toLocaleLowerCase("pt-BR"),
    desc: department.description || `Visão consolidada das tarefas do setor ${department.name.toLocaleLowerCase("pt-BR")}.`,
    hours: "Dados do Pop Organize", from: "—", to: "—",
  }));
  if (needsGeneralSection || !sectorSections.length) sectorSections.push({
    id: `_company:${data.company.id}`, name: "geral",
    desc: data.company.description || "Tarefas gerais da empresa.",
    hours: "Dados do Pop Organize", from: "—", to: "—",
  });
  PROJECTS = [{
    id: sectorProjectId, name: "Setor", favorite: true,
    group: "clientes", hue: hueFrom(data.company.id), sections: sectorSections,
  }];

  TASKS = data.tasks.map(item => {
    const responsibleDepartment = employeeDepartment.get(item.responsibleId);
    const sectionId = item.target.type === "department" && departmentIds.has(item.target.id)
      ? item.target.id
      : responsibleDepartment && departmentIds.has(responsibleDepartment)
        ? responsibleDepartment : `_company:${data.company.id}`;
    return {
      id: item.id, project: sectorProjectId, section: sectionId, status: popStatus(item.status),
      tag: item.tags[0] || "Geral", title: item.title, desc: item.description,
      who: [...new Set([item.responsibleId, ...(item.responsibleIds ?? [])].filter(Boolean))],
      links: item.attachments, comments: item.comments, due: item.dueDate,
      priority: popPriority(item.priority),
    };
  });

  const tags = [...new Set(TASKS.map(item => item.tag))];
  TAGS = Object.fromEntries(tags.map((tag, index) => [tag, (index * 47 + 18) % 360]));
  if (!Object.keys(TAGS).length) TAGS = { Geral: 212 };

  const currentProject = PROJECTS.find(item => item.id === state.project) ?? PROJECTS[0];
  if (currentProject) {
    state.project = currentProject.id;
    state.section = currentProject.sections.find(item => item.id === state.section)?.id
      ?? currentProject.sections[0]!.id;
  }
  state.week = weekStart(TODAY);
  state.calDate = new Date(TODAY.getTime());
  state.calMonth = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  state.tags.clear(); state.who.clear(); state.priorities.clear();

  const me = document.querySelector<HTMLElement>(".topright .me .av");
  if (me) {
    const photo = data.employees.find(employee => employee.id === ME)?.avatar;
    me.textContent = photo ? "" : initials(ME);
    me.style.setProperty("--h", String(PEOPLE[ME]?.hue ?? 220));
    me.style.backgroundImage = photo ? `url(${JSON.stringify(photo)})` : "";
    me.style.backgroundSize = photo ? "cover" : "";
    me.style.backgroundPosition = photo ? "center" : "";
    me.style.width = "40px";
    me.style.height = "40px";
    me.title = PEOPLE[ME]?.name ?? data.currentUser.name;
  }
  document.title = `Pop Organize — ${data.company.name}`;
  renderAll();
  popPost("workspace:ready");
}

window.addEventListener("message", event => {
  const message = event.data as {
    source?: string; type?: string; workspace?: PopWorkspacePayload; message?: string;
  };
  if (message?.source !== "pop-organize") return;
  if (message.type === "action:error") {
    toast(message.message || "Não foi possível concluir a ação.");
    return;
  }
  if (message.type === "workspace" && message.workspace) hydratePopWorkspace(message.workspace);
});

if (window.parent !== window) {
  window.parent.postMessage({ source: "pop-orbita", type: "frame:ready" }, "*");
}

renderAll();
