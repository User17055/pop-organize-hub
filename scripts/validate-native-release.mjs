import { hostname } from "node:os";

const mode = process.argv[2] ?? "store";
const apiBaseUrl = process.env.POP_API_BASE_URL;
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

console.log("Native release environment validation passed.");
