import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const mobileTaskSchema = z.object({
  id: z.number().int(),
  serverId: z.string().max(300).optional(),
  title: z.string().trim().min(3).max(300),
  department: z.string().max(120).default("Pessoal"),
  dueLabel: z.string().max(120),
  priority: z.string().max(30),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completed: z.boolean(),
  description: z.string().max(10_000),
  assignee: z.string().max(200),
  assignedBy: z.string().max(200).default(""),
  recurrence: z.string().max(500),
  reminder: z.string().max(200),
  attachmentName: z.string().max(500),
  dueTime: z.string().max(20),
  duration: z.string().max(100),
  recurrenceRule: z.string().max(100),
  recurrenceDetail: z.string().max(500),
  recurrenceInterval: z.number().int().min(1).max(10_000),
  recurrenceEndMode: z.string().max(100),
  recurrenceEndValue: z.string().max(100),
  recurrenceOccurrence: z.number().int().min(1).max(1_000_000),
  canEdit: z.boolean().optional(),
  canComplete: z.boolean().optional(),
  canDelete: z.boolean().optional(),
});

const mobileTasksPayloadSchema = z.object({
  tasks: z.array(mobileTaskSchema).max(5_000),
});

function errorResponse(error: unknown) {
  const status =
    typeof error === "object" && error && "statusCode" in error
      ? Number((error as { statusCode?: number }).statusCode) || 500
      : 500;
  const message = error instanceof Error ? error.message : "Falha ao sincronizar tarefas.";
  return Response.json({ error: message }, { status });
}

export const Route = createFileRoute("/api/mobile/tasks")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { readMobileTasks } = await import("@/lib/mobile-api.server");
          return Response.json(
            { tasks: await readMobileTasks(request) },
            {
              headers: { "cache-control": "no-store" },
            },
          );
        } catch (error) {
          return errorResponse(error);
        }
      },
      PUT: async ({ request }) => {
        try {
          const parsed = mobileTasksPayloadSchema.safeParse(await request.json());
          if (!parsed.success)
            return Response.json({ error: "Lista de tarefas inválida." }, { status: 400 });
          const { replaceMobileTasks } = await import("@/lib/mobile-api.server");
          return Response.json(await replaceMobileTasks(request, parsed.data.tasks), {
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          console.error("Mobile task sync failed", error);
          return errorResponse(error);
        }
      },
    },
  },
});
