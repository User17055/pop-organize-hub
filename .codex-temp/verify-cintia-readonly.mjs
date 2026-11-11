import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

registerHooks({ load(url, context, next) {
  if (/\/database\.server-[^/]+\.mjs$/.test(url)) {
    let source = readFileSync(new URL(url), 'utf8');
    assert.ok(source.includes('async function readDatabase() {'));
    assert.ok(source.includes('async function mutateDatabase(mutator) {'));
    source = source.replace('async function readDatabase() {', 'async function readDatabase() { if(globalThis.cintiaAudit) return structuredClone(globalThis.cintiaAudit);');
    source = source.replace('async function mutateDatabase(mutator) {', 'async function mutateDatabase(mutator) { if(!globalThis.cintiaAudit) throw new Error("Read-only audit: persistent writes forbidden"); const copy=structuredClone(globalThis.cintiaAudit); const result=await mutator(copy); globalThis.cintiaAudit=copy; return result;');
    return { format: 'module', shortCircuit: true, source };
  }
  return next(url, context);
} });
const dir=resolve('.output/server/_ssr');
const files=readdirSync(dir);
const {readDatabase}=await import(pathToFileURL(resolve(dir,files.find(f=>/^database\.server-.*\.mjs$/.test(f)))));
const {readMobileTasks,readMobileWorkspaces,replaceMobileTasks}=await import(pathToFileURL(resolve(dir,files.find(f=>/^mobile-api\.server-.*\.mjs$/.test(f)))));
const snapshot=await readDatabase();
const workspace=snapshot.workspaces.find(w=>w.company.id==='c4');
const employee=workspace?.employees.find(e=>e.id==='u27');
assert.ok(employee && employee.status==='active','Cintia must be an active member');
const token=randomBytes(32).toString('hex');
const sessionId='cintia-readonly-'+randomBytes(8).toString('hex');
snapshot.sessions.push({id:sessionId,userId:employee.id,activeCompanyId:workspace.company.id,tokenHash:createHash('sha256').update(token).digest('hex')});
globalThis.cintiaAudit=snapshot;
const request=new Request('http://localhost/api/mobile/tasks',{headers:{authorization:'Bearer '+token,'x-workspace-id':workspace.company.id}});
const summaries=await readMobileWorkspaces(request);
const summary=summaries.workspaces.find(w=>w.id===workspace.company.id);
const before=await readMobileTasks(request);
const assigned=before.find(t=>t.serverId==='t2458');
assert.ok(assigned,'teste must be returned to Cintia');
assert.ok(assigned.assignees.includes(employee.name),'responsible person must be Cintia');
const id=999999991;
assert.ok(before.every(t=>t.id!==id));
let rejected=false;
try {
  await replaceMobileTasks(request,[{...assigned,id,serverId:undefined,title:'Memory-only regression draft',completed:false}]);
} catch(error) {
  assert.equal(error.statusCode,403);
  assert.match(error.message,/criar tarefas/);
  rejected=true;
}
assert.ok(rejected,'unprivileged creation must remain forbidden');
const after=await readMobileTasks(request);
assert.ok(after.some(t=>t.serverId==='t2458'),'rejected upload cannot revoke assigned task visibility');
globalThis.cintiaAudit=undefined;
assert.ok(!(await readDatabase()).sessions.some(s=>s.id===sessionId),'audit session must never persist');
console.log(JSON.stringify({employee:employee.name,workspace:workspace.company.name,canCreateTasks:summary?.canCreateTasks,canViewCalendar:summary?.canViewCalendar,taskIncluded:true,dueDate:assigned.dueDate,forbiddenDraftRejected:rejected,visibleAfterRejectedUpload:true,persistentWrites:0}));
process.exit(0);
