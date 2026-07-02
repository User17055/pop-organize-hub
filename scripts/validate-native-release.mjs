import { existsSync, readFileSync } from "node:fs";
import { hostname } from "node:os";
import { resolve } from "node:path";

const mode = process.argv[2] ?? "store";
const validateGeneratedAssets = mode !== "store-env";
const appUrl = process.env.CAPACITOR_APP_URL;
const legacyUrl = process.env.CAPACITOR_SERVER_URL;
const liveReloadUrl = process.env.CAPACITOR_LIVE_RELOAD_URL;

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

if (legacyUrl) {
  fail("use CAPACITOR_APP_URL for store builds or CAPACITOR_LIVE_RELOAD_URL for development.");
}

if (mode === "store") {
  if (liveReloadUrl) {
    fail("CAPACITOR_LIVE_RELOAD_URL must not be set for store builds.");
  }

  if (!appUrl) {
    fail("set CAPACITOR_APP_URL to your production HTTPS URL before syncing a store build.");
  }

  let parsed;
  try {
    parsed = new URL(appUrl);
  } catch {
    fail("CAPACITOR_APP_URL is not a valid URL.");
  }

  if (parsed.protocol !== "https:") {
    fail("CAPACITOR_APP_URL must use https:// for Play Store and App Store builds.");
  }

  if (isPrivateHost(parsed.hostname)) {
    fail("CAPACITOR_APP_URL cannot point to localhost, a local network IP, or a .local host.");
  }
}

const generatedAndroidConfig = resolve("android/app/src/main/assets/capacitor.config.json");
if (validateGeneratedAssets && existsSync(generatedAndroidConfig)) {
  const contents = readFileSync(generatedAndroidConfig, "utf8");
  if (/https?:\/\/(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.|0\.)/i.test(contents)) {
    fail("Android generated assets still contain a local development server URL. Run cap sync with store env vars.");
  }

  if (mode === "store") {
    const config = JSON.parse(contents);
    if (config.server?.url !== appUrl) {
      fail("Android generated assets do not match CAPACITOR_APP_URL. Run android:sync:store again.");
    }
  }
}

console.log("Native release validation passed.");
