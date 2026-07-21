import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { checkDatabaseHealth, validateRuntimeEnvironment } =
            await import("@/lib/database.server");
          validateRuntimeEnvironment();
          await checkDatabaseHealth();
          return Response.json(
            { status: "ok", database: "ok", timestamp: new Date().toISOString() },
            { headers: { "cache-control": "no-store" } },
          );
        } catch (error) {
          console.error("Health check failed", error);
          return Response.json(
            { status: "unavailable", database: "unavailable" },
            { status: 503, headers: { "cache-control": "no-store" } },
          );
        }
      },
    },
  },
});
