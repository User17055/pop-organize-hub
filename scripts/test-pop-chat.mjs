import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
async function url(name, deps = {}) {
  let js = ts.transpileModule(
    await readFile(new URL(`../src/lib/${name}.ts`, import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  for (const [key, value] of Object.entries(deps))
    js = js.replaceAll(JSON.stringify(key), JSON.stringify(value));
  return `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
}
const domain = await url("domain");
const groups = await url("permission-groups", { "./domain": domain });
const permissions = await url("permissions", { "./permission-groups": groups });
const draft = await url("pop-draft", { zod: import.meta.resolve("zod") });
const policy = await url("pop-call-policy");
const { popAdminIndicators, popAdminStructure } = await import(
  await url("pop-admin-report", { zod: import.meta.resolve("zod") })
);
const {
  searchPopTasks,
  visiblePopTasks,
  preparePopChatDraft,
  decodePopAttachment,
  popTaskSearchSchema,
  compactPopVoiceSearch,
} = await import(
  await url("pop-chat-policy", {
    "./permissions": permissions,
    "./pop-call-policy": policy,
    "./pop-draft": draft,
    zod: import.meta.resolve("zod"),
  })
);
test("task search schema supports strict AI tool arguments and older clients", async () => {
  const { zodTextFormat } = await import("openai/helpers/zod");
  const schema = zodTextFormat(popTaskSearchSchema, "task_search").schema;
  assert.ok(schema.required.includes("assignee"));
  assert.ok(schema.required.includes("beforeDate"));
  assert.equal(
    popTaskSearchSchema.parse({ query: "", date: null, status: "pending", limit: 12 }).assignee,
    undefined,
  );
});
const admin = {
  id: "admin",
  name: "Admin",
  role: "Administrador",
  status: "active",
  departmentId: "dept",
};
const worker = {
  id: "worker",
  name: "Colaborador",
  role: "Colaborador",
  status: "active",
  departmentId: "dept",
  permissionGroupId: "staff",
};
const other = { ...worker, id: "other", name: "Outra pessoa" };
const task = (id, user, title = "Conferir estoque") => ({
  id,
  title,
  description: "Analisar entradas e saídas",
  priority: "medium",
  status: "pending",
  dueDate: "2026-11-14",
  dueTime: "09:00",
  durationMinutes: 30,
  target: { type: "user", id: user, label: user },
  responsibleId: user,
  assignedById: "admin",
  requiresReview: false,
  tags: [],
  subtasks: [],
});
const workspace = () => ({
  company: { id: "company", name: "Empresa", kind: "company" },
  employees: [admin, worker, other],
  departments: [{ id: "dept", name: "Operação", memberIds: [] }],
  groups: [],
  permissionGroups: [{ id: "staff", permissions: ["tasks.create", "tasks.viewOwn"] }],
  tasks: [task("own", "worker"), task("private", "other", "Atividade privada")],
});
const context = {
  company: { id: "company", name: "Empresa", kind: "company" },
  currentUser: { id: "admin", name: "Admin" },
  employees: [admin, worker, other],
  departments: [{ id: "dept", name: "Operação" }],
  groups: [],
  canCreateChecklist: true,
};
const proposal = () => ({
  title: "Revisar estoque",
  description: "Conferir saldo, registrar divergências e comunicar resultado.",
  priority: "high",
  dueDate: "2026-11-14",
  dueTime: "09:00",
  durationMinutes: 60,
  targetType: "company",
  targetId: "company",
  responsibleId: "admin",
  responsibleConfirmed: true,
  requiresReview: false,
  reviewerId: null,
  tags: [],
  checklist: ["Conferir entradas"],
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
test("company destination defaults within the authorized company without hiding unknown destinations", () => {
  const input = { ...proposal(), targetId: null };
  const answer = preparePopChatDraft(workspace(), context, input, [], "2026-11-13");
  assert.equal(answer.status, "ready");
  assert.equal(answer.draft.targetId, "company");
  const unknown = preparePopChatDraft(workspace(), context, input, ["destino"], "2026-11-13");
  assert.equal(unknown.status, "needs_input");
});
test("task searches expose only tasks visible to the authenticated collaborator", () => {
  const w = workspace();
  assert.deepEqual(
    visiblePopTasks(w, "worker").map((t) => t.id),
    ["own"],
  );
  assert.equal(
    searchPopTasks(w, "worker", { query: "privada", date: null, status: "all", limit: 12 }).total,
    0,
  );
});
test("search is accent-insensitive, bounded and does not mutate task ordering", () => {
  const w = workspace();
  w.tasks[0].title = "Conferência do estoque";
  const before = JSON.stringify(w);
  const result = searchPopTasks(w, "admin", {
    query: "conferencia",
    date: "2026-11-14",
    status: "pending",
    limit: 1,
  });
  assert.equal(result.tasks[0].id, "own");
  assert.equal(JSON.stringify(w), before);
});
test("an inaccessible task cannot be selected as an improvement source", () => {
  const c = { ...context, currentUser: { id: "worker", name: "Colaborador" } };
  assert.throws(
    () => preparePopChatDraft(workspace(), c, proposal(), [], "2026-11-13", "private"),
    (e) => e.statusCode === 404,
  );
});
test("improvements preserve assignment and an existing completed checklist", () => {
  const w = workspace();
  w.tasks[0].subtasks = [{ id: "s1", title: "Etapa já feita", done: true }];
  const before = JSON.stringify(w);
  const answer = preparePopChatDraft(w, context, proposal(), [], "2026-11-13", "own");
  assert.equal(answer.sourceTaskId, "own");
  assert.equal(answer.draft.targetId, "worker");
  assert.equal(answer.draft.responsibleId, "worker");
  assert.deepEqual(answer.draft.checklist, ["Etapa já feita"]);
  assert.equal(JSON.stringify(w), before);
});

test("HTML is accepted as file data, never executable content", () => {
  const html = "<html><script>fetch('https://example.invalid')</script></html>";
  const result = decodePopAttachment({
    name: "exemplo.html",
    dataUrl: "data:text/html;base64," + Buffer.from(html).toString("base64"),
  });
  assert.equal(result.image, false);
  assert.equal(result.bytes, Buffer.byteLength(html));
});
test("unsupported, malformed and oversized files fail before reaching the API", () => {
  for (const file of [
    { name: "run.exe", dataUrl: "data:application/octet-stream;base64,AAAA" },
    { name: "test.pdf", dataUrl: "https://example.invalid/file.pdf" },
    {
      name: "test.pdf",
      dataUrl:
        "data:application/pdf;base64," + Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64"),
    },
  ])
    assert.throws(() => decodePopAttachment(file));
});
test("images use canonical MIME and unsafe file path components are removed", () => {
  const result = decodePopAttachment({
    name: "../photo.png",
    dataUrl: "data:application/octet-stream;base64,AAAA",
  });
  assert.ok(result.dataUrl.startsWith("data:image/png;base64,"));
  assert.equal(result.name.includes("/"), false);
});

test("my daily plan excludes coworkers and canceled tasks and sorts urgency", () => {
  const w = workspace();
  w.tasks = [
    {
      ...w.tasks[0],
      assignedById: "other",
      responsibleId: "admin",
      target: { type: "user", id: "admin", label: "Admin" },
      priority: "low",
    },
    { ...task("urgent", "admin"), priority: "urgent" },
    { ...task("canceled", "admin"), status: "canceled" },
    task("coworker", "other"),
  ];
  const result = searchPopTasks(w, "admin", {
    query: "",
    date: "2026-11-14",
    status: "pending",
    limit: 12,
    assignee: "me",
  });
  assert.deepEqual(
    result.tasks.map((item) => item.id),
    ["urgent", "own"],
  );
});
test("overdue searches stop before today", () => {
  const w = workspace();
  w.tasks[0].dueDate = "2026-11-12";
  const result = searchPopTasks(w, "worker", {
    query: "",
    date: null,
    beforeDate: "2026-11-13",
    status: "pending",
    limit: 12,
    assignee: "me",
  });
  assert.equal(result.tasks.length, 1);
  assert.equal(result.tasks[0].id, "own");
});
test("team fallback respects group and department memberships and separates personal assignments", () => {
  const w = workspace();
  w.employees = w.employees.map((person) => ({
    ...person,
    departmentId: person.id === "other" ? "unrelated" : "dept",
  }));
  w.groups = [
    { id: "mine", name: "Meu grupo", memberIds: ["admin"] },
    { id: "foreign", name: "Outro grupo", memberIds: [] },
  ];
  w.tasks = [
    task("personal", "admin"),
    task("sector-colleague", "worker"),
    task("unrelated", "other"),
    { ...task("group", "other"), target: { type: "group", id: "mine", label: "Meu grupo" } },
    {
      ...task("foreign-group", "other"),
      target: { type: "group", id: "foreign", label: "Outro grupo" },
    },
  ];
  const answer = searchPopTasks(w, "admin", {
    query: "",
    date: "2026-11-14",
    status: "pending",
    limit: 12,
    assignee: "my_team",
  });
  assert.deepEqual(answer.tasks.map((item) => item.id).sort(), ["group", "sector-colleague"]);
  assert.deepEqual(answer.memberships, { departments: ["Operação"], groups: ["Meu grupo"] });
  const noMembership = searchPopTasks(w, "other", {
    query: "",
    date: "2026-11-14",
    status: "pending",
    limit: 12,
    assignee: "my_team",
  });
  assert.equal(noMembership.total, 0);
});

test("completion reports credit the actor and keep historical unknowns separate", () => {
  const w = workspace();
  w.tasks = [
    {
      ...w.tasks[0],
      status: "completed",
      responsibleId: "worker",
      completedById: "admin",
      completedByName: "Admin",
      completedAt: "2026-11-14T02:00:00Z",
    },
    { ...w.tasks[1], status: "completed" },
  ];
  const result = popAdminIndicators(
    w,
    { metric: "completed_by_person", fromDate: null, toDate: null },
    "2026-11-13",
  );
  assert.equal(result.completedByPerson[0].id, "admin");
  assert.equal(result.completedByPerson[0].count, 1);
  assert.equal(result.unknownCompletionActor, 1);
  const dated = popAdminIndicators(
    w,
    { metric: "completed_by_person", fromDate: "2026-11-13", toDate: "2026-11-13" },
    "2026-11-13",
  );
  assert.equal(dated.completedByPerson[0].count, 1);
});
test("sector delays are based on active overdue tasks", () => {
  const w = workspace();
  w.tasks = [
    { ...w.tasks[0], dueDate: "2026-11-12" },
    { ...w.tasks[1], dueDate: "2026-11-12", status: "canceled" },
  ];
  const before = JSON.stringify(w);
  const result = popAdminIndicators(
    w,
    { metric: "overdue_by_department", fromDate: null, toDate: null },
    "2026-11-13",
  );
  assert.equal(result.overview.overdue, 1);
  assert.equal(result.overdueByDepartment[0].name, "Operação");
  assert.equal(JSON.stringify(w), before);
});
test("administrative projections do not expose credentials", () => {
  const w = workspace();
  w.invitations = [];
  w.employees[0].passwordHash = "never-expose-me";
  const result = popAdminStructure(w, { kind: "employees", query: "", limit: 50 });
  assert.equal(result.total, 3);
  assert.equal(JSON.stringify(result).includes("never-expose-me"), false);
});
test("existing task improvements remain read-only suggestions", () => {
  const w = workspace();
  const before = JSON.stringify(w);
  const answer = preparePopChatDraft(w, context, proposal(), [], "2026-11-13", "own");
  assert.equal(answer.suggestionOnly, true);
  assert.equal(answer.sourceTaskId, "own");
  assert.equal(JSON.stringify(w), before);
});
test("review exposes resolved destination and reviewer names without raw ids", () => {
  const w = workspace();
  const group = { id: "team", name: "Equipe de atendimento", memberIds: ["worker"] };
  const c = { ...context, groups: [group] };
  w.groups = [group];
  const answer = preparePopChatDraft(
    w,
    c,
    {
      ...proposal(),
      targetType: "group",
      targetId: "team",
      responsibleId: "worker",
      requiresReview: true,
      reviewerId: "admin",
    },
    [],
    "2026-11-13",
  );
  assert.equal(answer.preview.target, "Equipe de atendimento");
  assert.equal(answer.preview.reviewer, "Admin");
});
test("empty personal day includes team context for exactly the requested day in one query", () => {
  const w = workspace();
  w.tasks = [task("today", "worker"), { ...task("tomorrow", "worker"), dueDate: "2026-11-15" }];
  w.employees = w.employees.map((person) => ({ ...person, departmentId: "dept" }));
  const result = searchPopTasks(w, "admin", {
    query: "",
    date: "2026-11-14",
    status: "pending",
    limit: 12,
    assignee: "me",
  });
  assert.equal(result.total, 0);
  assert.equal(result.teamFallback.total, 1);
  assert.equal(result.teamFallback.tasks[0].id, "today");
});
test("voice task results bound details for WebRTC while retaining verified counts", () => {
  const w = workspace();
  w.tasks = Array.from({ length: 12 }, (_, index) => ({
    ...task("task-" + index, "admin"),
    description: "Descrição longa ".repeat(300),
  }));
  const result = searchPopTasks(w, "admin", {
    query: "",
    date: null,
    status: "pending",
    limit: 12,
    assignee: "me",
  });
  const before = JSON.stringify(result);
  const compact = compactPopVoiceSearch(result);
  assert.equal(compact.total, 12);
  assert.ok(compact.tasks.length <= 6);
  assert.ok(Buffer.byteLength(JSON.stringify(compact)) <= 24000);
  assert.equal(JSON.stringify(result), before);
});
test("natural lookups filter people, sectors, groups, priority and period", () => {
  const w = workspace();
  w.employees.push({ ...worker, id: "cintia", name: "Cíntia Pazini", departmentId: "dept" });
  w.groups = [{ id: "clinical", name: "Clínica Cirúrgica", memberIds: ["cintia"] }];
  w.tasks = [
    {
      ...task("clinical-high", "cintia"),
      target: { type: "group", id: "clinical", label: "Clínica Cirúrgica" },
      priority: "high",
    },
    { ...task("other", "other"), priority: "high" },
  ];
  const input = {
    query: "",
    date: null,
    status: "pending",
    limit: 12,
    assignee: "all",
    person: "Cinthia",
    department: "Operacao",
    group: "Clínica",
    priority: "high",
    fromDate: "2026-11-13",
    toDate: "2026-11-15",
  };
  const result = searchPopTasks(w, "admin", input);
  assert.deepEqual(
    result.tasks.map((item) => item.id),
    ["clinical-high"],
  );
  assert.deepEqual(result.appliedFilters.people, ["Cíntia Pazini"]);
  assert.equal(searchPopTasks(w, "admin", { ...input, priority: "urgent" }).total, 0);
  assert.equal(searchPopTasks(w, "admin", { ...input, fromDate: "2026-11-15" }).total, 0);
  assert.equal(
    searchPopTasks(w, "admin", { ...input, person: "Pessoa inexistente" }).unresolvedFilters[0],
    "person",
  );
});
test("search terms include related names rather than requiring them in a title", () => {
  const w = workspace();
  w.groups = [{ id: "g", name: "Cirurgia", memberIds: ["worker"] }];
  w.tasks = [
    {
      ...task("surgery", "worker"),
      title: "Separar materiais",
      target: { type: "group", id: "g", label: "Cirurgia" },
    },
  ];
  const result = searchPopTasks(w, "admin", {
    query: "tarefas do grupo cirurgia",
    date: null,
    status: "all",
    limit: 12,
  });
  assert.equal(result.total, 1);
  assert.equal(result.tasks[0].title, "Separar materiais");
  assert.equal(
    searchPopTasks(w, "worker", {
      query: "",
      person: "other",
      assignee: "all",
      status: "all",
      date: null,
      limit: 12,
    }).total,
    0,
  );
});
test("named lookups prioritize exact titles and recent dates before partial matches", () => {
  const w = workspace();
  w.tasks = [
    { ...task("partial", "admin"), title: "teste antigo extra", dueDate: "2026-11-15" },
    { ...task("old-exact", "admin"), title: "Teste", dueDate: "2026-09-01" },
    { ...task("recent-exact", "admin"), title: "teste", dueDate: "2026-11-10" },
  ];
  const result = searchPopTasks(w, "admin", {
    query: "tarefa teste",
    date: null,
    status: "all",
    limit: 12,
    assignee: "all",
  });
  assert.deepEqual(
    result.tasks.map((item) => item.id),
    ["recent-exact", "old-exact", "partial"],
  );
});
test("task details preserve actual completion author separately from responsible person", () => {
  const w = workspace();
  w.tasks = [
    {
      ...task("done", "worker"),
      status: "completed",
      completedById: "admin",
      completedAt: "2026-11-13T12:00:00Z",
    },
    { ...task("legacy", "worker"), status: "completed" },
  ];
  const result = searchPopTasks(w, "admin", {
    query: "",
    date: null,
    status: "completed",
    limit: 12,
    assignee: "all",
  });
  assert.equal(result.tasks.find((item) => item.id === "done").completedBy, "Admin");
  assert.equal(result.tasks.find((item) => item.id === "legacy").completedBy, null);
});
