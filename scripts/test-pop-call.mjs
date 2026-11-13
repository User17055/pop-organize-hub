import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function load(name) {
  const source = await readFile(new URL(`../src/lib/${name}.ts`, import.meta.url), "utf8");
  const js = ts
    .transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    })
    .outputText.replace('from "zod"', `from ${JSON.stringify(import.meta.resolve("zod"))}`);
  return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}
const { validatePopCallDraft } = await load("pop-call-policy");
const { restorePopDraft } = await load("pop-draft");
const { PopCallSession } = await load("pop-call-session");
const context = {
  company: { id: "company", name: "Empresa de teste", kind: "company" },
  currentUser: { id: "me", name: "Operador" },
  employees: ["me", "ana", "joao"]
    .map((id) => ({ id, name: id, status: "active", departmentId: "dept" }))
    .concat({ id: "inactive", name: "Inativa", status: "inactive", departmentId: "dept" }),
  departments: [{ id: "dept", name: "Operação" }],
  groups: [{ id: "group", name: "Equipe Ana", memberIds: ["ana"] }],
  canCreateChecklist: true,
};
const draft = () => ({
  title: "Conferir estoque",
  description: null,
  priority: "medium",
  dueDate: "2026-11-14",
  dueTime: "09:00",
  durationMinutes: 30,
  targetType: "company",
  targetId: "company",
  responsibleId: "ana",
  responsibleConfirmed: true,
  reviewerId: null,
  requiresReview: false,
  tags: [],
  checklist: [],
  checklistConfirmed: true,
  recurrence: {
    frequency: "none",
    interval: null,
    customUnit: null,
    dayOfMonth: null,
    monthOfYear: null,
    endDate: null,
  },
  recurrenceConfirmed: true,
});
const validate = (value, missing = [], scope = context) =>
  validatePopCallDraft(value, scope, missing, "2026-11-13");

test("correction keeps the title, date, and schedule while changing the assignee", () => {
  const result = validate({ ...draft(), responsibleId: "joao" });
  assert.equal(result.status, "ready");
  assert.equal(result.draft.responsibleId, "joao");
  assert.equal(result.draft.dueDate, "2026-11-14");
  assert.equal(result.draft.dueTime, "09:00");
  assert.equal(result.draft.durationMinutes, 30);
});
test("unknown or inactive people are never silently replaced with the caller", () => {
  for (const responsibleId of ["missing", "inactive"]) {
    const result = validate({ ...draft(), responsibleId });
    assert.equal(result.status, "needs_input");
    assert.equal(result.draft.responsibleId, null);
  }
});
test("ambiguous names stay pending until clarified", () => {
  const result = validate({ ...draft(), responsibleId: null }, ["responsável"]);
  assert.equal(result.status, "needs_input");
  assert.equal(result.draft.responsibleId, null);
  const personalTarget = validate(
    { ...draft(), targetType: "user", targetId: "ana", responsibleId: "ana" },
    ["responsável"],
  );
  assert.equal(personalTarget.draft.targetId, null);
  assert.equal(personalTarget.draft.responsibleId, null);
  assert.equal(personalTarget.status, "needs_input");
});
test("impossible calendar dates and clocks remain pending", () => {
  for (const patch of [{ dueDate: "2026-02-30" }, { dueTime: "24:30" }, { durationMinutes: 1500 }])
    assert.equal(validate({ ...draft(), ...patch }).status, "needs_input");
});
test("duration needs a start time, including overnight tasks", () => {
  assert.equal(validate({ ...draft(), dueTime: null }).status, "needs_input");
  assert.equal(validate({ ...draft(), dueTime: "23:30", durationMinutes: 120 }).status, "ready");
});
test("assignee must belong to the requested group", () => {
  const result = validate({
    ...draft(),
    targetType: "group",
    targetId: "group",
    responsibleId: "joao",
  });
  assert.equal(result.draft.responsibleId, null);
  assert.equal(result.status, "needs_input");
});
test("personal workspace stays assigned to its owner and cannot require company review", () => {
  const result = validate({ ...draft(), requiresReview: true, reviewerId: "ana" }, [], {
    ...context,
    company: { ...context.company, kind: "personal" },
  });
  assert.equal(result.draft.targetId, "me");
  assert.equal(result.draft.requiresReview, false);
});
test("old stored drafts restore without losing their fields", () => {
  const old = draft();
  delete old.dueTime;
  delete old.durationMinutes;
  const result = restorePopDraft(old);
  assert.equal(result.title, old.title);
  assert.equal(result.dueTime, null);
  assert.equal(result.durationMinutes, null);
  assert.equal(restorePopDraft({ title: "invalid" }), null);
});
test("duplicate starts and old call callbacks are rejected", () => {
  const session = new PopCallSession();
  const first = session.begin();
  assert.equal(session.begin(), null);
  session.end();
  const second = session.begin();
  assert.equal(session.isCurrent(first), false);
  assert.equal(session.isCurrent(second), true);
});
test("tool calls execute once and in order", async () => {
  const session = new PopCallSession();
  const generation = session.begin();
  const seen = [];
  const first = session.runTool(generation, "one", async () => {
    await Promise.resolve();
    seen.push(1);
    return "first";
  });
  const duplicate = session.runTool(generation, "one", async () => {
    throw new Error("duplicate executed");
  });
  const second = session.runTool(generation, "two", async () => {
    seen.push(2);
    return "second";
  });
  assert.deepEqual(await Promise.all([first, duplicate, second]), ["first", "first", "second"]);
  assert.deepEqual(seen, [1, 2]);
});
test("a failed tool does not poison the following request", async () => {
  const session = new PopCallSession();
  const generation = session.begin();
  await assert.rejects(
    session.runTool(generation, "bad", async () => {
      throw new Error("expected");
    }),
  );
  assert.equal(await session.runTool(generation, "good", async () => "ok"), "ok");
});
test("ending a call cancels queued tool work", async () => {
  const session = new PopCallSession();
  const generation = session.begin();
  const pending = session.runTool(generation, "queued", async () => {
    throw new Error("old call executed");
  });
  session.end();
  session.begin();
  assert.equal(await pending, undefined);
});
