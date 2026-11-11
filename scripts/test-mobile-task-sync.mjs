import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/mobile-task-sync.ts", import.meta.url), "utf8");
const durationSource = await readFile(new URL("../src/lib/task-duration.ts", import.meta.url), "utf8");
const durationJS = ts.transpileModule(durationSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const durationURL = `data:text/javascript;base64,${Buffer.from(durationJS).toString("base64")}`;
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText.replace('"./task-duration"', JSON.stringify(durationURL));
const { reconcileMobileTask, changedMobileTaskFields } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const base = { serverId: "t1", title: "Original", description: "", dueDate: "2026-11-11", dueLabel: "Hoje",
  assignmentType: "user", assignmentTargetId: "u1", assignees: ["Ana"], checklist: [], attachmentName: "", canEdit: true };

test("a local edit preserves unrelated website changes", () => {
  const merged = reconcileMobileTask(base, { ...base, title: "Local" }, { ...base, description: "Site", canEdit: false });
  assert.equal(merged.title, "Local"); assert.equal(merged.description, "Site"); assert.equal(merged.canEdit, false);
});
test("competing changes reject atomically with HTTP 409", () => {
  assert.throws(() => reconcileMobileTask(base, { ...base, title: "Local" }, { ...base, title: "Site" }), { statusCode: 409 });
});
test("a lost upload response can be retried without conflict", () => {
  const local = { ...base, title: "Local" };
  assert.deepEqual(reconcileMobileTask(base, local, local), local);
});
test("an unchanged snapshot cannot restore a removed attachment or checklist", () => {
  const old = { ...base, attachmentName: "antigo.pdf", checklist: [{ id: "c1", title: "A", done: false }] };
  assert.deepEqual(reconcileMobileTask(old, old, base), base);
});
test("routing is one unit, preventing mixed targets and assignees", () => {
  assert.throws(() => reconcileMobileTask(base, { ...base, assignees: ["Bia"] }, { ...base, assignmentTargetId: "u2" }), { statusCode: 409 });
});
test("server-only permission and presentation changes are not device mutations", () => {
  assert.deepEqual(changedMobileTaskFields(base, { ...base, canEdit: false, dueLabel: "11 nov" }), []);
});
test("clearing a field is an actual mutation", () => {
  const old = { ...base, description: "Texto" };
  assert.equal(reconcileMobileTask(old, base, old).description, "");
});
test("canonical whitespace, reminder labels and duration units do not create phantom changes", () => {
  assert.deepEqual(changedMobileTaskFields({ title: "  Texto  ", duration: "1 hora", reminder: "Sem lembrete" },
    { title: "Texto", duration: "60 min", reminder: "Sem notificação" }), []);
});
