// Lista os certificados da conta pela App Store Connect API e, com --revogar, revoga os de
// DESENVOLVIMENTO que o proprio CI criou ("Apple Development: Created via API").
//
// Por que existe: o archive assina com -allowProvisioningUpdates, e cada maquina do CI cria um
// certificado Apple Development cuja chave privada morre com a maquina. A execucao seguinte acha
// esse certificado na conta, nao tem a chave e para em "Revoke certificate". Revogar o que o CI
// deixou resolve sem tocar em distribuicao nem em certificado de pessoa.
//
// Uso: KEY_ID=... ISSUER_ID=... KEY_PATH=AuthKey.p8 node scripts/asc-certificados.mjs [--revogar]
import { pathToFileURL } from "node:url";
import { credenciaisDoAmbiente, criarCliente } from "./asc-api.mjs";

export { gerarToken } from "./asc-api.mjs";

const TIPOS_DESENVOLVIMENTO = new Set(["DEVELOPMENT", "IOS_DEVELOPMENT"]);
const MARCA_DO_CI = "Created via API";

// So o que o CI criou: tipo de desenvolvimento E a marca no nome. Distribuicao e certificado de
// pessoa (que leva o nome dela) nunca entram.
export function deixadosPeloCi(certificados) {
  return certificados.filter((c) => {
    const a = c.attributes ?? {};
    const nome = `${a.name ?? ""} ${a.displayName ?? ""}`;
    return TIPOS_DESENVOLVIMENTO.has(a.certificateType) && nome.includes(MARCA_DO_CI);
  });
}

async function principal() {
  const revogar = process.argv.includes("--revogar");
  const api = criarCliente(credenciaisDoAmbiente());

  const certificados = await api.listarTudo(
    "/v1/certificates?limit=200&fields[certificates]=name,displayName,certificateType,expirationDate",
  );
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
    await api.chamar("DELETE", `/v1/certificates/${c.id}`);
    console.log(`  revogado ${c.id} (${c.attributes?.name ?? ""})`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  principal().catch((erro) => {
    console.error(`::error::${erro.message}`);
    process.exit(1);
  });
}
