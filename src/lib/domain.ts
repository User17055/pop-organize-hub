export type TaskStatus =
  | "pending"
  | "in_progress"
  | "waiting_review"
  | "reopened"
  | "completed"
  | "canceled";

export type Priority = "low" | "medium" | "high" | "urgent";

export type TargetType = "company" | "department" | "group" | "user";

export type RecurrenceFrequency = "daily" | "biweekly" | "monthly" | "custom";

export interface TaskRecurrence {
  frequency: RecurrenceFrequency;
  intervalDays?: number;
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

export interface Company {
  id: string;
  name: string;
  document: string;
  status: "active" | "inactive";
}

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
  reviewerId?: string;
  requiresReview: boolean;
  tags: string[];
  comments: number;
  attachments: number;
  recurrence?: TaskRecurrence;
  commentItems?: TaskComment[];
  attachmentItems?: TaskAttachment[];
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface WorkspaceData {
  company: Company;
  currentUser: CurrentUser;
  departments: Department[];
  employees: Employee[];
  groups: Group[];
  tasks: Task[];
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
  "oklch(0.68 0.18 245)",
  "oklch(0.65 0.16 155)",
  "oklch(0.78 0.16 75)",
  "oklch(0.6 0.22 27)",
  "oklch(0.52 0.21 256)",
  "oklch(0.7 0.17 330)",
];
