import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const requiredFiles = [
  "ios/App/App/AppDelegate.swift",
  "ios/App/App/PopOrganizeNative.swift",
  "ios/App/App/App.entitlements",
  "ios/App/App/Info.plist",
  "ios/App/App/pop_notification.mp3",
  "ios/App/App/Poppins-Regular.ttf",
  "ios/App/App/Poppins-SemiBold.ttf",
  "ios/App/App/Poppins-Bold.ttf",
  "ios/App/App.xcodeproj/project.pbxproj",
];

function fail(message) {
  console.error(`iOS native validation failed: ${message}`);
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

if (!project.includes("PopOrganizeNative.swift in Sources")) {
  fail("PopOrganizeNative.swift is not part of the Xcode Sources build phase.");
}
if (/CapApp-SPM in Frameworks/.test(project.match(/PBXFrameworksBuildPhase[\s\S]*?End PBXFrameworksBuildPhase/)?.[0] ?? "")) {
  fail("the app target is still linking the Capacitor runtime.");
}
if (info.includes("UIMainStoryboardFile")) fail("Info.plist still launches the Capacitor storyboard.");
if (!appDelegate.includes("UIHostingController")) fail("AppDelegate is not launching SwiftUI.");
if (!entitlements.includes("com.apple.developer.applesignin")) fail("Sign in with Apple entitlement is missing.");
if (!entitlements.includes("aps-environment")) fail("APNs push entitlement is missing.");
if (!project.includes("pop_notification.mp3 in Resources")) fail("notification audio is not bundled.");

console.log("iOS native project validation passed.");
