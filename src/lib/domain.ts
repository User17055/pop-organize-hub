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
  subtasks?: TaskSubtask[];
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
  "oklch(0.55 0.13 254)",
  "oklch(0.55 0.12 155)",
  "oklch(0.7 0.13 75)",
  "oklch(0.55 0.19 25)",
  "oklch(0.5 0.1 300)",
  "oklch(0.6 0.11 200)",
];
