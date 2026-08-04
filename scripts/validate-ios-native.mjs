import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

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
if (!entitlements.includes("com.apple.developer.applesignin"))
  fail("Sign in with Apple entitlement is missing.");
if (!entitlements.includes("aps-environment")) fail("APNs push entitlement is missing.");
if (!project.includes("pop_notification.mp3 in Resources"))
  fail("notification audio is not bundled.");
if (!project.includes("PrivacyInfo.xcprivacy in Resources"))
  fail("the iOS privacy manifest is not bundled.");

console.log("KMP iOS project validation passed.");
