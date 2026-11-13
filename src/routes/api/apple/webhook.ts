import { createFileRoute } from "@tanstack/react-router";

// Recebe os avisos da App Store Connect (build processado, versão mudou de estado, crash do
// TestFlight) e manda um e-mail para a equipe. Configuração no arquivo de ambiente do servidor:
//   APPLE_WEBHOOK_SECRET  o mesmo segredo registrado na Apple (scripts/asc-webhook.mjs)
//   APPLE_WEBHOOK_EMAIL   destinatários, separados por vírgula
// Assinatura inválida = 401; erro no e-mail = 502, para a Apple tentar de novo.
export const Route = createFileRoute("/api/apple/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const {
          APPLE_WEBHOOK_MAX_BYTES,
          appleWebhookRecipients,
          describeAppleEvent,
          isAppleSignatureValid,
        } = await import("@/lib/apple-webhook.server");
        const secret = process.env.APPLE_WEBHOOK_SECRET?.trim() ?? "";
        const recipients = appleWebhookRecipients(process.env.APPLE_WEBHOOK_EMAIL);
        if (!secret || recipients.length === 0) {
          return Response.json({ message: "Webhook não configurado." }, { status: 503 });
        }

        const declared = Number(request.headers.get("content-length") ?? 0);
        if (declared > APPLE_WEBHOOK_MAX_BYTES) {
          return Response.json({ message: "Corpo grande demais." }, { status: 413 });
        }
        const body = await request.text();
        if (Buffer.byteLength(body, "utf8") > APPLE_WEBHOOK_MAX_BYTES) {
          return Response.json({ message: "Corpo grande demais." }, { status: 413 });
        }
        if (!isAppleSignatureValid(body, request.headers.get("x-apple-signature"), secret)) {
          return Response.json({ message: "Assinatura inválida." }, { status: 401 });
        }

        let event: unknown;
        try {
          event = JSON.parse(body);
        } catch {
          return Response.json({ message: "JSON inválido." }, { status: 400 });
        }
        const notice = describeAppleEvent(event as Parameters<typeof describeAppleEvent>[0]);
        if (!notice) return new Response(null, { status: 204 });

        try {
          const { sendInternalNotice } = await import("@/lib/email.server");
          await sendInternalNotice(
            recipients,
            `${notice.urgent ? "[Atenção] " : ""}${notice.subject}`,
            notice.text,
          );
        } catch (error) {
          console.error("Apple webhook email failed", error);
          return Response.json({ message: "Falha ao avisar." }, { status: 502 });
        }
        return new Response(null, { status: 204 });
      },
    },
  },
});
