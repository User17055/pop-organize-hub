// Cliente minimo da App Store Connect API, usado pelos scripts asc-*.mjs.
//
// Sem dependencias: o token e um JWT ES256 assinado com a chave .p8 (node:crypto) e as chamadas
// usam o fetch do Node 22. O token vale 10 minutos e e renovado sozinho, porque esperar o
// processamento de um build passa disso.
//
// O log do Actions e publico (repositorio publico): quem usa este cliente nao imprime corpo de
// resposta inteiro, so os campos que precisa.
import crypto from "node:crypto";
import fs from "node:fs";

export const API = "https://api.appstoreconnect.apple.com";
const VALIDADE = 600;

const b64url = (buf) => Buffer.from(buf).toString("base64url");

export function gerarToken({ keyId, issuerId, chavePem, agora = Math.floor(Date.now() / 1000) }) {
  const cabecalho = b64url(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
  const corpo = b64url(
    JSON.stringify({ iss: issuerId, iat: agora, exp: agora + VALIDADE, aud: "appstoreconnect-v1" }),
  );
  const assinatura = crypto.sign("sha256", Buffer.from(`${cabecalho}.${corpo}`), {
    key: crypto.createPrivateKey(chavePem),
    dsaEncoding: "ieee-p1363",
  });
  return `${cabecalho}.${corpo}.${b64url(assinatura)}`;
}

// Le KEY_ID, ISSUER_ID e KEY_PATH do ambiente (o mesmo contrato do asc-certificados.mjs).
export function credenciaisDoAmbiente(env = process.env) {
  const { KEY_ID, ISSUER_ID, KEY_PATH } = env;
  if (!KEY_ID || !ISSUER_ID || !KEY_PATH) {
    throw new Error("Defina KEY_ID, ISSUER_ID e KEY_PATH.");
  }
  return { keyId: KEY_ID, issuerId: ISSUER_ID, chavePem: fs.readFileSync(KEY_PATH, "utf8") };
}

// fazerFetch e agora existem para o teste trocar a rede e o relogio.
export function criarCliente(credenciais, { fazerFetch = fetch, agora = () => Date.now() } = {}) {
  let token = null;
  let emitidoEm = 0;

  function tokenValido() {
    const segundos = Math.floor(agora() / 1000);
    // Renova com folga de 2 minutos antes de vencer.
    if (!token || segundos - emitidoEm > VALIDADE - 120) {
      token = gerarToken({ ...credenciais, agora: segundos });
      emitidoEm = segundos;
    }
    return token;
  }

  async function chamar(metodo, caminho, corpo) {
    const headers = { Authorization: `Bearer ${tokenValido()}` };
    if (corpo !== undefined) headers["Content-Type"] = "application/json";
    const r = await fazerFetch(caminho.startsWith("http") ? caminho : API + caminho, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    if (!r.ok) {
      const texto = await r.text();
      const erro = new Error(
        `${metodo} ${caminho.split("?")[0]}: HTTP ${r.status} ${resumirErro(texto)}`,
      );
      erro.status = r.status;
      throw erro;
    }
    return r.status === 204 ? null : r.json();
  }

  // Segue links.next ate o fim e devolve todos os itens de data.
  async function listarTudo(caminho) {
    const todos = [];
    let proxima = caminho;
    while (proxima) {
      const pagina = await chamar("GET", proxima);
      todos.push(...(pagina.data ?? []));
      proxima = pagina.links?.next ?? null;
    }
    return todos;
  }

  return { chamar, listarTudo };
}

// A Apple responde { errors: [{ code, title, detail }] }. So o codigo e o titulo vao para o log:
// o detail as vezes repete valores que mandamos.
export function resumirErro(texto) {
  try {
    const j = JSON.parse(texto);
    if (Array.isArray(j.errors)) {
      return j.errors.map((e) => [e.code, e.title].filter(Boolean).join(": ")).join(" | ");
    }
  } catch {
    // corpo que nao e JSON: cai no corte abaixo
  }
  return texto.slice(0, 200);
}

export const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));
