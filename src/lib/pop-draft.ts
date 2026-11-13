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
  dueTime: z.string().nullable(),
  durationMinutes: z.number().int().nullable(),
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

export const popAnswerSchema = z.object({
  intent: z.enum(["conversation", "task_guidance", "create_task", "out_of_scope"]),
  reply: z.string(),
  status: z.enum(["needs_input", "ready"]),
  missingFields: z.array(z.string()),
  draft: popDraftSchema,
});

export type PopTaskDraft = z.infer<typeof popDraftSchema>;
export type PopAssistantAnswer = z.infer<typeof popAnswerSchema>;

export const popCallDraftSchema = z.object({
  draft: popDraftSchema,
  missingFields: z.array(z.string()),
});

export function restorePopDraft(value: unknown): PopTaskDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const parsed = popDraftSchema.safeParse({ dueTime: null, durationMinutes: null, ...value });
  return parsed.success ? parsed.data : null;
}

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
