export type TaskStatus =
  | "pending"
  | "in_progress"
  | "waiting_review"
  | "reopened"
  | "completed"
  | "canceled";

export type Priority = "low" | "medium" | "high" | "urgent";

export type TargetType = "company" | "department" | "group" | "user";

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId: string;
  avatar?: string;
  status: "active" | "inactive";
}

export interface Department {
  id: string;
  name: string;
  description: string;
  managerId: string;
  color: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  leaderId: string;
  memberIds: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  createdAt: string;
  target: { type: TargetType; id: string; label: string };
  responsibleId: string;
  reviewerId?: string;
  requiresReview: boolean;
  tags: string[];
  comments: number;
  attachments: number;
}

export const departments: Department[] = [
  { id: "d1", name: "Marketing", description: "Campanhas, conteúdo e mídias sociais", managerId: "u2", color: "oklch(0.68 0.18 245)" },
  { id: "d2", name: "Financeiro", description: "Contas, faturamento e relatórios", managerId: "u4", color: "oklch(0.65 0.16 155)" },
  { id: "d3", name: "Recepção", description: "Atendimento ao cliente e agendamentos", managerId: "u5", color: "oklch(0.78 0.16 75)" },
  { id: "d4", name: "Veterinários", description: "Equipe clínica e procedimentos", managerId: "u6", color: "oklch(0.6 0.22 27)" },
  { id: "d5", name: "Administrativo", description: "Gestão e operações internas", managerId: "u3", color: "oklch(0.52 0.21 256)" },
];

export const employees: Employee[] = [
  { id: "u1", name: "Felipe Souza", email: "felipe@poporganize.com", role: "Designer", departmentId: "d1", status: "active" },
  { id: "u2", name: "Beatriz Lima", email: "bea@poporganize.com", role: "Gestora de Marketing", departmentId: "d1", status: "active" },
  { id: "u3", name: "João Pereira", email: "joao@poporganize.com", role: "Admin", departmentId: "d5", status: "active" },
  { id: "u4", name: "Maria Costa", email: "maria@poporganize.com", role: "Analista Financeira", departmentId: "d2", status: "active" },
  { id: "u5", name: "Ana Silva", email: "ana@poporganize.com", role: "Recepcionista", departmentId: "d3", status: "active" },
  { id: "u6", name: "Dra. Cynthia Reis", email: "cynthia@poporganize.com", role: "Veterinária Chefe", departmentId: "d4", status: "active" },
  { id: "u7", name: "Carlos Mendes", email: "carlos@poporganize.com", role: "Veterinário", departmentId: "d4", status: "active" },
  { id: "u8", name: "Patrícia Alves", email: "patricia@poporganize.com", role: "Social Media", departmentId: "d1", status: "active" },
];

export const groups: Group[] = [
  { id: "g1", name: "Campanha Junho Violeta", description: "Conscientização sobre Alzheimer animal", leaderId: "u2", memberIds: ["u1", "u2", "u6", "u8"] },
  { id: "g2", name: "Projeto Novo Site", description: "Reformulação do site institucional", leaderId: "u1", memberIds: ["u1", "u3", "u8"] },
  { id: "g3", name: "Equipe de Plantão", description: "Atendimento 24h aos fins de semana", leaderId: "u6", memberIds: ["u5", "u6", "u7"] },
  { id: "g4", name: "Treinamento Interno", description: "Capacitação contínua da equipe", leaderId: "u3", memberIds: ["u3", "u4", "u5"] },
];

export const tasks: Task[] = [
  {
    id: "t1",
    title: "Criar campanha de check-up",
    description: "Desenvolver arte, legenda e vídeo para campanha de check-up anual.",
    priority: "high",
    status: "in_progress",
    dueDate: "2026-06-20",
    createdAt: "2026-06-10",
    target: { type: "group", id: "g1", label: "Campanha Junho Violeta" },
    responsibleId: "u1",
    reviewerId: "u2",
    requiresReview: true,
    tags: ["Campanha", "Vídeo"],
    comments: 4,
    attachments: 2,
  },
  {
    id: "t2",
    title: "Atualizar cadastro dos clientes",
    description: "Revisar dados de contato de todos os clientes ativos.",
    priority: "medium",
    status: "pending",
    dueDate: "2026-06-25",
    createdAt: "2026-06-12",
    target: { type: "company", id: "c1", label: "Empresa inteira" },
    responsibleId: "u4",
    requiresReview: false,
    tags: ["CRM"],
    comments: 1,
    attachments: 0,
  },
  {
    id: "t3",
    title: "Organizar sala de reunião",
    description: "Preparar sala para reunião de planejamento estratégico.",
    priority: "low",
    status: "completed",
    dueDate: "2026-06-15",
    createdAt: "2026-06-08",
    target: { type: "department", id: "d5", label: "Administrativo" },
    responsibleId: "u3",
    requiresReview: false,
    tags: ["Operacional"],
    comments: 0,
    attachments: 0,
  },
  {
    id: "t4",
    title: "Criar vídeo sobre catarata em pets",
    description: "Roteiro, gravação e edição de vídeo educativo.",
    priority: "high",
    status: "waiting_review",
    dueDate: "2026-06-18",
    createdAt: "2026-06-05",
    target: { type: "group", id: "g1", label: "Campanha Junho Violeta" },
    responsibleId: "u1",
    reviewerId: "u6",
    requiresReview: true,
    tags: ["Vídeo", "Educativo"],
    comments: 8,
    attachments: 5,
  },
  {
    id: "t5",
    title: "Fechamento financeiro mensal",
    description: "Conciliar contas e gerar relatório do mês.",
    priority: "urgent",
    status: "in_progress",
    dueDate: "2026-06-17",
    createdAt: "2026-06-11",
    target: { type: "department", id: "d2", label: "Financeiro" },
    responsibleId: "u4",
    reviewerId: "u3",
    requiresReview: true,
    tags: ["Financeiro", "Mensal"],
    comments: 2,
    attachments: 3,
  },
  {
    id: "t6",
    title: "Assinar termo de conduta",
    description: "Cada colaborador deve ler e assinar o novo termo.",
    priority: "medium",
    status: "pending",
    dueDate: "2026-06-30",
    createdAt: "2026-06-13",
    target: { type: "company", id: "c1", label: "Empresa inteira" },
    responsibleId: "u3",
    requiresReview: false,
    tags: ["RH"],
    comments: 0,
    attachments: 1,
  },
  {
    id: "t7",
    title: "Treinamento de atendimento",
    description: "Sessão de treinamento sobre novo protocolo.",
    priority: "medium",
    status: "reopened",
    dueDate: "2026-06-22",
    createdAt: "2026-06-09",
    target: { type: "group", id: "g4", label: "Treinamento Interno" },
    responsibleId: "u5",
    reviewerId: "u3",
    requiresReview: true,
    tags: ["Treinamento"],
    comments: 3,
    attachments: 1,
  },
  {
    id: "t8",
    title: "Pedido de material clínico",
    description: "Reposição de estoque de suprimentos médicos.",
    priority: "high",
    status: "pending",
    dueDate: "2026-06-16",
    createdAt: "2026-06-14",
    target: { type: "department", id: "d4", label: "Veterinários" },
    responsibleId: "u7",
    requiresReview: false,
    tags: ["Estoque"],
    comments: 1,
    attachments: 0,
  },
];

export const company = {
  id: "c1",
  name: "Pop Organize Demo",
  document: "00.000.000/0001-00",
};

export const currentUser = {
  id: "u3",
  name: "João Pereira",
  email: "joao@poporganize.com",
  role: "Admin da Empresa",
};

export const getEmployee = (id: string) => employees.find((e) => e.id === id);
export const getDepartment = (id: string) => departments.find((d) => d.id === id);
export const getGroup = (id: string) => groups.find((g) => g.id === id);

export const statusLabels: Record<TaskStatus, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  waiting_review: "Aguardando revisão",
  reopened: "Reaberta",
  completed: "Concluída",
  canceled: "Cancelada",
};

export const priorityLabels: Record<Priority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};
