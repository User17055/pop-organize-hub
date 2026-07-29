export type TaskStatus =
  | "pending"
  | "in_progress"
  | "waiting_review"
  | "reopened"
  | "completed"
  | "canceled";

export type Priority = "low" | "medium" | "high" | "urgent";

export type TargetType = "company" | "department" | "group" | "user";

export type RecurrenceFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "yearly" | "custom";

export type RecurrenceCustomUnit = "days" | "weeks" | "months" | "years";

export interface TaskRecurrence {
  frequency: RecurrenceFrequency;
  interval?: number;
  intervalDays?: number;
  customUnit?: RecurrenceCustomUnit;
  dayOfMonth?: number;
  monthOfYear?: number;
  endDate?: string;
}

export interface TaskComment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  sizeLabel: string;
  uploadedById: string;
  createdAt: string;
}

export interface TaskSubtask {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface Company {
  id: string;
  name: string;
  description?: string;
  document: string;
  status: "active" | "inactive";
  kind?: "personal" | "company";
  ownerId?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId: string;
  avatar?: string;
  status: "active" | "inactive";
  permissionGroupId?: string;
}

export type PermissionKey =
  | "tasks.create"
  | "tasks.edit"
  | "tasks.changeStatus"
  | "tasks.complete"
  | "tasks.reopen"
  | "tasks.delete"
  | "tasks.comment"
  | "tasks.attach"
  | "tasks.checklist"
  | "pages.departments"
  | "pages.reports"
  | "pages.employees"
  | "pages.company"
  | "manage.departments"
  | "manage.groups"
  | "manage.employees"
  | "manage.company";

export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  permissions: PermissionKey[];
  isSystem?: boolean;
}

export const permissionCatalog: Array<{
  category: string;
  items: Array<{ key: PermissionKey; label: string; hint: string }>;
}> = [
  {
    category: "Tarefas",
    items: [
      { key: "tasks.create", label: "Criar tarefas", hint: "Pode abrir novas tarefas" },
      { key: "tasks.edit", label: "Editar tarefas", hint: "Título, descrição, prazo e tags" },
      {
        key: "tasks.changeStatus",
        label: "Alterar status",
        hint: "Mover entre pendente/andamento/revisão",
      },
      { key: "tasks.complete", label: "Concluir tarefas", hint: "Marcar tarefas como concluídas" },
      { key: "tasks.reopen", label: "Reabrir tarefas", hint: "Reabrir tarefas concluídas" },
      { key: "tasks.delete", label: "Excluir tarefas", hint: "Remover tarefas permanentemente" },
      { key: "tasks.comment", label: "Comentar", hint: "Escrever comentários nas tarefas" },
      { key: "tasks.attach", label: "Anexar arquivos", hint: "Adicionar anexos nas tarefas" },
      {
        key: "tasks.checklist",
        label: "Gerenciar checklist",
        hint: "Adicionar e marcar itens do checklist",
      },
    ],
  },
  {
    category: "Visualização de páginas",
    items: [
      { key: "pages.departments", label: "Ver Setores", hint: "Acessa a página de setores" },
      { key: "pages.reports", label: "Ver Relatórios", hint: "Acessa indicadores e relatórios" },
      {
        key: "pages.employees",
        label: "Ver Funcionários",
        hint: "Acessa a lista de colaboradores",
      },
      { key: "pages.company", label: "Ver Empresas", hint: "Acessa o cadastro da empresa" },
    ],
  },
  {
    category: "Gestão",
    items: [
      {
        key: "manage.departments",
        label: "Criar/editar setores",
        hint: "Gerencia setores da empresa",
      },
      { key: "manage.groups", label: "Criar/editar grupos", hint: "Gerencia grupos de trabalho" },
      {
        key: "manage.employees",
        label: "Cadastrar funcionários",
        hint: "Adiciona novos colaboradores",
      },
      { key: "manage.company", label: "Editar empresa", hint: "Altera dados da empresa" },
    ],
  },
];

export const allPermissionKeys = permissionCatalog.flatMap((category) =>
  category.items.map((item) => item.key),
);

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
  leaderId?: string;
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
  responsibleIds?: string[];
  assignedById?: string;
  assignedAt?: string;
  reviewerId?: string;
  requiresReview: boolean;
  tags: string[];
  comments: number;
  attachments: number;
  recurrence?: TaskRecurrence;
  recurrenceParentId?: string;
  recurrenceOccurrence?: number;
  commentItems?: TaskComment[];
  attachmentItems?: TaskAttachment[];
  subtasks?: TaskSubtask[];
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface WorkspaceData {
  accessMode: "personal" | "team";
  company: Company;
  currentUser: CurrentUser;
  departments: Department[];
  employees: Employee[];
  groups: Group[];
  tasks: Task[];
  permissionGroups: PermissionGroup[];
  invitations: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    departmentId: string;
    status: "active" | "inactive";
    permissionGroupId?: string;
    groupIds?: string[];
    invitedById: string;
    createdAt: string;
    expiresAt: string;
  }>;
  workspaces: Array<{
    id: string;
    name: string;
    description?: string;
    kind: "personal" | "company";
    isOwner: boolean;
    role: string;
  }>;
  canLeaveCompany: boolean;
}

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

export const departmentColors = [
  "oklch(0.55 0.13 254)",
  "oklch(0.55 0.12 155)",
  "oklch(0.7 0.13 75)",
  "oklch(0.55 0.19 25)",
  "oklch(0.5 0.1 300)",
  "oklch(0.6 0.11 200)",
];
