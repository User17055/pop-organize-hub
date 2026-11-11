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
process.env.PORT='39791';
process.env.HOST='127.0.0.1';
await import(pathToFileURL(resolve('.output/server/index.mjs')));
const baseURL='http://127.0.0.1:39791/api/mobile/tasks';
async function call(method='GET', body, token=ownerToken, etag) {
  const response=await fetch(baseURL,{method,headers:{authorization:'Bearer '+token,'x-workspace-id':workspace.company.id,
    ...(body?{'content-type':'application/json'}:{}),...(etag?{'if-none-match':etag}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const text=await response.text();
  return {status:response.status,etag:response.headers.get('etag'),body:text?JSON.parse(text):null};
}
let ready=false;
for(let i=0;i<20;i++) { try {const response=await call();if(response.status===200){ready=true;break;}}catch{} await new Promise(r=>setTimeout(r,100)); }
assert.ok(ready,'Temporary HTTP server must be ready');
const item={...draft(999999975),clientId:'http-completion-audit',title:'HTTP completion audit'};
let response=await call('PUT',{tasks:[item],baseTasks:[],deletedServerIds:[]});
assert.equal(response.status,200,JSON.stringify(response.body));
const id=`native-${owner.id}-${item.clientId}`;
const beforeOwner=await call();
const beforeEmployee=await call('GET',undefined,employeeToken);
const task=beforeOwner.body.tasks.find(t=>t.serverId===id);
assert.ok(task);assert.equal(task.completed,false);
assert.ok(beforeEmployee.body.tasks.some(t=>t.serverId===id));
response=await call('PUT',{tasks:[{...task,completed:true}],baseTasks:[task],deletedServerIds:[]});
assert.equal(response.status,200,JSON.stringify(response.body));
const afterOwner=await call('GET',undefined,ownerToken,beforeOwner.etag);
const afterEmployee=await call('GET',undefined,employeeToken,beforeEmployee.etag);
assert.equal(afterOwner.status,200,'Owner ETag must invalidate after completion');
assert.equal(afterEmployee.status,200,'Other employee ETag must invalidate after completion');
assert.equal(afterOwner.body.tasks.find(t=>t.serverId===id).completed,true);
assert.equal(afterEmployee.body.tasks.find(t=>t.serverId===id).completed,true);
const unchanged=await call('GET',undefined,employeeToken,afterEmployee.etag);
assert.equal(unchanged.status,304);
console.log(JSON.stringify({httpCompletion:true,ownerSeesCompleted:true,employeeSeesCompleted:true,etagInvalidatedForBoth:true,persistentWrites:0}));
process.exit(0);
