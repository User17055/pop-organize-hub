// Registra na App Store Connect o webhook que avisa a equipe por e-mail (rota
// /api/apple/webhook do servidor do Pop) e confere se as entregas chegam.
//
//   sem flag    so le: mostra o webhook registrado (url, eventos, ligado) e as entregas recentes
//   --aplicar   cria o webhook, ou atualiza url/eventos/segredo do que ja existe
//   --testar    pede um ping a Apple e mostra o resultado das entregas das ultimas 24 h
//
// O segredo vem de WEBHOOK_SECRET (secret APPLE_WEBHOOK_SECRET do GitHub) e e o mesmo do
// APPLE_WEBHOOK_SECRET do servidor. A Apple nao devolve o segredo; ele nunca vai para o log.
//
// Uso: KEY_ID=... ISSUER_ID=... KEY_PATH=AuthKey.p8 WEBHOOK_SECRET=... \
//        node scripts/asc-webhook.mjs [--aplicar] [--testar]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { credenciaisDoAmbiente, criarCliente, esperar } from "./asc-api.mjs";
import { lerProjeto } from "./asc-testflight.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const NOME = "pop-organize-avisos";
export const URL_PADRAO = "https://app.poporganize.com.br/api/apple/webhook";
export const EVENTOS = [
  "APP_STORE_VERSION_APP_VERSION_STATE_UPDATED",
  "BUILD_UPLOAD_STATE_UPDATED",
  "BETA_FEEDBACK_CRASH_SUBMISSION_CREATED",
  "BETA_FEEDBACK_SCREENSHOT_SUBMISSION_CREATED",
];

// O que mudar num webhook existente para ficar como queremos (o segredo sempre vai, porque a
// Apple nao o devolve e nao da para saber se e o mesmo).
export function ajustesDoWebhook(atual, url) {
  const a = atual.attributes ?? {};
  const mudar = { secret: true };
  if (a.url !== url) mudar.url = url;
  if (a.enabled !== true) mudar.enabled = true;
  const eventos = [...(a.eventTypes ?? [])].sort().join();
  if (eventos !== [...EVENTOS].sort().join()) mudar.eventTypes = EVENTOS;
  return mudar;
}

async function principal() {
  const aplicar = process.argv.includes("--aplicar");
  const testar = process.argv.includes("--testar");
  const url = process.env.WEBHOOK_URL?.trim() || URL_PADRAO;
  const segredo = process.env.WEBHOOK_SECRET?.trim() ?? "";
  if (aplicar && segredo.length < 32)
    throw new Error("WEBHOOK_SECRET ausente ou curto (minimo 32 caracteres).");

  const projeto = lerProjeto(
    fs.readFileSync(path.join(RAIZ, "ios/App/App.xcodeproj/project.pbxproj"), "utf8"),
  );
  const api = criarCliente(credenciaisDoAmbiente());
  const apps = await api.chamar(
    "GET",
    `/v1/apps?filter[bundleId]=${encodeURIComponent(projeto.bundleId)}&fields[apps]=bundleId`,
  );
  const app = (apps.data ?? []).find((a) => a.attributes?.bundleId === projeto.bundleId);
  if (!app) throw new Error("App nao encontrado pelo bundle id do projeto.");

  const webhooks = await api.listarTudo(`/v1/apps/${app.id}/webhooks?limit=50`);
  let nosso = webhooks.find((w) => w.attributes?.name === NOME);
  console.log(
    `Webhooks do app: ${webhooks.length}; o nosso (${NOME}): ${nosso ? nosso.id : "nao existe"}`,
  );
  if (nosso) {
    const a = nosso.attributes;
    console.log(
      `  url ${a.url}; ${a.enabled ? "ligado" : "DESLIGADO"}; eventos ${(a.eventTypes ?? []).join(", ")}`,
    );
  }

  if (aplicar) {
    if (!nosso) {
      nosso = (
        await api.chamar("POST", "/v1/webhooks", {
          data: {
            type: "webhooks",
            attributes: { enabled: true, eventTypes: EVENTOS, name: NOME, secret: segredo, url },
            relationships: { app: { data: { type: "apps", id: app.id } } },
          },
        })
      ).data;
      console.log(`  criado ${nosso.id} -> ${url}`);
    } else {
      const mudar = ajustesDoWebhook(nosso, url);
      const attrs = { ...mudar, secret: segredo };
      nosso = (
        await api.chamar("PATCH", `/v1/webhooks/${nosso.id}`, {
          data: { type: "webhooks", id: nosso.id, attributes: attrs },
        })
      ).data;
      console.log(`  atualizado: ${Object.keys(mudar).join(", ")}`);
    }
  }

  if (testar) {
    if (!nosso) throw new Error("Nao ha webhook para testar; rode com --aplicar antes.");
    await api.chamar("POST", "/v1/webhookPings", {
      data: {
        type: "webhookPings",
        relationships: { webhook: { data: { type: "webhooks", id: nosso.id } } },
      },
    });
    console.log("  ping pedido; esperando 20 s pela entrega");
    await esperar(20_000);
  }

  if (nosso) {
    const desde = new Date(Date.now() - 86_400_000).toISOString();
    const { data, included } = await api.listarComIncluidos(
      `/v1/webhooks/${nosso.id}/deliveries?filter[createdDateGreaterThanOrEqualTo]=${desde}&include=event&limit=20`,
    );
    const tipo = new Map(included.map((e) => [e.id, e.attributes?.eventType]));
    console.log(`Entregas nas ultimas 24 h: ${data.length}`);
    for (const d of data.slice(0, 10)) {
      const a = d.attributes ?? {};
      const evento = tipo.get(d.relationships?.event?.data?.id) ?? "?";
      console.log(
        `  ${a.createdDate ?? "?"}  ${a.deliveryState}  HTTP ${a.response?.httpStatusCode ?? "-"}  ${evento}`,
      );
    }
    if (testar && !data.some((d) => d.attributes?.deliveryState === "SUCCEEDED")) {
      throw new Error(
        "Nenhuma entrega com sucesso: conferir o servidor (segredo e destinatarios no env).",
      );
    }
  }
  if (!aplicar && !testar) console.log("Sem --aplicar: nada foi alterado.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  principal().catch((erro) => {
    console.error(`::error::${erro.message}`);
    process.exit(1);
  });
}
