// Relatorio de saude do app pela App Store Connect API, para ler sem abrir o Xcode:
//
//   1. metricas de desempenho e energia dos usuarios da loja (abertura, travamentos, memoria,
//      encerramentos, disco, bateria), versao a versao;
//   2. assinaturas de diagnostico dos ultimos builds (travamentos, gravacoes em disco e
//      aberturas lentas agrupados pela pilha), com o quadro culpado;
//   3. crashes enviados pelos testadores do TestFlight, com o trecho que importa do log.
//
// Crash de usuario da loja NAO vem por esta API (a Apple so os entrega no Xcode Organizer).
//
// O log do Actions e publico: ele so recebe contagens. O relatorio vai para um arquivo (artefato)
// e deixa de fora e-mail, nome e comentario do testador.
//
// Uso: KEY_ID=... ISSUER_ID=... KEY_PATH=AuthKey.p8 \
//        node scripts/asc-diagnosticos.mjs [--saida diagnosticos] [--dias 30] [--builds 3]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { credenciaisDoAmbiente, criarCliente } from "./asc-api.mjs";
import { lerProjeto } from "./asc-testflight.mjs";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NOMES_CATEGORIA = {
  LAUNCH: "Abertura",
  HANG: "Travamentos",
  MEMORY: "Memoria",
  TERMINATION: "Encerramentos",
  DISK: "Disco",
  BATTERY: "Bateria",
  ANIMATION: "Animacao",
  STORAGE: "Armazenamento",
};
const NOMES_DIAGNOSTICO = {
  HANGS: "Travamento",
  DISK_WRITES: "Gravacao em disco",
  LAUNCHES: "Abertura lenta",
};

// --- partes puras (testadas em testes-recorrencia/test-asc-diagnosticos.mjs) ---

export function lerArgumentos(argv) {
  const valor = (nome, padrao) => {
    const i = argv.indexOf(nome);
    return i >= 0 ? argv[i + 1] : padrao;
  };
  const dias = Number(valor("--dias", 30));
  const builds = Number(valor("--builds", 3));
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) throw new Error("--dias entre 1 e 365.");
  if (!Number.isInteger(builds) || builds < 1 || builds > 20)
    throw new Error("--builds entre 1 e 20.");
  return { saida: valor("--saida", "diagnosticos"), dias, builds };
}

// xcodeMetrics -> linhas { categoria, metrica, unidade, percentil, pontos: [{versao, valor, meta}] }.
export function linhasDeMetricas(xcode) {
  const linhas = [];
  for (const produto of xcode?.productData ?? []) {
    for (const cat of produto.metricCategories ?? []) {
      for (const m of cat.metrics ?? []) {
        for (const ds of m.datasets ?? []) {
          const pontos = (ds.points ?? []).map((p) => ({
            versao: p.version,
            valor: p.value,
            meta: p.goal ?? "",
          }));
          if (!pontos.length) continue;
          linhas.push({
            categoria: cat.identifier,
            metrica: m.identifier,
            unidade: m.unit?.displayName ?? "",
            percentil: (ds.filterCriteria?.percentile ?? "")
              .replace("percentile.", "p")
              .replace("fifty", "50")
              .replace("ninety", "90"),
            pontos,
          });
        }
      }
    }
  }
  return linhas;
}

// Do log de crash, so o que serve para triagem: tipo da excecao, motivo e os quadros da thread
// que caiu (ate 12). O resto continua no App Store Connect.
export function resumirCrash(logText) {
  const linhas = (logText ?? "").replace(/\r\n/g, "\n").split("\n");
  const campo = (rotulo) => {
    const l = linhas.find((x) => x.startsWith(rotulo));
    return l ? l.slice(rotulo.length).trim() : "";
  };
  const inicio = linhas.findIndex((l) => /^Thread \d+ Crashed/.test(l));
  const quadros = [];
  if (inicio >= 0) {
    for (const l of linhas.slice(inicio + 1)) {
      if (!l.trim()) break;
      quadros.push(l.trim());
      if (quadros.length === 12) break;
    }
  }
  // Formato que nao reconheco: as primeiras linhas, para nao perder o crash.
  if (!quadros.length && !campo("Exception Type:")) {
    quadros.push(
      ...linhas
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 20),
    );
  }
  return {
    excecao: campo("Exception Type:"),
    motivo: campo("Termination Reason:") || campo("Exception Reason:"),
    quadros,
  };
}

// Quadro culpado de uma assinatura (isBlameFrame), procurando na arvore de pilhas.
export function quadroCulpado(logs) {
  const pilha = [];
  const visitar = (quadro) => {
    if (!quadro) return null;
    if (quadro.isBlameFrame) return quadro;
    for (const sub of quadro.subFrames ?? []) {
      const achado = visitar(sub);
      if (achado) return achado;
    }
    return null;
  };
  for (const prod of logs?.productData ?? []) {
    for (const log of prod.diagnosticLogs ?? []) {
      for (const arvore of log.callStackTree ?? []) {
        for (const cs of arvore.callStacks ?? []) {
          for (const raiz of cs.callStackRootFrames ?? []) pilha.push(raiz);
        }
      }
    }
  }
  for (const raiz of pilha) {
    const q = visitar(raiz);
    if (q)
      return `${q.symbolName ?? "?"} (${q.binaryName ?? "?"}${q.fileName ? `, ${q.fileName}:${q.lineNumber}` : ""})`;
  }
  return "";
}

const celula = (s) =>
  String(s ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ");

export function montarRelatorio({
  geradoEm,
  versaoProjeto,
  builds,
  metricas,
  assinaturas,
  crashes,
  dias,
}) {
  const r = [];
  r.push(
    `# Saude do app (App Store Connect)`,
    "",
    `Gerado em ${geradoEm}. Versao do projeto: ${versaoProjeto}.`,
    "",
  );
  r.push(
    `Builds considerados: ${builds.map((b) => `${b.versao} (${b.numero})`).join(", ") || "nenhum"}.`,
    "",
  );

  r.push("## 1. Desempenho e energia (usuarios da loja, iPhones)", "");
  if (!metricas.length) {
    r.push(
      "Sem dados. A Apple so publica metricas com volume suficiente de usuarios que compartilham analises.",
      "",
    );
  } else {
    r.push(
      "| Categoria | Metrica | Percentil | Por versao (valor, meta) |",
      "| --- | --- | --- | --- |",
    );
    for (const l of metricas) {
      const pontos = l.pontos
        .slice(-4)
        .map((p) => `${p.versao}: ${p.valor} ${l.unidade}${p.meta ? ` (${p.meta})` : ""}`);
      r.push(
        `| ${NOMES_CATEGORIA[l.categoria] ?? l.categoria} | ${celula(l.metrica)} | ${l.percentil} | ${celula(pontos.join("; "))} |`,
      );
    }
    r.push("");
  }

  r.push("## 2. Assinaturas de diagnostico (ultimos builds)", "");
  if (!assinaturas.length) {
    r.push("Nenhuma assinatura de travamento, gravacao em disco ou abertura lenta.", "");
  } else {
    r.push(
      "| Build | Tipo | Peso | Assinatura | Quadro culpado | Dica da Apple |",
      "| --- | --- | --- | --- | --- | --- |",
    );
    for (const a of assinaturas) {
      r.push(
        `| ${a.build} | ${NOMES_DIAGNOSTICO[a.tipo] ?? a.tipo} | ${Math.round((a.peso ?? 0) * 100)}% | ${celula(a.assinatura)} | ${celula(a.culpado)} | ${celula(a.dica)} |`,
      );
    }
    r.push("");
  }

  r.push(`## 3. Crashes do TestFlight (ultimos ${dias} dias)`, "");
  if (!crashes.length) {
    r.push("Nenhum crash enviado pelos testadores.", "");
  } else {
    r.push(
      "Sem e-mail, nome nem comentario do testador (ver no App Store Connect, se preciso).",
      "",
    );
    for (const c of crashes) {
      r.push(`### ${c.data} - build ${c.build} - ${c.aparelho}, iOS ${c.ios}`, "");
      r.push(`- Excecao: ${c.resumo.excecao || "?"}`, `- Motivo: ${c.resumo.motivo || "?"}`, "");
      if (c.resumo.quadros.length) r.push("```", ...c.resumo.quadros, "```", "");
    }
    r.push(
      "Se os quadros do app vierem sem simbolo (so endereco): baixar o dSYM do run do build",
      "(`gh run download <id> -n pop-organize-ios-dsym`) e usar `scripts/macho-symbolicate.mjs`.",
      "",
    );
  }
  return r.join("\n");
}

// --- execucao ---

async function principal() {
  const args = lerArgumentos(process.argv.slice(2));
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

  // Builds recentes, com a versao (vem no "included" do preReleaseVersion).
  const resp = await api.chamar(
    "GET",
    `/v1/builds?filter[app]=${app.id}&sort=-uploadedDate&limit=${args.builds}` +
      "&fields[builds]=version,uploadedDate,preReleaseVersion&include=preReleaseVersion&fields[preReleaseVersions]=version",
  );
  const versoes = new Map((resp.included ?? []).map((i) => [i.id, i.attributes?.version]));
  const builds = (resp.data ?? []).map((b) => ({
    id: b.id,
    numero: b.attributes?.version,
    versao: versoes.get(b.relationships?.preReleaseVersion?.data?.id) ?? "?",
  }));

  // 1. Metricas do app
  const xcode = await api.chamar(
    "GET",
    `/v1/apps/${app.id}/perfPowerMetrics?filter[platform]=IOS&filter[deviceType]=all_iphones`,
  );
  const metricas = linhasDeMetricas(xcode);

  // 2. Assinaturas dos ultimos builds, com o quadro culpado do primeiro log
  const assinaturas = [];
  for (const b of builds) {
    let lista = [];
    try {
      lista = await api.listarTudo(
        `/v1/builds/${b.id}/diagnosticSignatures?fields[diagnosticSignatures]=diagnosticType,signature,weight&limit=50`,
      );
    } catch (erro) {
      // Build so do TestFlight ou sem uso na loja: a Apple responde 404, nao lista vazia.
      if (erro.status !== 404) throw erro;
    }
    for (const s of lista
      .sort((x, y) => (y.attributes?.weight ?? 0) - (x.attributes?.weight ?? 0))
      .slice(0, 10)) {
      const logs = await api.chamar("GET", `/v1/diagnosticSignatures/${s.id}/logs?limit=1`);
      const dica = logs?.productData?.[0]?.diagnosticInsights?.[0]?.insightsString ?? "";
      assinaturas.push({
        build: `${b.versao} (${b.numero})`,
        tipo: s.attributes?.diagnosticType,
        peso: s.attributes?.weight,
        assinatura: s.attributes?.signature,
        culpado: quadroCulpado(logs),
        dica,
      });
    }
  }

  // 3. Crashes do TestFlight (sem e-mail, testador nem comentario)
  const desde = Date.now() - args.dias * 86_400_000;
  const { data: envios, included: buildsDosCrashes } = await api.listarComIncluidos(
    `/v1/apps/${app.id}/betaFeedbackCrashSubmissions?sort=-createdDate&limit=50` +
      "&fields[betaFeedbackCrashSubmissions]=createdDate,deviceModel,osVersion,build&include=build&fields[builds]=version",
  );
  const numeroDoBuild = new Map(buildsDosCrashes.map((i) => [i.id, i.attributes?.version]));
  const crashes = [];
  for (const e of envios) {
    const data = e.attributes?.createdDate;
    if (!data || Date.parse(data) < desde) continue;
    let resumo = { excecao: "", motivo: "", quadros: [] };
    try {
      const log = await api.chamar("GET", `/v1/betaFeedbackCrashSubmissions/${e.id}/crashLog`);
      resumo = resumirCrash(log?.data?.attributes?.logText);
    } catch (erro) {
      if (erro.status !== 404) throw erro;
    }
    crashes.push({
      data: data.slice(0, 16).replace("T", " "),
      build: numeroDoBuild.get(e.relationships?.build?.data?.id) ?? "?",
      aparelho: e.attributes?.deviceModel ?? "?",
      ios: e.attributes?.osVersion ?? "?",
      resumo,
    });
  }

  const relatorio = montarRelatorio({
    geradoEm: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
    versaoProjeto: projeto.versao,
    builds,
    metricas,
    assinaturas,
    crashes,
    dias: args.dias,
  });
  fs.mkdirSync(args.saida, { recursive: true });
  const arquivo = path.join(args.saida, "saude-do-app.md");
  fs.writeFileSync(arquivo, relatorio);

  // So contagens no log publico. As cruas (antes de filtro) separam "sem volume" de "li errado".
  const categorias = (xcode?.productData ?? []).reduce(
    (n, p) => n + (p.metricCategories?.length ?? 0),
    0,
  );
  console.log(
    `Cru: ${xcode?.productData?.length ?? "sem productData"} produto(s), ${categorias} categoria(s) de metrica; ` +
      `${envios.length} crash(es) do TestFlight no total; ${builds.length} build(s) lido(s).`,
  );
  const resumo =
    `Metricas: ${metricas.length} linha(s). Assinaturas: ${assinaturas.length}. ` +
    `Crashes do TestFlight em ${args.dias} dias: ${crashes.length}. Relatorio: ${arquivo}`;
  console.log(resumo);
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${resumo}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  principal().catch((erro) => {
    console.error(`::error::${erro.message}`);
    process.exit(1);
  });
}
