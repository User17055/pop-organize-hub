import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mobile/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { revokeMobileSession } = await import("@/lib/mobile-api.server");
          return Response.json(await revokeMobileSession(request), {
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          const status =
            typeof error === "object" && error && "statusCode" in error
              ? Number((error as { statusCode?: number }).statusCode) || 500
              : 500;
          return Response.json(
            { error: error instanceof Error ? error.message : "Falha ao encerrar a sessão." },
            { status },
          );
        }
      },
    },
  },
});
