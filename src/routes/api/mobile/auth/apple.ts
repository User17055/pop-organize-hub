import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  identityToken: z.string().min(100),
  name: z.string().trim().max(200).optional(),
  email: z.string().trim().email().optional(),
});

export const Route = createFileRoute("/api/mobile/auth/apple")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = schema.safeParse(await request.json());
          if (!body.success) {
            return Response.json({ error: "Credencial Apple inválida." }, { status: 400 });
          }
          const { authenticateMobileApple } = await import("@/lib/mobile-api.server");
          return Response.json(await authenticateMobileApple(body.data), {
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          const status =
            typeof error === "object" && error && "statusCode" in error
              ? Number((error as { statusCode?: number }).statusCode) || 500
              : 500;
          return Response.json(
            { error: error instanceof Error ? error.message : "Falha ao autenticar com Apple." },
            { status },
          );
        }
      },
    },
  },
});
