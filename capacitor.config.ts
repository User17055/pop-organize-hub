import type { CapacitorConfig } from "@capacitor/cli";

const storeAppUrl = process.env.CAPACITOR_APP_URL;
const liveReloadUrl = process.env.CAPACITOR_LIVE_RELOAD_URL;
const serverUrl = storeAppUrl || liveReloadUrl;

const config: CapacitorConfig = {
  appId: "br.com.poporganize.app",
  appName: "Pop Organize",
  webDir: "native-shell",
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: serverUrl.startsWith("http://"),
      }
    : undefined,
  android: {
    allowMixedContent: false,
  },
};

export default config;
