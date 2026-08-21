import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({ email: z.string().trim().email() });

export const Route = createFileRoute("/api/mobile/auth/email/request-code")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = schema.safeParse(await request.json());
          if (!body.success)
            return Response.json({ error: "Informe um e-mail válido." }, { status: 400 });
          const { requestMobileEmailCode } = await import("@/lib/mobile-api.server");
          return Response.json(await requestMobileEmailCode(body.data.email), {
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          const status =
            typeof error === "object" && error && "statusCode" in error
              ? Number((error as { statusCode?: number }).statusCode) || 500
              : 500;
          return Response.json(
            { error: error instanceof Error ? error.message : "Falha ao enviar o código." },
            { status },
          );
        }
      },
    },
  },
});
