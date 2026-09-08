import { execFileSync } from "node:child_process";

import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(({ mode, command }) => {
  const serverEnv = loadEnv(mode, process.cwd(), "");
  for (const key of [
    "DATABASE_URL",
    "MYSQL_URL",
    "BOOTSTRAP_COMPANY_NAME",
    "BOOTSTRAP_ADMIN_NAME",
    "BOOTSTRAP_ADMIN_EMAIL",
    "BOOTSTRAP_ADMIN_PASSWORD",
    "BOOTSTRAP_SEED_DEMO",
    "AUTH_PASSWORD_PEPPER",
    "GOOGLE_CLIENT_ID",
    "VITE_GOOGLE_CLIENT_ID",
    "OPENAI_API_KEY",
    "OPENAI_MODEL",
    "OPENAI_TRANSCRIBE_MODEL",
  ]) {
    if (!process.env[key] && serverEnv[key]) {
      process.env[key] = serverEnv[key];
    }
  }

  // O commit de onde ESTE bundle saiu, embutido na compilação.
  //
  // Existe porque não havia como perguntar ao servidor o que está no ar: o /api/health devolvia
  // status, database e timestamp, e mais nada. Sem isso, comportamento diferente do que se lê no
  // código é ambíguo entre defeito e servidor atrasado — já custou duas investigações erradas, e um
  // conserto ficou cinco dias publicado sem ninguém saber.
  //
  // Tem de ser em tempo de COMPILAÇÃO, e não lido do git em tempo de execução: a pergunta é "que
  // código está rodando", e um checkout pode ter avançado sem novo build. O deploy/release.sh faz
  // `git pull` e depois `npm run build` no próprio repositório, então o valor sai certo.
  //
  // O try/catch cobre build fora de um clone (tarball, contêiner sem git): degrada para
  // "desconhecido" em vez de derrubar a compilação.
  let appCommit = "desconhecido";
  try {
    appCommit =
      execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim() ||
      appCommit;
  } catch {
    // sem git, ou fora de um repositório
  }

  const env = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
  );

  return {
    define: { ...envDefine, "import.meta.env.VITE_APP_COMMIT": JSON.stringify(appCommit) },
    // Vite uses PostCSS in dev and only runs Lightning CSS at build, so build-time
    // transforms (e.g. collapsing a hand-written `-webkit-backdrop-filter` to the
    // prefixed form Chrome ignores) break the built/static output while the dev
    // preview looks fine. Running Lightning CSS in both keeps the preview honest.
    css: { transformer: "lightningcss" },
    resolve: {
      alias: {
        "@": `${process.cwd()}/src`,
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    server: { host: "::", port: 8080 },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
      }),
      // Bundles the SSR server for self-hosting; runs at build time only.
      ...(command === "build" ? [nitro({ preset: "node-server" })] : []),
      viteReact(),
    ],
  };
});
