import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const requiredFiles = [
  "android/composeApp/build.gradle",
  "android/composeApp/src/commonMain/kotlin/br/com/poporganize/shared/Domain.kt",
  "android/composeApp/src/commonMain/kotlin/br/com/poporganize/shared/PopStore.kt",
  "android/composeApp/src/commonMain/kotlin/br/com/poporganize/shared/PopOrganizeApp.kt",
  "android/composeApp/src/iosMain/kotlin/br/com/poporganize/shared/MainViewController.kt",
  "ios/App/App/AppDelegate.swift",
  "ios/App/App/App.entitlements",
  "ios/App/App/Info.plist",
  "ios/App/App/PrivacyInfo.xcprivacy",
  "ios/App/App/pop_notification.mp3",
  "ios/App/App.xcodeproj/project.pbxproj",
  "ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme",
];

function fail(message) {
  console.error(`KMP iOS validation failed: ${message}`);
  process.exit(1);
}

for (const file of requiredFiles) {
  const path = resolve(file);
  if (!existsSync(path) || statSync(path).size === 0) fail(`${file} is missing or empty.`);
}

const project = readFileSync(resolve("ios/App/App.xcodeproj/project.pbxproj"), "utf8");
const info = readFileSync(resolve("ios/App/App/Info.plist"), "utf8");
const appDelegate = readFileSync(resolve("ios/App/App/AppDelegate.swift"), "utf8");
const entitlements = readFileSync(resolve("ios/App/App/App.entitlements"), "utf8");

if (!project.includes(":composeApp:embedAndSignAppleFrameworkForXcode")) {
  fail("the Xcode build phase does not generate ComposeApp.framework.");
}
if (!project.includes("android/composeApp/build/xcode-frameworks")) {
  fail("the Xcode framework search path is missing.");
}
if (/Capacitor|CapApp-SPM|PopOrganizeNative\.swift/.test(project)) {
  fail("the Xcode project still references the previous native shell.");
}
if (info.includes("CAPACITOR_DEBUG") || info.includes("UIMainStoryboardFile")) {
  fail("Info.plist still contains a Capacitor launch setting.");
}
if (
  !appDelegate.includes("import ComposeApp") ||
  !appDelegate.includes("MainViewControllerKt.MainViewController")
) {
  fail("AppDelegate is not launching the shared Compose UI.");
}
if (!entitlements.includes("com.apple.developer.applesignin")) {
  fail("Sign in with Apple entitlement is missing.");
}
if (!project.includes("pop_notification.mp3 in Resources")) {
  fail("notification audio is not bundled.");
}
if (!project.includes("PrivacyInfo.xcprivacy in Resources")) {
  fail("the iOS privacy manifest is not bundled.");
}

// O projeto precisa abrir no Xcode instalado no Mac. objectVersion 60 exige Xcode 15+ e
// impede que o Xcode 14.x sequer abra o .xcodeproj.
const objectVersion = Number(/objectVersion = (\d+);/.exec(project)?.[1] ?? 0);
if (!objectVersion) fail("objectVersion is missing from the Xcode project.");
if (objectVersion > 56) {
  fail(`objectVersion ${objectVersion} requires Xcode 15 or newer; use 56 to stay compatible.`);
}

// APNs remoto so pode voltar quando existir servidor de push; declarar o background mode sem
// implementacao e motivo de rejeicao (App Store Review 2.5.4).
const declaresRemotePush =
  entitlements.includes("aps-environment") || project.includes("APS_ENVIRONMENT");
const declaresBackgroundMode = info.includes("remote-notification");
if (declaresRemotePush !== declaresBackgroundMode) {
  fail("APNs entitlement and the remote-notification background mode must be declared together.");
}
if (declaresRemotePush && !appDelegate.includes("didRegisterForRemoteNotificationsWithDeviceToken")) {
  fail("remote push is declared but AppDelegate never handles the APNs device token.");
}

// Todo arquivo citado nos Contents.json do catalogo precisa existir, senao o actool falha o build.
function checkAssetCatalog(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      checkAssetCatalog(path);
      continue;
    }
    if (entry.name !== "Contents.json") continue;
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(path, "utf8"));
    } catch {
      fail(`${path} is not valid JSON.`);
    }
    for (const group of ["images", "colors", "layers"]) {
      for (const item of parsed[group] ?? []) {
        if (!item.filename) continue;
        if (!existsSync(join(dirname(path), item.filename))) {
          fail(`${path} references ${item.filename}, which does not exist.`);
        }
      }
    }
  }
}
checkAssetCatalog(resolve("ios/App/App/Assets.xcassets"));

console.log("KMP iOS project validation passed.");
