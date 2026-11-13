import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mobile/pop")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.text();
          if (body.length > 70_000)
            return Response.json({ error: "Solicitação muito extensa." }, { status: 413 });
          const { handleMobilePop } = await import("@/lib/pop-live.server");
          return Response.json(await handleMobilePop(request, JSON.parse(body)), {
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          const status =
            typeof error === "object" && error && "statusCode" in error
              ? Number(error.statusCode)
              : 400;
          return Response.json(
            {
              error:
                status >= 500
                  ? "Não foi possível conversar com o Pop agora."
                  : error instanceof Error
                    ? error.message
                    : "Solicitação inválida.",
            },
            { status: status || 500, headers: { "cache-control": "no-store" } },
          );
        }
      },
    },
  },
});
