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
    "GOOGLE_CLIENT_ID",
    "VITE_GOOGLE_CLIENT_ID",
  ]) {
    if (!process.env[key] && serverEnv[key]) {
      process.env[key] = serverEnv[key];
    }
  }

  const env = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]),
  );

  return {
    define: envDefine,
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
