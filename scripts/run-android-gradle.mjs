import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const androidDirectory = resolve(root, "android");
const executable = process.platform === "win32" ? ".\\gradlew.bat" : "./gradlew";
const result = spawnSync(executable, process.argv.slice(2), {
  cwd: androidDirectory,
  env: process.env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
