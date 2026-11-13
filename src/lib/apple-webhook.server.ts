import { createHmac, timingSafeEqual } from "node:crypto";

// Avisos da App Store Connect (webhook): a Apple faz POST com um JSON e o cabecalho
// x-apple-signature = "hmacsha256=<hex>", HMAC-SHA256 do corpo bruto com o segredo combinado
// ao registrar o webhook (scripts/asc-webhook.mjs). Aqui fica so a regra: conferir a assinatura
// e transformar o evento num aviso legivel. A rota e o e-mail ficam em volta.

export const APPLE_WEBHOOK_MAX_BYTES = 64 * 1024;

export function isAppleSignatureValid(body: string, header: string | null, secret: string) {
  if (!secret || !header) return false;
  const match = /^hmacsha256=([0-9a-f]{64})$/i.exec(header.trim());
  if (!match) return false;
  const expected = createHmac("sha256", secret).update(body, "utf8").digest();
  const received = Buffer.from(match[1], "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

const versionStates: Record<string, string> = {
  PREPARE_FOR_SUBMISSION: "em preparo",
  READY_FOR_REVIEW: "pronta para revisão",
  WAITING_FOR_REVIEW: "aguardando revisão",
  IN_REVIEW: "em revisão",
  PENDING_DEVELOPER_RELEASE: "APROVADA, aguardando o lançamento manual",
  PENDING_APPLE_RELEASE: "aprovada, aguardando a Apple",
  PROCESSING_FOR_DISTRIBUTION: "processando para a loja",
  READY_FOR_DISTRIBUTION: "publicada na loja",
  ACCEPTED: "aceita",
  REJECTED: "REJEITADA pela revisão",
  METADATA_REJECTED: "REJEITADA pela revisão (só os textos/imagens)",
  DEVELOPER_REJECTED: "retirada da revisão",
  INVALID_BINARY: "build inválido",
  WAITING_FOR_EXPORT_COMPLIANCE: "aguardando conformidade de exportação",
  REPLACED_WITH_NEW_VERSION: "substituída por versão nova",
};

const externalBetaStates: Record<string, string> = {
  WAITING_FOR_BETA_REVIEW: "aguardando revisão do TestFlight",
  IN_BETA_REVIEW: "em revisão do TestFlight",
  BETA_APPROVED: "aprovado para testadores externos",
  BETA_REJECTED: "REJEITADO na revisão do TestFlight",
  READY_FOR_BETA_TESTING: "pronto para testadores externos",
  IN_BETA_TESTING: "em teste externo",
  EXPIRED: "expirado",
};

const label = (states: Record<string, string>, value: unknown) =>
  typeof value === "string" ? (states[value] ?? value) : "?";

type AppleEvent = {
  data?: {
    type?: string;
    attributes?: Record<string, unknown>;
  };
};

export type AppleNotice = { subject: string; text: string; urgent: boolean };

// null = evento que nao vale e-mail (ping de teste e tipos que nao usamos).
export function describeAppleEvent(event: AppleEvent): AppleNotice | null {
  const type = event?.data?.type;
  const attributes = event?.data?.attributes ?? {};
  const link = "Detalhes: https://appstoreconnect.apple.com/apps";
  switch (type) {
    case "appStoreVersionAppVersionStateUpdated": {
      const next = attributes.newValue;
      const urgent = [
        "REJECTED",
        "METADATA_REJECTED",
        "PENDING_DEVELOPER_RELEASE",
        "INVALID_BINARY",
      ].includes(String(next));
      return {
        subject: `App Store: versão ${label(versionStates, next)}`,
        text:
          `A versão do Pop Organize na App Store passou de "${label(versionStates, attributes.oldValue)}" ` +
          `para "${label(versionStates, next)}".` +
          (next === "PENDING_DEVELOPER_RELEASE"
            ? "\n\nO lançamento é manual: publique quando quiser pelo App Store Connect."
            : "") +
          `\n\n${link}`,
        urgent,
      };
    }
    case "buildUploadStateUpdated": {
      const failed = attributes.newState === "FAILED";
      return {
        subject: failed
          ? "App Store Connect: o envio do build FALHOU"
          : "App Store Connect: build recebido",
        text: failed
          ? `A Apple recusou o processamento de um build enviado (estado ${String(attributes.newState)}).\n\n${link}`
          : `Um build enviado terminou de subir (estado ${String(attributes.newState ?? "?")}).\n\n${link}`,
        urgent: failed,
      };
    }
    case "betaFeedbackCrashSubmissionCreated":
      return {
        subject: "TestFlight: um testador enviou um crash",
        text: `Um testador do TestFlight enviou um relatório de crash.\n\n${link}`,
        urgent: true,
      };
    case "betaFeedbackScreenshotSubmissionCreated":
      return {
        subject: "TestFlight: novo feedback com captura",
        text: `Um testador do TestFlight enviou um feedback com captura de tela.\n\n${link}`,
        urgent: false,
      };
    case "buildBetaDetailExternalBuildStateUpdated":
      return {
        subject: `TestFlight: build ${label(externalBetaStates, attributes.newExternalBuildState)}`,
        text:
          `Um build passou de "${label(externalBetaStates, attributes.oldExternalBuildState)}" para ` +
          `"${label(externalBetaStates, attributes.newExternalBuildState)}".\n\n${link}`,
        urgent: attributes.newExternalBuildState === "BETA_REJECTED",
      };
    default:
      return null;
  }
}

export function appleWebhookRecipients(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(item));
}
