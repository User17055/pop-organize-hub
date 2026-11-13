import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/task-completion.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { setTaskStatus } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const actor = { id: "joao", name: "João" };
const other = { id: "cintia", name: "Cintia" };
const when = "2026-11-12T19:00:00.000Z";

test("completion records the authenticated actor and server time", () => {
  const task = { status: "pending", responsibleId: other.id };
  setTaskStatus(task, "completed", actor, when);
  assert.equal(task.completedById, actor.id);
  assert.equal(task.completedByName, actor.name);
  assert.equal(task.completedAt, when);
  assert.equal(task.responsibleId, other.id);
});
test("repeated completion cannot overwrite its actor or timestamp", () => {
  const task = { status: "pending" };
  setTaskStatus(task, "completed", actor, when);
  setTaskStatus(task, "completed", other, "later");
  assert.equal(task.completedById, actor.id);
  assert.equal(task.completedAt, when);
});
test("reopening clears completion metadata", () => {
  const task = { status: "pending" };
  setTaskStatus(task, "completed", actor, when);
  setTaskStatus(task, "pending", other);
  assert.equal(task.completedById, undefined);
  assert.equal(task.completedByName, undefined);
  assert.equal(task.completedAt, undefined);
});
test("a later completion records its new actor", () => {
  const task = { status: "pending" };
  setTaskStatus(task, "completed", actor, when);
  setTaskStatus(task, "pending", other);
  setTaskStatus(task, "completed", other, "new-time");
  assert.equal(task.completedById, other.id);
  assert.equal(task.completedAt, "new-time");
});
test("waiting for review is not a confirmed completion", () => {
  const task = { status: "pending" };
  setTaskStatus(task, "waiting_review", actor);
  assert.equal(task.completedByName, undefined);
  setTaskStatus(task, "completed", other, when);
  assert.equal(task.completedById, other.id);
});
test("legacy completed tasks do not gain a fabricated author", () => {
  const task = { status: "completed" };
  setTaskStatus(task, "completed", actor, when);
  assert.equal(task.completedById, undefined);
});
