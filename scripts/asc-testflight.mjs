// Leva um build recem-enviado ate os testadores do TestFlight, pela App Store Connect API:
//
//   1. espera a Apple terminar de processar (processingState VALID);
//   2. confere a conformidade de criptografia (o Info.plist declara que nao usa criptografia
//      nao isenta; se a Apple nao tiver aplicado, aplica a mesma resposta);
//   3. grava o "O que testar" em pt-BR, se vier texto;
//   4. libera o build para os grupos INTERNOS (grupo com acesso a todos os builds ja recebe
//      sozinho; grupo externo fica de fora, porque pede revisao da Apple).
//
// Sem --aplicar, so le e conta o que faria. Nada aqui envia para a App Store.
//
// Uso:
//   KEY_ID=... ISSUER_ID=... KEY_PATH=AuthKey.p8 [O_QUE_TESTAR="..."] \
//     node scripts/asc-testflight.mjs --build 22 [--versao 1.0.16] [--esperar-min 60] [--aplicar]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { credenciaisDoAmbiente, criarCliente, esperar } from "./asc-api.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PBXPROJ = path.join(RAIZ, "ios/App/App.xcodeproj/project.pbxproj");
const INFO_PLIST = path.join(RAIZ, "ios/App/App/Info.plist");
const IDIOMA = "pt-BR";
const LIMITE_O_QUE_TESTAR = 4000;
const INTERVALO_MS = 30_000;

// --- partes puras (testadas em testes-recorrencia/test-asc-testflight.mjs) ---

export function lerArgumentos(argv) {
  const valor = (nome) => {
    const i = argv.indexOf(nome);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const build = valor("--build");
  if (!build || !/^\d+$/.test(build)) throw new Error("Informe --build <numero>.");
  const esperarMin = Number(valor("--esperar-min") ?? 60);
  if (!Number.isFinite(esperarMin) || esperarMin < 0) throw new Error("--esperar-min invalido.");
  return { build, versao: valor("--versao"), esperarMin, aplicar: argv.includes("--aplicar") };
}

// MARKETING_VERSION e bundle id do projeto Xcode. Os dois alvos (Debug e Release) tem de
// concordar; se nao concordarem, melhor parar do que escolher um.
export function lerProjeto(texto) {
  const unico = (chave) => {
    const valores = [...texto.matchAll(new RegExp(`${chave} = ([^;]+);`, "g"))].map((m) =>
      m[1].trim().replace(/^"|"$/g, ""),
    );
    const distintos = [...new Set(valores)];
    if (distintos.length !== 1)
      throw new Error(`${chave}: esperado 1 valor, achei ${distintos.length}.`);
    return distintos[0];
  };
  return { versao: unico("MARKETING_VERSION"), bundleId: unico("PRODUCT_BUNDLE_IDENTIFIER") };
}

export function declaraSemCriptografia(infoPlist) {
  return /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/.test(infoPlist);
}

// O que fazer com um build conforme o estado do processamento.
export function situacaoDoBuild(builds) {
  if (builds.length === 0) return { tipo: "ausente" };
  if (builds.length > 1)
    return { tipo: "erro", motivo: `${builds.length} builds com o mesmo numero e versao` };
  const b = builds[0];
  const estado = b.attributes?.processingState;
  if (b.attributes?.expired) return { tipo: "erro", motivo: "build expirado" };
  if (estado === "VALID") return { tipo: "pronto", build: b };
  if (estado === "PROCESSING") return { tipo: "processando", build: b };
  return { tipo: "erro", motivo: `processamento terminou em ${estado ?? "?"}` };
}

export function decidirCriptografia(build, plistSemCriptografia) {
  const atual = build.attributes?.usesNonExemptEncryption;
  if (atual === false) return { acao: "nada", motivo: "ja declarado: sem criptografia nao isenta" };
  if (atual === true)
    return { acao: "parar", motivo: "o build declara criptografia nao isenta: responder na mao" };
  if (!plistSemCriptografia)
    return { acao: "parar", motivo: "Info.plist nao declara ITSAppUsesNonExemptEncryption=false" };
  return { acao: "declarar", motivo: "Apple ainda sem resposta; aplicar a do Info.plist (false)" };
}

export function decidirOQueTestar(texto, localizacoes) {
  const limpo = (texto ?? "").replace(/\r\n/g, "\n").trim();
  if (!limpo) return { acao: "nada", motivo: "sem texto de O que testar" };
  if (limpo.length > LIMITE_O_QUE_TESTAR) {
    throw new Error(
      `O que testar tem ${limpo.length} caracteres; o limite da Apple e ${LIMITE_O_QUE_TESTAR}.`,
    );
  }
  const existente = localizacoes.find((l) => l.attributes?.locale === IDIOMA);
  if (!existente) return { acao: "criar", texto: limpo };
  if ((existente.attributes?.whatsNew ?? "").trim() === limpo)
    return { acao: "nada", motivo: "texto igual ao que ja esta" };
  return { acao: "atualizar", id: existente.id, texto: limpo };
}

export function planejarGrupos(grupos) {
  const internos = grupos.filter((g) => g.attributes?.isInternalGroup === true);
  return {
    automaticos: internos.filter((g) => g.attributes?.hasAccessToAllBuilds === true),
    adicionar: internos.filter((g) => g.attributes?.hasAccessToAllBuilds !== true),
    externos: grupos.length - internos.length,
  };
}

// --- execucao ---

async function principal() {
  const args = lerArgumentos(process.argv.slice(2));
  const projeto = lerProjeto(fs.readFileSync(PBXPROJ, "utf8"));
  const versao = args.versao ?? projeto.versao;
  const api = criarCliente(credenciaisDoAmbiente());
  const modo = args.aplicar ? "APLICAR" : "so leitura";
  console.log(`Build ${args.build} da versao ${versao} (${modo})`);

  const apps = await api.chamar(
    "GET",
    `/v1/apps?filter[bundleId]=${encodeURIComponent(projeto.bundleId)}&fields[apps]=bundleId`,
  );
  const app = (apps.data ?? []).find((a) => a.attributes?.bundleId === projeto.bundleId);
  if (!app) throw new Error("App nao encontrado pelo bundle id do projeto.");

  // 1. Processamento
  const consulta =
    `/v1/builds?filter[app]=${app.id}&filter[version]=${args.build}` +
    `&filter[preReleaseVersion.version]=${encodeURIComponent(versao)}&filter[preReleaseVersion.platform]=IOS` +
    "&fields[builds]=version,processingState,usesNonExemptEncryption,expired,uploadedDate&limit=10";
  const prazo = Date.now() + args.esperarMin * 60_000;
  let situacao;
  for (;;) {
    situacao = situacaoDoBuild(await api.listarTudo(consulta));
    if (situacao.tipo === "erro") throw new Error(situacao.motivo);
    if (situacao.tipo === "pronto") break;
    if (Date.now() >= prazo) {
      const msg =
        situacao.tipo === "ausente" ? "a Apple ainda nao lista o build" : "ainda processando";
      if (args.esperarMin === 0) {
        console.log(`Processamento: ${msg}. Sem espera pedida; nada mais a fazer agora.`);
        return;
      }
      throw new Error(`Passaram ${args.esperarMin} min e ${msg}.`);
    }
    console.log(
      `  ${situacao.tipo === "ausente" ? "build ainda nao aparece" : "processando"}; nova consulta em 30 s`,
    );
    await esperar(INTERVALO_MS);
  }
  const build = situacao.build;
  console.log(`Processamento: VALID (build ${build.id})`);

  // 2. Criptografia
  const cripto = decidirCriptografia(
    build,
    declaraSemCriptografia(fs.readFileSync(INFO_PLIST, "utf8")),
  );
  console.log(`Criptografia: ${cripto.motivo}`);
  if (cripto.acao === "parar")
    throw new Error("Conformidade de criptografia pendente; nada foi distribuido.");
  if (cripto.acao === "declarar" && args.aplicar) {
    await api.chamar("PATCH", `/v1/builds/${build.id}`, {
      data: { type: "builds", id: build.id, attributes: { usesNonExemptEncryption: false } },
    });
    console.log("  declarado: sem criptografia nao isenta");
  }

  // 3. O que testar
  const localizacoes = await api.listarTudo(
    `/v1/builds/${build.id}/betaBuildLocalizations?fields[betaBuildLocalizations]=locale,whatsNew&limit=50`,
  );
  const oQue = decidirOQueTestar(process.env.O_QUE_TESTAR, localizacoes);
  console.log(
    `O que testar (${IDIOMA}): ${oQue.acao === "nada" ? oQue.motivo : `${oQue.acao}, ${oQue.texto.length} caracteres`}`,
  );
  if (args.aplicar && oQue.acao === "criar") {
    await api.chamar("POST", "/v1/betaBuildLocalizations", {
      data: {
        type: "betaBuildLocalizations",
        attributes: { locale: IDIOMA, whatsNew: oQue.texto },
        relationships: { build: { data: { type: "builds", id: build.id } } },
      },
    });
    console.log("  gravado");
  } else if (args.aplicar && oQue.acao === "atualizar") {
    await api.chamar("PATCH", `/v1/betaBuildLocalizations/${oQue.id}`, {
      data: { type: "betaBuildLocalizations", id: oQue.id, attributes: { whatsNew: oQue.texto } },
    });
    console.log("  atualizado");
  }

  // 4. Grupos internos (nomes fora do log publico: so o id)
  const grupos = await api.listarTudo(
    `/v1/apps/${app.id}/betaGroups?fields[betaGroups]=isInternalGroup,hasAccessToAllBuilds&limit=200`,
  );
  const plano = planejarGrupos(grupos);
  console.log(
    `Grupos: ${plano.automaticos.length} interno(s) recebem todo build sozinhos, ` +
      `${plano.adicionar.length} interno(s) a liberar, ${plano.externos} externo(s) fora (pedem revisao).`,
  );
  for (const g of plano.adicionar) {
    if (!args.aplicar) {
      console.log(`  liberaria para o grupo ${g.id}`);
      continue;
    }
    await api.chamar("POST", `/v1/betaGroups/${g.id}/relationships/builds`, {
      data: [{ type: "builds", id: build.id }],
    });
    console.log(`  liberado para o grupo ${g.id}`);
  }
  if (plano.automaticos.length + plano.adicionar.length === 0) {
    console.log("::warning::Nenhum grupo interno: o build fica no TestFlight sem testador.");
  }
  console.log(args.aplicar ? "Pronto." : "Sem --aplicar: nada foi alterado.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  principal().catch((erro) => {
    console.error(`::error::${erro.message}`);
    process.exit(1);
  });
}
