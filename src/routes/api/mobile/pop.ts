import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mobile/pop")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if (!request.headers.get("authorization")?.startsWith("Bearer "))
            return Response.json({ error: "Sessão ausente." }, { status: 401 });
          const limit = 12_000_000;
          const reader = request.body?.getReader();
          const chunks: Uint8Array[] = [];
          let length = 0;
          if (reader)
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              length += value.byteLength;
              if (length > limit) {
                await reader.cancel();
                return Response.json({ error: "Solicitação muito extensa." }, { status: 413 });
              }
              chunks.push(value);
            }
          const bytes = new Uint8Array(length);
          let offset = 0;
          for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.byteLength;
          }
          const body = new TextDecoder().decode(bytes);
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
