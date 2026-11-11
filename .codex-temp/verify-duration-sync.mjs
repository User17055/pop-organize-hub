import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { randomBytes, createHash } from "node:crypto";

registerHooks({ load(url, context, next) {
  if (/\/database\.server-[^/]+\.mjs$/.test(url)) {
    let source = readFileSync(new URL(url), "utf8");
    source = source.replace("async function readDatabase() {", "async function readDatabase() { if(globalThis.durationTestPlatform) return structuredClone(globalThis.durationTestPlatform);");
    source = source.replace("async function mutateDatabase(mutator) {", "async function mutateDatabase(mutator) { if(globalThis.durationTestPlatform) { const copy=structuredClone(globalThis.durationTestPlatform); const result=await mutator(copy); globalThis.durationTestPlatform=copy; return result; }");
    return { format: "module", shortCircuit: true, source };
  }
  return next(url, context);
} });
const dir = "./.output/server/_ssr/";
const files = readdirSync(dir);
const { readDatabase } = await import(dir + files.find(f => /^database\.server-.*\.mjs$/.test(f)));
const { readMobileTasks, replaceMobileTasks } = await import(dir + files.find(f => /^mobile-api\.server-.*\.mjs$/.test(f)));
const platform = await readDatabase();
const requests = new Map();
for (const id of ["u2", "u27"]) {
  const token = randomBytes(32).toString("hex");
  platform.sessions.push({ id: "duration-memory-" + id, userId: id, activeCompanyId: "c4", tokenHash: createHash("sha256").update(token).digest("hex") });
  requests.set(id, new Request("http://localhost/api/mobile/tasks", { headers: { authorization: "Bearer " + token, "x-workspace-id": "c4" } }));
}
globalThis.durationTestPlatform = platform;
const admin = requests.get("u2");
let task = (await readMobileTasks(admin)).find(t => t.serverId === "t2458");
assert.ok(task, "existing assigned web task is visible");
await replaceMobileTasks(admin, [{ ...task, dueTime: "09:00", duration: "1 h 30 min" }]);
task = (await readMobileTasks(admin)).find(t => t.serverId === "t2458");
assert.equal(task.duration, "1 h 30 min");
assert.equal(task.dueTime, "09:00");
assert.equal(globalThis.durationTestPlatform.workspaces.find(w=>w.company.id==="c4").tasks.find(t=>t.id==="t2458").durationMinutes, 90);
const employee = requests.get("u27");
const employeeTask = (await readMobileTasks(employee)).find(t=>t.serverId==="t2458");
assert.equal(employeeTask.canEdit, false);
await replaceMobileTasks(employee, [{ ...employeeTask, duration: "2 h" }]);
assert.equal((await readMobileTasks(admin)).find(t=>t.serverId==="t2458").duration, "1 h 30 min");
await replaceMobileTasks(admin, [{ ...task, duration: "Sem duração" }]);
assert.equal((await readMobileTasks(admin)).find(t=>t.serverId==="t2458").duration, "Sem duração");
await replaceMobileTasks(admin, [{ ...task, id: 99999999, serverId: undefined, title: "Duration memory test", duration: "45 min" }]);
assert.equal((await readMobileTasks(admin)).find(t=>t.serverId==="native-u2-99999999").duration, "45 min");
console.log("Duration sync: existing task, permissions, clearing and creation passed; all writes stayed in memory.");
process.exit(0);
