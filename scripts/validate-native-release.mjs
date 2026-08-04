import { hostname } from "node:os";

const mode = process.argv[2] ?? "store";
const apiBaseUrl = process.env.POP_API_BASE_URL ?? "https://app.poporganize.com.br/api/mobile";
const privateIpv4Patterns = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^0\./,
];

function fail(message) {
  console.error(`Native release validation failed: ${message}`);
  process.exit(1);
}

function isPrivateHost(host) {
  const normalized = host.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === hostname().toLowerCase() ||
    normalized.endsWith(".local") ||
    privateIpv4Patterns.some((pattern) => pattern.test(normalized))
  );
}

if (!apiBaseUrl) fail("set POP_API_BASE_URL to the production API URL.");

let parsed;
try {
  parsed = new URL(apiBaseUrl);
} catch {
  fail("POP_API_BASE_URL is not a valid URL.");
}

if (parsed.protocol !== "https:") fail("POP_API_BASE_URL must use https://.");
if (mode === "store" && isPrivateHost(parsed.hostname)) {
  fail("POP_API_BASE_URL cannot use localhost, a local IP, or a .local host in a store build.");
}

if (mode === "store") {
  const { existsSync, readFileSync } = await import("node:fs");
  const androidGradle = readFileSync("android/app/build.gradle", "utf8");
  const androidVariables = readFileSync("android/variables.gradle", "utf8");
  const xcodeProject = readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");
  const entitlements = readFileSync("ios/App/App/App.entitlements", "utf8");
  if (!/targetSdkVersion\s*=\s*36/.test(androidVariables)) {
    fail("Android store builds must target API 36.");
  }
  if (
    !androidGradle.includes("signingConfigs") ||
    !androidGradle.includes("signingConfig signingConfigs.release")
  ) {
    fail("Android release signing is not configured.");
  }
  const hasSigningEnvironment = [
    "POP_ANDROID_KEYSTORE_PATH",
    "POP_ANDROID_KEYSTORE_PASSWORD",
    "POP_ANDROID_KEY_ALIAS",
    "POP_ANDROID_KEY_PASSWORD",
  ].every((name) => Boolean(process.env[name]?.trim()));
  if (!existsSync("android/keystore.properties") && !hasSigningEnvironment) {
    fail("configure android/keystore.properties or the POP_ANDROID_* signing variables.");
  }
  if (!xcodeProject.includes("https://app.poporganize.com.br/api/mobile")) {
    fail("the iOS Release API URL is not configured.");
  }
  if (
    !xcodeProject.includes("APS_ENVIRONMENT = production") ||
    !entitlements.includes("$(APS_ENVIRONMENT)")
  ) {
    fail("the iOS release APNs environment is not configured for production.");
  }
}

console.log("Native release environment validation passed.");
