import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

let writes = 0;
registerHooks({ load(url, context, next) {
  if (/\/database\.server-[^/]+\.mjs$/.test(url)) {
    let source = readFileSync(new URL(url), 'utf8');
    assert.ok(source.includes('async function readDatabase() {'));
    assert.ok(source.includes('async function mutateDatabase(mutator) {'));
    source = source.replace('async function readDatabase() {', 'async function readDatabase() { if(globalThis.syncAudit) return structuredClone(globalThis.syncAudit);');
    source = source.replace('async function mutateDatabase(mutator) {', 'async function mutateDatabase(mutator) { if(!globalThis.syncAudit) throw new Error("Audit forbids persistent writes"); const copy=structuredClone(globalThis.syncAudit); const result=await mutator(copy); globalThis.syncAudit=copy; return result;');
    return { format: 'module', shortCircuit: true, source };
  }
  return next(url, context);
} });
const dir=resolve('.output/server/_ssr');
// A deployed directory may retain chunks from previous releases for requests already
// in flight. Never pick an arbitrary old hash: use a clean reference build and verify it.
const reference=process.env.MOBILE_SYNC_REFERENCE_DIR ? resolve(process.env.MOBILE_SYNC_REFERENCE_DIR,'.output/server/_ssr') : dir;
function bundle(pattern) {
  const names=readdirSync(reference).filter(f=>pattern.test(f));
  assert.equal(names.length,1,'Use MOBILE_SYNC_REFERENCE_DIR pointing to the clean build when old chunks are retained');
  const target=resolve(dir,names[0]);
  assert.deepEqual(readFileSync(target),readFileSync(resolve(reference,names[0])),'Deployed bundle differs from tested build');
  return pathToFileURL(target);
}
const {readDatabase}=await import(bundle(/^database\.server-.*\.mjs$/));
const {readMobileTasks,readMobileWorkspaces,replaceMobileTasks,readMobileTaskOrganization,replaceMobileTaskOrganization}=await import(bundle(/^mobile-api\.server-.*\.mjs$/));
const snapshot=await readDatabase();
const workspace=snapshot.workspaces.find(w=>w.company.id==='c4');
const employee=workspace.employees.find(e=>e.id==='u27');
const owner=workspace.employees.find(e=>e.id===workspace.company.ownerId);
assert.ok(employee && owner);
const employeeToken=randomBytes(32).toString('hex'), ownerToken=randomBytes(32).toString('hex');
const auditId='sync-audit-'+randomBytes(8).toString('hex');
snapshot.sessions.push(...[[employee,employeeToken],[owner,ownerToken]].map(([user,token],i)=>({
  id:auditId+'-'+i,userId:user.id,activeCompanyId:workspace.company.id,tokenHash:createHash('sha256').update(token).digest('hex'),
})));
const request=(token=ownerToken,headers={})=>new Request('http://localhost/api/mobile/tasks',{
  headers:{authorization:'Bearer '+token,'x-workspace-id':workspace.company.id,...headers},
});
const reset=()=>globalThis.syncAudit=structuredClone(snapshot);
reset();
const assigned=(await readMobileTasks(request(employeeToken))).find(t=>t.serverId==='t2458');
assert.ok(assigned, 'Cintia must receive teste');
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date());
const draft=(id)=>({...assigned,id,serverId:undefined,title:'Auditoria em memória '+id,completed:false,
  dueDate:today,dueLabel:today,recurrence:'Não repetir',recurrenceRule:'Não repetir',recurrenceTimes:[],
  recurrenceDetail:'',recurrenceInterval:1,recurrenceEndMode:'Nunca',recurrenceEndValue:'',
  recurrenceOccurrence:1,attachmentName:'',attachmentData:'',attachmentMimeType:'',attachmentUri:'', checklist:[],
  assignmentType:'user',assignmentTargetId:employee.id,assignmentTargetLabel:employee.name,assignee:employee.name,assignees:[employee.name],
});
const raw=(id)=>globalThis.syncAudit.workspaces.find(w=>w.company.id===workspace.company.id).tasks.find(t=>t.id===id);
const get=(id)=>readMobileTasks(request()).then(tasks=>tasks.find(t=>t.serverId===id));
const create=async(id)=>{
  const item=draft(id); await replaceMobileTasks(request(),[item],[],[]);
  return {draft:item,task:await get(`native-${owner.id}-${id}`)};
};
const actualId='t2458';
const john=snapshot.accounts.find(a=>a.id==='u24');
assert.ok(john);
const johnToken=randomBytes(32).toString('hex');
globalThis.syncAudit.sessions.push({id:auditId+'-john',userId:john.id,activeCompanyId:workspace.company.id,tokenHash:createHash('sha256').update(johnToken).digest('hex')});
const johnRequest=request(johnToken);
const before=(await readMobileTasks(johnRequest)).find(t=>t.serverId===actualId);
const beforeEmployee=(await readMobileTasks(request(employeeToken))).find(t=>t.serverId===actualId);
assert.ok(before,'Joao must receive the shared teste task');
const ids=(await readMobileTasks(johnRequest)).filter(t=>t.id===before.id).map(t=>({serverId:t.serverId,title:t.title}));
console.log(JSON.stringify({sharedTaskNumericId:before.id,collidingTasks:ids,rawTarget:raw(actualId).target,responsibleIds:raw(actualId).responsibleIds??[],nativeAssignees:raw(actualId).nativeData?.assignees??[]}));
console.log(JSON.stringify({task:before.title,dueDate:before.dueDate,serverStatusBefore:raw(actualId).status,joaoSeesTask:true,cintiaSeesTask:!!beforeEmployee,canComplete:before.canComplete,requiresReview:before.requiresReview,assignees:before.assignees}));
try {
  await replaceMobileTasks(johnRequest,[{...before,completed:true}],[],[before]);
  const afterJohn=(await readMobileTasks(johnRequest)).find(t=>t.serverId===actualId);
  const afterEmployee=(await readMobileTasks(request(employeeToken))).find(t=>t.serverId===actualId);
  console.log(JSON.stringify({simulatedOnlyInMemory:true,joaoSeesCompleted:afterJohn?.completed,cintiaSeesCompleted:afterEmployee?.completed,serverStatusAfter:raw(actualId).status,persistentWrites:0}));
} catch(error) { console.log(JSON.stringify({simulatedOnlyInMemory:true,rejectionStatus:error.statusCode,message:error.message,persistentWrites:0})); }
process.exit(0);
