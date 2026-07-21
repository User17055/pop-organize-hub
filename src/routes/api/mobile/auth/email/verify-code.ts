import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email(),
  code: z.string().regex(/^\d{6}$/),
});

export const Route = createFileRoute("/api/mobile/auth/email/verify-code")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = schema.safeParse(await request.json());
          if (!body.success) return Response.json({ error: "E-mail ou código inválido." }, { status: 400 });
          const { verifyMobileEmailCode } = await import("@/lib/mobile-api.server");
          return Response.json(await verifyMobileEmailCode(body.data.email, body.data.code), {
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          const status = typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode) || 500
            : 500;
          return Response.json(
            { error: error instanceof Error ? error.message : "Falha ao confirmar o código." },
            { status },
          );
        }
      },
    },
  },
});
