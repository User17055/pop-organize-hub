// Prepara a versao da App Store pela App Store Connect API e, se pedido, envia para a revisao.
// O LANCAMENTO continua manual: a versao e criada com releaseType MANUAL e nada aqui publica.
//
//   sem flag            so le: mostra o estado da versao, o que mudaria e o que falta para enviar
//   --aplicar           cria a versao (ou usa a que esta em preparo), lancamento MANUAL, anexa o
//                       build, grava os textos de app-store/ e as informacoes de revisao
//   --enviar-revisao    faz o --aplicar e, se nada faltar, envia para a revisao da Apple
//   --mostrar-textos    imprime os textos que estao hoje na loja (sao publicos), para comparar
//
// Textos: app-store/ (ver o LEIA-ME de la). Contato e conta de revisao: secret APPSTORE_REVISAO
// (JSON), nunca no repositorio nem no log -- o log so cita o NOME do campo.
//
// Uso:
//   KEY_ID=... ISSUER_ID=... KEY_PATH=AuthKey.p8 [APPSTORE_REVISAO='{...}'] \
//     node scripts/asc-loja.mjs [--versao 1.0.16] [--build 22] [--aplicar | --enviar-revisao]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { credenciaisDoAmbiente, criarCliente } from "./asc-api.mjs";
import { lerProjeto } from "./asc-testflight.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IDIOMA = "pt-BR";
const MARCADOR_EMAIL = "<DEMO E-MAIL>";

// Estados em que a versao ainda aceita edicao (o resto ja foi enviado, aprovado ou publicado).
const EDITAVEIS = new Set([
  "PREPARE_FOR_SUBMISSION",
  "READY_FOR_REVIEW",
  "DEVELOPER_REJECTED",
  "REJECTED",
  "METADATA_REJECTED",
  "INVALID_BINARY",
]);

// Campo da localizacao da versao -> arquivo e limite.
const TEXTOS = [
  { campo: "description", arquivo: "pt-BR/descricao.txt", limite: 4000 },
  { campo: "keywords", arquivo: "pt-BR/palavras-chave.txt", limite: 100 },
  { campo: "promotionalText", arquivo: "pt-BR/texto-promocional.txt", limite: 170 },
  { campo: "supportUrl", arquivo: "pt-BR/url-suporte.txt", limite: 2000 },
];
const OBRIGATORIOS_TEXTO = ["whatsNew", "description", "keywords", "supportUrl"];
const CAMPOS_REVISAO = [
  "contactFirstName",
  "contactLastName",
  "contactPhone",
  "contactEmail",
  "demoAccountName",
  "demoAccountPassword",
];

// --- partes puras (testadas em testes-recorrencia/test-asc-loja.mjs) ---

export function lerArgumentos(argv) {
  const valor = (nome) => {
    const i = argv.indexOf(nome);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const build = valor("--build");
  if (build !== undefined && !/^\d+$/.test(build)) throw new Error("--build tem de ser numero.");
  const versao = valor("--versao");
  if (versao !== undefined && !/^\d+(\.\d+){0,2}$/.test(versao))
    throw new Error("--versao invalida.");
  const enviar = argv.includes("--enviar-revisao");
  return {
    versao,
    build,
    aplicar: enviar || argv.includes("--aplicar"),
    enviar,
    mostrarTextos: argv.includes("--mostrar-textos"),
  };
}

const normalizar = (s) => (s ?? "").replace(/\r\n/g, "\n").trim();

// Le os textos de app-store/. Arquivo ausente = campo fora (fica como esta na loja).
export function lerTextos(pasta, versao, ler = (p) => fs.readFileSync(p, "utf8")) {
  const existe = (p) => {
    try {
      return { ok: true, texto: ler(p) };
    } catch {
      return { ok: false };
    }
  };
  const desejado = {};
  const itens = [
    { campo: "whatsNew", arquivo: `novidades/${versao}.txt`, limite: 4000 },
    ...TEXTOS,
  ];
  for (const { campo, arquivo, limite } of itens) {
    const r = existe(path.join(pasta, arquivo));
    if (!r.ok) continue;
    const texto = normalizar(r.texto);
    if (!texto) continue;
    if (texto.length > limite)
      throw new Error(`${arquivo}: ${texto.length} caracteres, limite ${limite}.`);
    desejado[campo] = texto;
  }
  const notas = existe(path.join(pasta, "notas-revisao.txt"));
  return { desejado, notasModelo: notas.ok ? normalizar(notas.texto) : null };
}

export function estadoDaVersao(v) {
  return v.attributes?.appVersionState ?? v.attributes?.appStoreState ?? "?";
}

export function decidirVersao(versoes, alvo) {
  const mesma = versoes.find((v) => v.attributes?.versionString === alvo);
  if (mesma) {
    const estado = estadoDaVersao(mesma);
    if (EDITAVEIS.has(estado)) return { acao: "usar", versao: mesma };
    return { acao: "parar", versao: mesma, motivo: `a versao ${alvo} ja esta em ${estado}` };
  }
  const outra = versoes.find((v) => EDITAVEIS.has(estadoDaVersao(v)));
  if (outra) {
    return {
      acao: "parar",
      motivo: `a versao ${outra.attributes?.versionString} esta em preparo (${estadoDaVersao(outra)}); resolver na mao`,
    };
  }
  return { acao: "criar" };
}

// Campos cujo valor desejado difere do atual (comparando sem \r e espacos das pontas).
export function diferencas(atual, desejado) {
  return Object.keys(desejado).filter(
    (k) => normalizar(String(atual?.[k] ?? "")) !== normalizar(String(desejado[k])),
  );
}

// Informacoes de revisao desejadas, a partir do secret. Sem secret: null (fica como esta).
export function revisaoDesejada(segredo, notasModelo) {
  if (!segredo || !segredo.trim()) return null;
  let dados;
  try {
    dados = JSON.parse(segredo);
  } catch {
    throw new Error("APPSTORE_REVISAO nao e JSON valido.");
  }
  const faltam = CAMPOS_REVISAO.filter((c) => !String(dados[c] ?? "").trim());
  if (faltam.length) throw new Error(`APPSTORE_REVISAO sem: ${faltam.join(", ")}.`);
  const desejado = { demoAccountRequired: true };
  for (const c of CAMPOS_REVISAO) desejado[c] = String(dados[c]).trim();
  if (notasModelo)
    desejado.notes = notasModelo.split(MARCADOR_EMAIL).join(desejado.demoAccountName);
  return desejado;
}

export function faltasNaRevisao(atual) {
  if (!atual) return ["informacoes de revisao inexistentes"];
  const exigidos = ["contactFirstName", "contactLastName", "contactPhone", "contactEmail", "notes"];
  if (atual.demoAccountRequired) exigidos.push("demoAccountName", "demoAccountPassword");
  const faltam = exigidos.filter((c) => !String(atual[c] ?? "").trim());
  if (String(atual.notes ?? "").includes(MARCADOR_EMAIL))
    faltam.push("notes (marcador do e-mail sem trocar)");
  return faltam;
}

// Tudo o que impede o envio. Lista vazia = pode enviar.
export function pendenciasParaEnviar({
  versao,
  build,
  buildEsperado,
  localizacao,
  revisao,
  privacidade,
}) {
  const p = [];
  if (versao.attributes?.releaseType !== "MANUAL") p.push("lancamento nao esta MANUAL");
  if (!build) p.push("nenhum build anexado");
  else {
    if (build.attributes?.processingState !== "VALID")
      p.push(`build em ${build.attributes?.processingState}`);
    if (buildEsperado && build.attributes?.version !== buildEsperado) {
      p.push(`build anexado e o ${build.attributes?.version}, nao o ${buildEsperado}`);
    }
  }
  if (!localizacao) p.push(`sem localizacao ${IDIOMA}`);
  else {
    for (const c of OBRIGATORIOS_TEXTO) {
      if (!normalizar(localizacao.attributes?.[c])) p.push(`texto vazio: ${c}`);
    }
  }
  for (const f of faltasNaRevisao(revisao?.attributes ?? null)) p.push(`revisao: ${f}`);
  if (!privacidade) p.push("URL da politica de privacidade vazia na ficha do app");
  return p;
}

// --- execucao ---

// O teste chama executar() com uma Apple falsa; principal() so monta as entradas reais.
export async function executar({ args, api, projeto, textos, segredoRevisao }) {
  const alvo = args.versao ?? projeto.versao;
  const { desejado, notasModelo } = textos(alvo);
  const revisaoQuer = revisaoDesejada(segredoRevisao, notasModelo);
  const modo = args.enviar
    ? "APLICAR E ENVIAR PARA REVISAO"
    : args.aplicar
      ? "APLICAR"
      : "so leitura";
  console.log(`Versao ${alvo} da App Store (${modo})`);
  if (!desejado.whatsNew)
    console.log(`::warning::Sem app-store/novidades/${alvo}.txt: as novidades ficam como estao.`);

  const apps = await api.chamar(
    "GET",
    `/v1/apps?filter[bundleId]=${encodeURIComponent(projeto.bundleId)}&fields[apps]=bundleId`,
  );
  const app = (apps.data ?? []).find((a) => a.attributes?.bundleId === projeto.bundleId);
  if (!app) throw new Error("App nao encontrado pelo bundle id do projeto.");

  // 1. Versao
  const versoes = await api.listarTudo(
    `/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS` +
      "&fields[appStoreVersions]=versionString,appVersionState,appStoreState,releaseType&limit=50",
  );
  const naLoja = versoes.find((v) =>
    ["READY_FOR_DISTRIBUTION", "READY_FOR_SALE"].includes(estadoDaVersao(v)),
  );
  console.log(`Na loja agora: ${naLoja ? naLoja.attributes.versionString : "nenhuma"}`);
  const decisao = decidirVersao(versoes, alvo);
  // Lendo, uma versao ja enviada ainda pode ser inspecionada; escrevendo, nunca.
  if (decisao.acao === "parar" && (args.aplicar || !decisao.versao))
    throw new Error(decisao.motivo);
  if (decisao.acao === "parar") console.log(`::warning::${decisao.motivo}; so inspecionando.`);
  let versao = decisao.versao;
  if (decisao.acao === "criar") {
    if (!args.aplicar) {
      console.log(`Versao ${alvo}: nao existe; criaria com lancamento MANUAL.`);
      console.log("Sem --aplicar: nada foi alterado (o resto depende da versao existir).");
      return;
    }
    const criada = await api.chamar("POST", "/v1/appStoreVersions", {
      data: {
        type: "appStoreVersions",
        attributes: { platform: "IOS", versionString: alvo, releaseType: "MANUAL" },
        relationships: { app: { data: { type: "apps", id: app.id } } },
      },
    });
    versao = criada.data;
    console.log(`Versao ${alvo}: criada (${versao.id}), lancamento MANUAL`);
  } else {
    console.log(
      `Versao ${alvo}: ${estadoDaVersao(versao)}, lancamento ${versao.attributes?.releaseType}`,
    );
  }
  if (versao.attributes?.releaseType !== "MANUAL") {
    console.log(`  lancamento: ${args.aplicar ? "trocado" : "trocaria"} para MANUAL`);
    if (args.aplicar) {
      const r = await api.chamar("PATCH", `/v1/appStoreVersions/${versao.id}`, {
        data: { type: "appStoreVersions", id: versao.id, attributes: { releaseType: "MANUAL" } },
      });
      versao = r.data;
    }
  }

  // 2. Build
  const camposBuild = "fields[builds]=version,processingState,expired";
  let build =
    (await api.chamar("GET", `/v1/appStoreVersions/${versao.id}/build?${camposBuild}`)).data ??
    null;
  console.log(
    `Build anexado: ${build ? `${build.attributes.version} (${build.attributes.processingState})` : "nenhum"}`,
  );
  if (args.build && build?.attributes?.version !== args.build) {
    const candidatos = await api.listarTudo(
      `/v1/builds?filter[app]=${app.id}&filter[version]=${args.build}` +
        `&filter[preReleaseVersion.version]=${encodeURIComponent(alvo)}&filter[preReleaseVersion.platform]=IOS` +
        `&${camposBuild}&limit=10`,
    );
    const novo = candidatos.find(
      (b) => b.attributes?.processingState === "VALID" && !b.attributes?.expired,
    );
    if (!novo) throw new Error(`Build ${args.build} da versao ${alvo} nao esta VALID na Apple.`);
    console.log(`  ${args.aplicar ? "anexado" : "anexaria"} o build ${args.build}`);
    if (args.aplicar) {
      await api.chamar("PATCH", `/v1/appStoreVersions/${versao.id}/relationships/build`, {
        data: { type: "builds", id: novo.id },
      });
      build = novo;
    }
  }

  // 3. Textos pt-BR
  const localizacoes = await api.listarTudo(
    `/v1/appStoreVersions/${versao.id}/appStoreVersionLocalizations` +
      "?fields[appStoreVersionLocalizations]=locale,description,keywords,promotionalText,supportUrl,whatsNew&limit=50",
  );
  let localizacao = localizacoes.find((l) => l.attributes?.locale === IDIOMA);
  if (!localizacao) throw new Error(`A versao nao tem localizacao ${IDIOMA}.`);
  if (args.mostrarTextos) {
    for (const c of ["whatsNew", "promotionalText", "keywords", "supportUrl", "description"]) {
      console.log(`----- ${c} na loja -----\n${localizacao.attributes?.[c] ?? ""}`);
    }
  }
  const mudarTexto = diferencas(localizacao.attributes, desejado);
  for (const c of Object.keys(desejado)) {
    const atual = normalizar(localizacao.attributes?.[c]).length;
    const igual = !mudarTexto.includes(c);
    console.log(
      `  ${c}: ${igual ? "igual ao app-store/" : `diferente (loja ${atual}, arquivo ${desejado[c].length} caracteres)`}`,
    );
  }
  if (mudarTexto.length && args.aplicar) {
    const attrs = Object.fromEntries(mudarTexto.map((c) => [c, desejado[c]]));
    const r = await api.chamar("PATCH", `/v1/appStoreVersionLocalizations/${localizacao.id}`, {
      data: { type: "appStoreVersionLocalizations", id: localizacao.id, attributes: attrs },
    });
    localizacao = r.data;
    console.log(`  gravado: ${mudarTexto.join(", ")}`);
  }

  // 4. Informacoes de revisao (so nomes de campo no log)
  let revisao = null;
  try {
    revisao =
      (await api.chamar("GET", `/v1/appStoreVersions/${versao.id}/appStoreReviewDetail`)).data ??
      null;
  } catch (erro) {
    if (erro.status !== 404) throw erro;
  }
  if (revisaoQuer) {
    const mudar = revisao ? diferencas(revisao.attributes, revisaoQuer) : Object.keys(revisaoQuer);
    console.log(
      `Revisao: ${mudar.length ? `${args.aplicar ? "atualizando" : "atualizaria"} ${mudar.join(", ")}` : "igual ao secret"}`,
    );
    if (mudar.length && args.aplicar) {
      const attrs = Object.fromEntries(mudar.map((c) => [c, revisaoQuer[c]]));
      const r = revisao
        ? await api.chamar("PATCH", `/v1/appStoreReviewDetails/${revisao.id}`, {
            data: { type: "appStoreReviewDetails", id: revisao.id, attributes: attrs },
          })
        : await api.chamar("POST", "/v1/appStoreReviewDetails", {
            data: {
              type: "appStoreReviewDetails",
              attributes: attrs,
              relationships: {
                appStoreVersion: { data: { type: "appStoreVersions", id: versao.id } },
              },
            },
          });
      revisao = r.data;
    }
  } else {
    console.log("Revisao: sem o secret APPSTORE_REVISAO; fica como esta na loja.");
  }

  // 5. Ficha do app: so confere a URL de privacidade (exigida no envio)
  const infos = await api.listarTudo(`/v1/apps/${app.id}/appInfos?fields[appInfos]=state&limit=10`);
  let privacidade = false;
  for (const info of infos) {
    const locs = await api.listarTudo(
      `/v1/appInfos/${info.id}/appInfoLocalizations?fields[appInfoLocalizations]=locale,privacyPolicyUrl&limit=50`,
    );
    if (
      locs.some(
        (l) => l.attributes?.locale === IDIOMA && normalizar(l.attributes?.privacyPolicyUrl),
      )
    )
      privacidade = true;
  }

  // 6. Pendencias e envio
  const pendencias = pendenciasParaEnviar({
    versao,
    build,
    buildEsperado: args.build,
    localizacao,
    revisao,
    privacidade,
  });
  if (pendencias.length) {
    console.log(`Falta para enviar (${pendencias.length}):`);
    for (const p of pendencias) console.log(`  - ${p}`);
  } else {
    console.log("Pronta para enviar para a revisao.");
  }
  if (!args.enviar) {
    console.log(
      args.aplicar
        ? "Preenchido. Nao enviado (sem --enviar-revisao)."
        : "Sem --aplicar: nada foi alterado.",
    );
    return;
  }
  if (pendencias.length) throw new Error("Nao enviado: resolver as pendencias acima.");

  const abertas = await api.listarTudo(
    `/v1/reviewSubmissions?filter[app]=${app.id}&filter[platform]=IOS` +
      "&filter[state]=READY_FOR_REVIEW,UNRESOLVED_ISSUES,WAITING_FOR_REVIEW,IN_REVIEW&fields[reviewSubmissions]=state,platform&limit=20",
  );
  const emAndamento = abertas.find((s) =>
    ["WAITING_FOR_REVIEW", "IN_REVIEW"].includes(s.attributes?.state),
  );
  if (emAndamento)
    throw new Error(`Ja ha um envio em ${emAndamento.attributes.state}; nada foi enviado.`);
  let envio =
    abertas.find((s) => s.attributes?.state === "UNRESOLVED_ISSUES") ??
    abertas.find((s) => s.attributes?.state === "READY_FOR_REVIEW");
  if (!envio) {
    envio = (
      await api.chamar("POST", "/v1/reviewSubmissions", {
        data: {
          type: "reviewSubmissions",
          attributes: { platform: "IOS" },
          relationships: { app: { data: { type: "apps", id: app.id } } },
        },
      })
    ).data;
    console.log(`Envio criado (${envio.id})`);
  } else {
    console.log(`Usando o envio ${envio.id} (${envio.attributes.state})`);
  }
  const itens = await api.listarTudo(
    `/v1/reviewSubmissions/${envio.id}/items?include=appStoreVersion&fields[reviewSubmissionItems]=state,appStoreVersion&limit=50`,
  );
  const jaTem = itens.some((i) => i.relationships?.appStoreVersion?.data?.id === versao.id);
  if (!jaTem) {
    await api.chamar("POST", "/v1/reviewSubmissionItems", {
      data: {
        type: "reviewSubmissionItems",
        relationships: {
          reviewSubmission: { data: { type: "reviewSubmissions", id: envio.id } },
          appStoreVersion: { data: { type: "appStoreVersions", id: versao.id } },
        },
      },
    });
    console.log("  versao incluida no envio");
  }
  const enviado = await api.chamar("PATCH", `/v1/reviewSubmissions/${envio.id}`, {
    data: { type: "reviewSubmissions", id: envio.id, attributes: { submitted: true } },
  });
  console.log(
    `ENVIADO para a revisao: ${enviado.data?.attributes?.state ?? "?"}. Lancamento MANUAL depois da aprovacao.`,
  );
}

async function principal() {
  const projeto = lerProjeto(
    fs.readFileSync(path.join(RAIZ, "ios/App/App.xcodeproj/project.pbxproj"), "utf8"),
  );
  await executar({
    args: lerArgumentos(process.argv.slice(2)),
    api: criarCliente(credenciaisDoAmbiente()),
    projeto,
    textos: (versao) => lerTextos(path.join(RAIZ, "app-store"), versao),
    segredoRevisao: process.env.APPSTORE_REVISAO,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  principal().catch((erro) => {
    console.error(`::error::${erro.message}`);
    process.exit(1);
  });
}
