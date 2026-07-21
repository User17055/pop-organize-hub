import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const responseSchema = z.object({ invitationId: z.string().min(1), accept: z.boolean() });

function errorResponse(error: unknown) {
  const status = typeof error === "object" && error && "statusCode" in error
    ? Number((error as { statusCode?: number }).statusCode) || 500
    : 500;
  return Response.json(
    { error: error instanceof Error ? error.message : "Falha ao processar o convite." },
    { status },
  );
}

export const Route = createFileRoute("/api/mobile/invitations")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { readMobileInvitations } = await import("@/lib/mobile-api.server");
          return Response.json({ invitations: await readMobileInvitations(request) }, {
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          return errorResponse(error);
        }
      },
      POST: async ({ request }) => {
        try {
          const body = responseSchema.safeParse(await request.json());
          if (!body.success) return Response.json({ error: "Resposta inválida." }, { status: 400 });
          const { respondToMobileInvitation } = await import("@/lib/mobile-api.server");
          return Response.json(
            await respondToMobileInvitation(request, body.data.invitationId, body.data.accept),
            { headers: { "cache-control": "no-store" } },
          );
        } catch (error) {
          return errorResponse(error);
        }
      },
    },
  },
});
