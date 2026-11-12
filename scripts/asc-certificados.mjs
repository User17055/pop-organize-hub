// Lista os certificados da conta pela App Store Connect API e, com --revogar, revoga os de
// DESENVOLVIMENTO que o proprio CI criou ("Apple Development: Created via API").
//
// Por que existe: o archive assina com -allowProvisioningUpdates, e cada maquina do CI cria um
// certificado Apple Development cuja chave privada morre com a maquina. A execucao seguinte acha
// esse certificado na conta, nao tem a chave e para em "Revoke certificate". Revogar o que o CI
// deixou resolve sem tocar em distribuicao nem em certificado de pessoa.
//
// Uso: KEY_ID=... ISSUER_ID=... KEY_PATH=AuthKey.p8 node scripts/asc-certificados.mjs [--revogar]
import crypto from "node:crypto";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const API = "https://api.appstoreconnect.apple.com";
const TIPOS_DESENVOLVIMENTO = new Set(["DEVELOPMENT", "IOS_DEVELOPMENT"]);
const MARCA_DO_CI = "Created via API";

const b64url = (buf) => Buffer.from(buf).toString("base64url");

export function gerarToken({ keyId, issuerId, chavePem, agora = Math.floor(Date.now() / 1000) }) {
  const cabecalho = b64url(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
  const corpo = b64url(
    JSON.stringify({ iss: issuerId, iat: agora, exp: agora + 600, aud: "appstoreconnect-v1" }),
  );
  const assinatura = crypto.sign("sha256", Buffer.from(`${cabecalho}.${corpo}`), {
    key: crypto.createPrivateKey(chavePem),
    dsaEncoding: "ieee-p1363",
  });
  return `${cabecalho}.${corpo}.${b64url(assinatura)}`;
}

// So o que o CI criou: tipo de desenvolvimento E a marca no nome. Distribuicao e certificado de
// pessoa (que leva o nome dela) nunca entram.
export function deixadosPeloCi(certificados) {
  return certificados.filter((c) => {
    const a = c.attributes ?? {};
    const nome = `${a.name ?? ""} ${a.displayName ?? ""}`;
    return TIPOS_DESENVOLVIMENTO.has(a.certificateType) && nome.includes(MARCA_DO_CI);
  });
}

async function chamar(token, metodo, caminho) {
  const r = await fetch(caminho.startsWith("http") ? caminho : API + caminho, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    const texto = await r.text();
    throw new Error(`${metodo} ${caminho}: HTTP ${r.status} ${texto.slice(0, 300)}`);
  }
  return r.status === 204 ? null : r.json();
}

async function listar(token) {
  const todos = [];
  let proxima =
    "/v1/certificates?limit=200&fields[certificates]=name,displayName,certificateType,expirationDate";
  while (proxima) {
    const pagina = await chamar(token, "GET", proxima);
    todos.push(...pagina.data);
    proxima = pagina.links?.next ?? null;
  }
  return todos;
}

async function principal() {
  const revogar = process.argv.includes("--revogar");
  const { KEY_ID, ISSUER_ID, KEY_PATH } = process.env;
  if (!KEY_ID || !ISSUER_ID || !KEY_PATH) {
    throw new Error("Defina KEY_ID, ISSUER_ID e KEY_PATH.");
  }
  const token = gerarToken({
    keyId: KEY_ID,
    issuerId: ISSUER_ID,
    chavePem: fs.readFileSync(KEY_PATH, "utf8"),
  });

  const certificados = await listar(token);
  const alvo = deixadosPeloCi(certificados);
  // O log do Actions e publico: o nome de certificado que nao e do CI leva a razao social.
  console.log(`Certificados na conta: ${certificados.length}`);
  for (const c of certificados) {
    const a = c.attributes ?? {};
    const nome = alvo.includes(c) ? a.name : "(nome omitido)";
    console.log(`  ${c.id}  ${a.certificateType}  ${nome}  vence ${a.expirationDate ?? "?"}`);
  }

  console.log(`Deixados pelo CI (desenvolvimento, "${MARCA_DO_CI}"): ${alvo.length}`);
  if (!revogar) {
    console.log("Sem --revogar: nada foi alterado.");
    return;
  }
  for (const c of alvo) {
    await chamar(token, "DELETE", `/v1/certificates/${c.id}`);
    console.log(`  revogado ${c.id} (${c.attributes?.name ?? ""})`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  principal().catch((erro) => {
    console.error(`::error::${erro.message}`);
    process.exit(1);
  });
}
