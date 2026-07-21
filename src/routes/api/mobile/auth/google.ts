import { createFileRoute } from "@tanstack/react-router";

function errorResponse(error: unknown) {
  const status =
    typeof error === "object" && error && "statusCode" in error
      ? Number((error as { statusCode?: number }).statusCode) || 500
      : 500;
  const message = error instanceof Error ? error.message : "Falha ao autenticar.";
  return Response.json({ error: message }, { status });
}

export const Route = createFileRoute("/api/mobile/auth/google")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { credential?: unknown };
          if (typeof body.credential !== "string" || body.credential.length < 20) {
            return Response.json({ error: "Credencial Google inválida." }, { status: 400 });
          }
          const { authenticateMobileGoogle } = await import("@/lib/mobile-api.server");
          return Response.json(await authenticateMobileGoogle(body.credential), {
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          console.error("Mobile Google login failed", error);
          return errorResponse(error);
        }
      },
    },
  },
});
