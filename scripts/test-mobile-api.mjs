import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// O banco falso imita o mutateDatabase real: um throw no mutador descarta o rascunho (ROLLBACK).
const databaseStub = `
import { createHash, randomBytes } from "node:crypto";
export const hashToken = (token) => createHash("sha256").update(token).digest("hex");
export const createSessionToken = () => randomBytes(32).toString("base64url");
export const readDatabase = async () => structuredClone(globalThis.__popDb);
export async function mutateDatabase(mutator) {
  const draft = structuredClone(globalThis.__popDb);
  const result = await mutator(draft);
  globalThis.__popDb = draft;
  return result;
}
export const createPersonalWorkspace = (account) => globalThis.__workspace("personal-" + account.id, "personal", account.id, ["tasks.create"]);
export const createCompanyWorkspace = () => { throw new Error("não usado"); };
export const nextCompanyId = () => "c-teste";
export const verifyGoogleCredential = () => { throw new Error("não usado"); };
`;

// Carrega src/lib/<arquivo>.ts trocando cada import relativo pelo módulo transpilado.
const loaded = new Map([["database.server", `data:text/javascript;base64,${Buffer.from(databaseStub).toString("base64")}`]]);
async function load(file) {
  if (loaded.has(file)) return loaded.get(file);
  const source = await readFile(new URL(`../src/lib/${file}.ts`, import.meta.url), "utf8");
  let js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const [, dependency] of [...js.matchAll(/from "\.\/([\w.-]+)"/g)]) {
    js = js.replaceAll(`from "./${dependency}"`, `from ${JSON.stringify(await load(dependency))}`);
  }
  const url = `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
  loaded.set(file, url);
  return url;
}

globalThis.__workspace = (id, kind, userId, permissions) => ({
  accessMode: "team",
  company: { id, name: "Espaço", document: "", status: "active", kind, ownerId: kind === "personal" ? userId : "dono" },
  employees: [{ id: userId, name: "Ana", email: "ana@example.com", role: "Colaborador", departmentId: "d1", status: "active", permissionGroupId: "pg-teste" }],
  departments: [{ id: "d1", name: "Geral", managerId: "dono", color: "#000000" }],
  groups: [], tasks: [], taskFolders: [], taskLists: [], sessions: [], invitations: [],
  permissionGroups: [{ id: "pg-teste", name: "Teste", description: "", permissions }],
});

process.env.APP_REVIEW_EMAIL = "ana@example.com";
process.env.APP_REVIEW_CODE = "123456";
const api = await import(await load("mobile-api.server"));
const emptyPlatform = () => ({ version: 2, accounts: [], workspaces: [], sessions: [], emailChallenges: [] });

test("errar o código conta a tentativa: a sexta é recusada mesmo com o código certo", async () => {
  globalThis.__popDb = emptyPlatform();
  await api.requestMobileEmailCode("ana@example.com");
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await assert.rejects(api.verifyMobileEmailCode("ana@example.com", "000000"), { statusCode: 401 });
  }
  await assert.rejects(api.verifyMobileEmailCode("ana@example.com", "123456"), { statusCode: 429 });
  assert.equal(globalThis.__popDb.sessions.length, 0);
});

test("o código certo entra e cria a conta", async () => {
  globalThis.__popDb = emptyPlatform();
  await api.requestMobileEmailCode("ana@example.com");
  await assert.rejects(api.verifyMobileEmailCode("ana@example.com", "000000"), { statusCode: 401 });
  const result = await api.verifyMobileEmailCode("ana@example.com", "123456");
  assert.equal(typeof result.token, "string");
  assert.equal(globalThis.__popDb.accounts.length, 1);
  assert.equal(globalThis.__popDb.sessions.length, 1);
});

test("tarefa nova sem permissão é pulada sem recusar o envio inteiro", async () => {
  const workspace = globalThis.__workspace("c1", "company", "u1", []);
  globalThis.__popDb = {
    ...emptyPlatform(),
    accounts: [{ id: "u1", name: "Ana", email: "ana@example.com", passwordHash: "x", createdAt: "2026-01-01T00:00:00Z" }],
    workspaces: [workspace],
    sessions: [{ id: "s1", tokenHash: createHash("sha256").update("tok").digest("hex"), userId: "u1",
      activeCompanyId: "c1", createdAt: "2026-01-01T00:00:00Z", expiresAt: "9999-12-31T23:59:59.999Z" }],
  };
  const request = new Request("http://localhost/api/mobile/tasks", { headers: { authorization: "Bearer tok", "x-workspace-id": "c1" } });
  const task = { id: 1, clientId: "nova", title: "Tarefa nova", department: "Geral", dueLabel: "Hoje", priority: "Média",
    dueDate: "2026-11-13", completed: false, description: "", assignee: "Ana", assignedBy: "", createdBy: "", recurrence: "Não repete",
    reminder: "Sem lembrete", attachmentName: "", dueTime: "", recurrenceTimes: [], duration: "", recurrenceRule: "", recurrenceDetail: "",
    recurrenceInterval: 1, recurrenceEndMode: "", recurrenceEndValue: "", recurrenceOccurrence: 1 };
  const result = await api.replaceMobileTasks(request, [task]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.rejectedCreations, ["nova"]);
  assert.equal(globalThis.__popDb.workspaces[0].tasks.length, 0);
});
