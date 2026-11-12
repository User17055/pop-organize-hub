import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function moduleUrl(file, dependencies = {}) {
  let js = ts.transpileModule(await readFile(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext },
  }).outputText;
  for (const [name, url] of Object.entries(dependencies)) js = js.replaceAll(JSON.stringify(name), JSON.stringify(url));
  return `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
}
const domain = await moduleUrl("../src/lib/domain.ts");
const groups = await moduleUrl("../src/lib/permission-groups.ts", { "./domain": domain });
const { getTaskPermissions } = await import(await moduleUrl("../src/lib/permissions.ts", { "./permission-groups": groups }));

function fixture(keys = ["tasks.viewAll", "tasks.complete", "tasks.reopen"]) {
  const worker = { id: "worker", role: "Colaborador", departmentId: "d1", permissionGroupId: "workers" };
  const assignee = { ...worker, id: "assignee" };
  const reviewer = { ...worker, id: "reviewer" };
  return {
    task: { id: "t1", status: "pending", target: { type: "group", id: "g1" },
      responsibleId: assignee.id, responsibleIds: [assignee.id], assignedById: "creator", requiresReview: false },
    currentUser: worker, employees: [worker, assignee, reviewer],
    departments: [{ id: "d1", managerId: reviewer.id, memberIds: [worker.id, assignee.id] }],
    groups: [{ id: "g1", leaderId: reviewer.id, memberIds: [worker.id, assignee.id] }],
    permissionGroups: [{ id: "workers", name: "Colaboradores", permissions: keys }],
  };
}

test("a collaborator with access can complete and reopen another person's assignment", () => {
  const permissions = getTaskPermissions(fixture());
  assert.equal(permissions.canComplete, true);
  assert.equal(permissions.canReopen, true);
  assert.equal(permissions.canEditContent, false);
  assert.equal(permissions.canAssign, false);
  assert.equal(permissions.canDelete, false);
  assert.equal(permissions.canCompleteAnytime, false);
});
test("assignment remains intact and assignees retain completion access", () => {
  const input = fixture();
  const before = structuredClone(input.task);
  input.currentUser = input.employees[1];
  assert.equal(getTaskPermissions(input).canComplete, true);
  assert.deepEqual(input.task, before);
});
test("the complete and reopen permission caps remain independent", () => {
  assert.equal(getTaskPermissions(fixture(["tasks.viewAll", "tasks.complete"])).canReopen, false);
  assert.equal(getTaskPermissions(fixture(["tasks.viewAll", "tasks.reopen"])).canComplete, false);
});
test("an inaccessible assignment cannot be completed", () => {
  assert.equal(getTaskPermissions(fixture(["tasks.complete", "tasks.reopen"])).canComplete, false);
});
test("an unauthenticated user cannot complete a task", () => {
  const input = fixture(); input.currentUser = null;
  assert.equal(getTaskPermissions(input).canComplete, false);
});
test("completion still submits review rather than granting review authority", () => {
  const input = fixture(); input.task.requiresReview = true;
  const permissions = getTaskPermissions(input);
  assert.equal(permissions.canComplete, true);
  assert.equal(permissions.reviewManagerId, "reviewer");
  assert.equal(permissions.canApproveReview, false);
});
test("only the assigned reviewer or admin can approve a waiting review", () => {
  const input = fixture(); input.task.requiresReview = true; input.task.status = "waiting_review";
  assert.equal(getTaskPermissions(input).canComplete, false);
  input.currentUser = input.employees[2];
  assert.equal(getTaskPermissions(input).canApproveReview, true);
});
