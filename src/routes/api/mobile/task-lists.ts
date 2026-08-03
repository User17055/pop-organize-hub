import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const folderSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().trim().min(2).max(80),
  parentId: z.string().min(1).max(120).optional(),
  position: z.number().int().min(0).max(100_000),
});

const listSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().trim().min(2).max(80),
  folderId: z.string().min(1).max(120).optional(),
  taskIds: z.array(z.string().min(1).max(300)).max(5_000),
  position: z.number().int().min(0).max(100_000),
});

const payloadSchema = z.object({
  folders: z.array(folderSchema).max(100),
  lists: z.array(listSchema).max(200),
});

function errorResponse(error: unknown) {
  const status =
    typeof error === "object" && error && "statusCode" in error
      ? Number((error as { statusCode?: number }).statusCode) || 500
      : 500;
  return Response.json(
    { error: error instanceof Error ? error.message : "Falha ao sincronizar listas." },
    { status },
  );
}

export const Route = createFileRoute("/api/mobile/task-lists")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { readMobileTaskOrganization } = await import("@/lib/mobile-api.server");
          return Response.json(await readMobileTaskOrganization(request), {
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          return errorResponse(error);
        }
      },
      PUT: async ({ request }) => {
        try {
          const parsed = payloadSchema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json({ error: "Organização de tarefas inválida." }, { status: 400 });
          }
          const { replaceMobileTaskOrganization } = await import("@/lib/mobile-api.server");
          return Response.json(await replaceMobileTaskOrganization(request, parsed.data), {
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
