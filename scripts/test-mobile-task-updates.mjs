import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/mobile-task-updates.server.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { notifyTaskUpdate, taskUpdateRevision, waitForTaskUpdate } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

test("a committed change wakes all connected readers immediately", async () => {
  const revision = taskUpdateRevision();
  const first = waitForTaskUpdate(revision, 10_000);
  const second = waitForTaskUpdate(revision, 10_000);
  notifyTaskUpdate();
  await Promise.race([Promise.all([first, second]), new Promise((_, reject) => {
    const timer = setTimeout(() => reject(new Error("Readers did not wake")), 500); timer.unref();
  })]);
  assert.equal(taskUpdateRevision(), revision + 1);
  assert.equal(globalThis.__popTaskUpdates.waiters.size, 0);
});

test("a commit between the read and subscription is not lost", async () => {
  const revision = taskUpdateRevision();
  notifyTaskUpdate();
  await waitForTaskUpdate(revision, 10_000);
  assert.equal(globalThis.__popTaskUpdates.waiters.size, 0);
});

test("disconnect removes the reader without waiting for timeout", async () => {
  const abort = new AbortController();
  const pending = waitForTaskUpdate(taskUpdateRevision(), 10_000, abort.signal);
  abort.abort(); await pending;
  assert.equal(globalThis.__popTaskUpdates.waiters.size, 0);
});

test("already disconnected readers and idle deadlines leave no listeners", async () => {
  const abort = new AbortController(); abort.abort();
  await waitForTaskUpdate(taskUpdateRevision(), 10_000, abort.signal);
  await waitForTaskUpdate(taskUpdateRevision(), 15);
  assert.equal(globalThis.__popTaskUpdates.waiters.size, 0);
});
