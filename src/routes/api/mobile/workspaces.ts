import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mobile/workspaces")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { readMobileWorkspaces } = await import("@/lib/mobile-api.server");
          return Response.json(await readMobileWorkspaces(request), {
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          const status = typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode) || 500
            : 500;
          return Response.json(
            { error: error instanceof Error ? error.message : "Falha ao carregar os espaços." },
            { status },
          );
        }
      },
    },
  },
});
