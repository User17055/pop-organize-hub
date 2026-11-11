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
const dir=resolve('.output/server/_ssr'), files=readdirSync(dir);
const {readDatabase}=await import(pathToFileURL(resolve(dir,files.find(f=>/^database\.server-.*\.mjs$/.test(f)))));
const {readMobileTasks,readMobileWorkspaces,replaceMobileTasks,readMobileTaskOrganization,replaceMobileTaskOrganization}=await import(pathToFileURL(resolve(dir,files.find(f=>/^mobile-api\.server-.*\.mjs$/.test(f)))));
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
const results=[];
async function check(name,fn){ reset(); await fn(); results.push(name); }

await check('Cintia recebe teste após envio recusado',async()=>{
  await assert.rejects(replaceMobileTasks(request(employeeToken),[draft(999999991)],[],[]),{statusCode:403});
  assert.ok((await readMobileTasks(request(employeeToken))).some(t=>t.serverId==='t2458'));
});
await check('edições em campos diferentes são combinadas',async()=>{
  const {task}=await create(999999981); const other=(await create(999999982)).task;
  raw(task.serverId).description='Descrição alterada no site'; raw(other.serverId).title='Outra tarefa alterada no site';
  await replaceMobileTasks(request(),[{...task,title:'Título alterado no celular'}],[],[task]);
  const after=await get(task.serverId);
  assert.equal(after.title,'Título alterado no celular'); assert.equal(after.description,'Descrição alterada no site');
  assert.equal((await get(other.serverId)).title,'Outra tarefa alterada no site');
});
await check('conflito no mesmo campo não sobrescreve o site',async()=>{
  const {task}=await create(999999981); raw(task.serverId).title='Título novo do site';
  const before=JSON.stringify(globalThis.syncAudit);
  await assert.rejects(replaceMobileTasks(request(),[{...task,title:'Título do celular'}],[],[task]),{statusCode:409});
  assert.equal(JSON.stringify(globalThis.syncAudit),before);
});
await check('conflito em lote desfaz todas as alterações',async()=>{
  const a=(await create(999999981)).task,b=(await create(999999982)).task;
  raw(b.serverId).title='Título do site'; const before=JSON.stringify(globalThis.syncAudit);
  await assert.rejects(replaceMobileTasks(request(),[{...a,title:'Celular A'},{...b,title:'Celular B'}],[],[a,b]),{statusCode:409});
  assert.equal(JSON.stringify(globalThis.syncAudit),before);
});
await check('exclusão concorrente com edição exige revisão',async()=>{
  const {task}=await create(999999981); raw(task.serverId).description='Nova informação';
  await assert.rejects(replaceMobileTasks(request(),[],[task.serverId],[task]),{statusCode:409});
  assert.ok(raw(task.serverId));
});
await check('reenvio de criação não duplica nem sobrescreve',async()=>{
  const {task,draft:item}=await create(999999981); raw(task.serverId).title='Mudança depois da criação';
  await replaceMobileTasks(request(),[item],[],[]);
  assert.equal((await get(task.serverId)).title,'Mudança depois da criação');
  assert.equal(globalThis.syncAudit.workspaces.find(w=>w.company.id===workspace.company.id).tasks.filter(t=>t.id===task.serverId).length,1);
});
await check('exclusão repetida é idempotente',async()=>{
  const {task}=await create(999999981);
  await replaceMobileTasks(request(),[],[task.serverId],[task]);
  const second=await replaceMobileTasks(request(),[],[task.serverId],[task]);
  assert.equal(second.deleted,0); assert.equal(await get(task.serverId),undefined);
});
await check('tarefas excluídas não são recriadas por envio atrasado',async()=>{
  const {task}=await create(999999981);
  await replaceMobileTasks(request(),[],[task.serverId],[task]);
  await replaceMobileTasks(request(),[{...task,title:'Envio atrasado'}],[],[task]);
  assert.equal(await get(task.serverId),undefined);
});
await check('serverId diferente não usa id numérico de outra tarefa',async()=>{
  const {task}=await create(999999981);
  await replaceMobileTasks(request(),[{...task,serverId:'inexistente',title:'Não pode sobrescrever'}]);
  assert.equal((await get(task.serverId)).title,task.title);
});
await check('espaço pessoal é explícito mesmo com empresa ativa na sessão',async()=>{
  const personal=globalThis.syncAudit.workspaces.find(w=>w.company.kind==='personal'&&w.company.ownerId===owner.id);
  assert.ok(personal);
  const explicit=await readMobileTasks(request(ownerToken,{'x-workspace-id':personal.company.id}));
  const byKind=await readMobileTasks(request(ownerToken,{'x-workspace-kind':'personal'}));
  assert.deepEqual(byKind,explicit);
});
await check('remoção de uma empresa não bloqueia a lista de espaços',async()=>{
  globalThis.syncAudit.workspaces.find(w=>w.company.id===workspace.company.id).employees=
    workspace.employees.filter(e=>e.id!==employee.id);
  const response=await readMobileWorkspaces(request(employeeToken));
  assert.ok(response.workspaces.some(w=>w.kind==='personal'));
  assert.ok(!response.workspaces.some(w=>w.id===workspace.company.id));
  await assert.rejects(readMobileTasks(request(employeeToken)),{statusCode:401});
});
await check('permissões continuam válidas na atualização incremental',async()=>{
  const created=(await create(999999981)).task;
  const visible=(await readMobileTasks(request(employeeToken))).find(t=>t.serverId===created.serverId);
  assert.ok(visible); assert.equal(visible.canEdit,false);
  await assert.rejects(replaceMobileTasks(request(employeeToken),[{...visible,title:'Edição sem permissão'}],[],[visible]),{statusCode:403});
  assert.equal((await get(created.serverId)).title,created.title);
});
await check('pastas e listas têm controle de versão',async()=>{
  const base=await readMobileTaskOrganization(request());
  const organization={...base,folders:[...base.folders,{id:'audit-folder',name:'Pasta teste',position:0}]};
  const saved=await replaceMobileTaskOrganization(request(),organization,base);
  globalThis.syncAudit.workspaces.find(w=>w.company.id===workspace.company.id).taskFolders.find(f=>f.id==='audit-folder').name='Pasta no site';
  await assert.rejects(replaceMobileTaskOrganization(request(),{...saved,folders:saved.folders.map(f=>f.id==='audit-folder'?{...f,name:'Pasta no celular'}:f)},saved),{statusCode:409});
  assert.equal((await readMobileTaskOrganization(request())).folders.find(f=>f.id==='audit-folder').name,'Pasta no site');
});
await check('reenvio de organização confirmada não duplica pastas',async()=>{
  const base=await readMobileTaskOrganization(request());
  const desired={...base,folders:[...base.folders,{id:'audit-folder',name:'Pasta teste',position:0}]};
  await replaceMobileTaskOrganization(request(),desired,base);
  await replaceMobileTaskOrganization(request(),desired,base);
  assert.equal((await readMobileTaskOrganization(request())).folders.filter(f=>f.id==='audit-folder').length,1);
});
await check('lista não perde vínculo com tarefa ainda não sincronizada',async()=>{
  const base=await readMobileTaskOrganization(request());
  await assert.rejects(replaceMobileTaskOrganization(request(),{...base,lists:[...base.lists,{id:'audit-list',name:'Lista teste',position:0,taskIds:['999999990']}]},base),{statusCode:409});
  assert.deepEqual(await readMobileTaskOrganization(request()),base);
});
await check('ordenação explícita sincroniza sem alterar conteúdo',async()=>{
  const a=(await create(999999981)).task,b=(await create(999999982)).task;
  const base=(await readMobileTasks(request())).map(t=>t.serverId);
  const desired=[...base]; const i=desired.indexOf(a.serverId),j=desired.indexOf(b.serverId);
  [desired[i],desired[j]]=[desired[j],desired[i]];
  await replaceMobileTasks(request(),[],[],[],desired,base);
  assert.deepEqual((await readMobileTasks(request())).map(t=>t.serverId),desired);
  assert.equal((await get(a.serverId)).title,a.title);
  await replaceMobileTasks(request(),[],[],[],desired,base);
  assert.deepEqual((await readMobileTasks(request())).map(t=>t.serverId),desired);
});
await check('alterações incrementais não reordenam tarefas implicitamente',async()=>{
  const a=(await create(999999981)).task,b=(await create(999999982)).task;
  const before=(await readMobileTasks(request())).map(t=>t.serverId);
  await replaceMobileTasks(request(),[{...a,title:'Novo título A'},{...b,title:'Novo título B'}],[],[a,b]);
  assert.deepEqual((await readMobileTasks(request())).map(t=>t.serverId),before);
});
await check('ordenações concorrentes exigem revisão',async()=>{
  const a=(await create(999999981)).task,b=(await create(999999982)).task,c=(await create(999999983)).task;
  const base=(await readMobileTasks(request())).map(t=>t.serverId);
  const desired=[...base]; const i=desired.indexOf(a.serverId),j=desired.indexOf(b.serverId);
  [desired[i],desired[j]]=[desired[j],desired[i]];
  const ws=globalThis.syncAudit.workspaces.find(w=>w.company.id===workspace.company.id);
  const ci=ws.tasks.findIndex(t=>t.id===c.serverId),bi=ws.tasks.findIndex(t=>t.id===b.serverId);
  [ws.tasks[ci],ws.tasks[bi]]=[ws.tasks[bi],ws.tasks[ci]];
  await assert.rejects(replaceMobileTasks(request(),[],[],[],desired,base),{statusCode:409});
});
await check('dois aparelhos podem criar tarefas com o mesmo id numérico',async()=>{
  const a={...draft(999999981),clientId:'device-a-unique-task'};
  const b={...draft(999999981),clientId:'device-b-unique-task',title:'Segunda tarefa offline'};
  await replaceMobileTasks(request(),[a],[],[]); await replaceMobileTasks(request(),[b],[],[]);
  const first=await get(`native-${owner.id}-${a.clientId}`),second=await get(`native-${owner.id}-${b.clientId}`);
  assert.ok(first&&second); assert.notEqual(first.id,second.id); assert.notEqual(first.serverId,second.serverId);
  assert.equal(first.title,a.title); assert.equal(second.title,b.title);
});
await check('reenvio por clientId não duplica nem apaga edição posterior',async()=>{
  const item={...draft(999999981),clientId:'device-a-unique-task'};
  await replaceMobileTasks(request(),[item],[],[]);
  const id=`native-${owner.id}-${item.clientId}`; raw(id).title='Edição posterior';
  await replaceMobileTasks(request(),[item],[],[]);
  assert.equal((await get(id)).title,'Edição posterior');
});
await check('cliente antigo não confunde tarefa UUID com id numérico reutilizado',async()=>{
  const item={...draft(999999981),clientId:'device-a-unique-task'};
  await replaceMobileTasks(request(),[item],[],[]);
  await replaceMobileTasks(request(),[{...draft(999999981),title:'Criação por cliente antigo'}]);
  assert.equal((await get(`native-${owner.id}-${item.clientId}`)).title,item.title);
  assert.equal((await get(`native-${owner.id}-${item.id}`)).title,'Criação por cliente antigo');
});
await check('criação com resposta perdida não ressuscita tarefa excluída depois',async()=>{
  const item={...draft(999999981),clientId:'device-a-unique-task'};
  await replaceMobileTasks(request(),[item],[],[]);
  const task=await get(`native-${owner.id}-${item.clientId}`);
  await replaceMobileTasks(request(),[],[task.serverId],[task]);
  await assert.rejects(replaceMobileTasks(request(),[item],[],[]),{statusCode:409});
  assert.equal(await get(task.serverId),undefined);
});

globalThis.syncAudit=undefined;
assert.ok(!(await readDatabase()).sessions.some(s=>s.id?.startsWith(auditId)));
console.log(JSON.stringify({passed:results.length,scenarios:results,persistentWrites:writes}));
process.exit(0);
