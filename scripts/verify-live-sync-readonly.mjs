import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

let writes = 0;
registerHooks({ load(url, context, next) {
  if (/\/database\.server-[^/]+\.mjs$/.test(url)) {
    let source = readFileSync(new URL(url), 'utf8');
    assert.ok(source.includes('async function readDatabase() {'));
    assert.ok(source.includes('async function mutateDatabase(mutator) {'));
    assert.ok(source.includes('function normalizePlatformDatabase('));
    source = source.replace('async function readDatabase() {', 'async function readDatabase() { if(globalThis.syncAudit) return structuredClone(globalThis.syncAudit);');
    source = source.replace('async function mutateDatabase(mutator) {', 'async function mutateDatabase(mutator) { if(!globalThis.syncAudit) throw new Error("Audit forbids persistent writes"); const copy=structuredClone(globalThis.syncAudit); const result=await mutator(copy); globalThis.syncAudit=JSON.parse(JSON.stringify(normalizePlatformDatabase(copy))); return result;');
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
  createdAt:new Date().toISOString(),expiresAt:'9999-12-31T23:59:59.999Z',
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
await check('conclusão do João na teste compartilhada aparece para Cintia',async()=>{
  const john=globalThis.syncAudit.accounts.find(a=>a.id==='u24');
  assert.ok(john,'Joao must exist in this regression fixture');
  const johnToken=randomBytes(32).toString('hex');
  globalThis.syncAudit.sessions.push({id:auditId+'-john',userId:john.id,activeCompanyId:workspace.company.id,createdAt:new Date().toISOString(),expiresAt:'9999-12-31T23:59:59.999Z',
    tokenHash:createHash('sha256').update(johnToken).digest('hex')});
  const original=raw('t2458');
  assert.ok(original.responsibleIds.includes(john.id)&&original.responsibleIds.includes(employee.id));
  original.status='pending';
  const task=(await readMobileTasks(request(johnToken))).find(t=>t.serverId===original.id);
  assert.ok(task.canComplete); assert.equal(task.requiresReview,false);
  await replaceMobileTasks(request(johnToken),[{...task,completed:true}],[],[task]);
  assert.equal((await readMobileTasks(request(johnToken))).find(t=>t.serverId===original.id).completed,true);
  assert.equal((await readMobileTasks(request(employeeToken))).find(t=>t.serverId===original.id).completed,true);
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

function johnSession() {
  const token=randomBytes(32).toString('hex');
  globalThis.syncAudit.sessions.push({id:auditId+'-status-john',userId:'u24',activeCompanyId:workspace.company.id,createdAt:new Date().toISOString(),expiresAt:'9999-12-31T23:59:59.999Z',
    tokenHash:createHash('sha256').update(token).digest('hex')});
  raw('t2458').status='pending';
  return token;
}
const statusCommand=(token,completed,mutationId=randomUUID(),serverId='t2458')=>
  replaceMobileTasks(request(token),[],[],[],undefined,undefined,[{serverId,completed,mutationId}]);
await check('comando de conclusão do João tem confirmação e chega à Cintia',async()=>{
  const token=johnSession(); const mutationId=randomUUID();
  const response=await statusCommand(token,true,mutationId);
  assert.equal(response.statusResults[0].mutationId,mutationId);
  assert.equal(response.statusResults[0].task.serverId,'t2458');
  assert.equal(response.statusResults[0].task.completed,true);
  assert.equal('attachmentData' in response.statusResults[0].task,false);
  assert.equal((await readMobileTasks(request(employeeToken))).find(t=>t.serverId==='t2458').completed,true);
});
await check('reenvio da mesma conclusão não desfaz reabertura posterior',async()=>{
  const token=johnSession(); const mutationId=randomUUID();
  await statusCommand(token,true,mutationId);
  await statusCommand(ownerToken,false);
  const replay=await statusCommand(token,true,mutationId);
  assert.equal(replay.statusResults[0].replayed,true);
  assert.equal(replay.statusResults[0].task.completed,false);
  assert.equal(raw('t2458').status,'pending');
});
await check('recibo não pode ser reutilizado com outra ação ou pessoa',async()=>{
  const token=johnSession();const mutationId=randomUUID();
  await statusCommand(token,true,mutationId);
  await assert.rejects(statusCommand(token,false,mutationId),{statusCode:409});
  await assert.rejects(statusCommand(employeeToken,true,mutationId),{statusCode:409});
  assert.equal(raw('t2458').status,'completed');
});
await check('conflitos de conteúdo e ordem não impedem conclusão independente',async()=>{
  const token=johnSession();
  const a=(await create(999999981)).task,b=(await create(999999982)).task;
  raw(a.serverId).description='Edição de outro aparelho';
  const ws=globalThis.syncAudit.workspaces.find(w=>w.company.id===workspace.company.id);
  const ai=ws.tasks.findIndex(t=>t.id===a.serverId),bi=ws.tasks.findIndex(t=>t.id===b.serverId);
  [ws.tasks[ai],ws.tasks[bi]]=[ws.tasks[bi],ws.tasks[ai]];
  await statusCommand(token,true);
  assert.equal(raw('t2458').status,'completed');
  assert.equal(raw(a.serverId).description,'Edição de outro aparelho');
});
await check('conclusão negada não grava recibo nem altera a tarefa',async()=>{
  johnSession();
  const ws=globalThis.syncAudit.workspaces.find(w=>w.company.id===workspace.company.id);
  const member=ws.employees.find(e=>e.id===employee.id);
  member.permissionGroupId='audit-no-status';
  ws.permissionGroups.push({id:'audit-no-status',name:'Memory-only test',description:'',permissions:['tasks.viewAll']});
  const mutationId=randomUUID();
  await assert.rejects(statusCommand(employeeToken,true,mutationId),{statusCode:403});
  assert.equal(raw('t2458').status,'pending');
  assert.equal(ws.mobileTaskStatusMutations?.[mutationId],undefined);
});
await check('tarefa excluída não é recriada por conclusão pendente',async()=>{
  const task=(await create(999999981)).task;
  await replaceMobileTasks(request(),[],[task.serverId],[task]);
  await assert.rejects(statusCommand(ownerToken,true,randomUUID(),task.serverId),{statusCode:404});
  assert.equal(await get(task.serverId),undefined);
});
await check('um comando reabrir devolve o mesmo estado aos dois responsáveis',async()=>{
  const token=johnSession();
  await statusCommand(token,true);
  const response=await statusCommand(ownerToken,false);
  assert.equal(response.statusResults[0].task.completed,false);
  assert.equal((await readMobileTasks(request(token))).find(t=>t.serverId==='t2458').completed,false);
  assert.equal((await readMobileTasks(request(employeeToken))).find(t=>t.serverId==='t2458').completed,false);
});

await check('chegada à VPS prevalece por campo sem reenviar uma cópia inteira',async()=>{
  const {task}=await create(999999870);
  const first={...task,title:'Primeiro envio'};
  const second={...task,title:'Último envio'};
  await replaceMobileTasks(request(),[first],[],[task],undefined,undefined,[],{mutationId:randomUUID(),policy:'arrival'});
  raw(task.serverId).description='Descrição alterada no site';
  await replaceMobileTasks(request(),[second],[],[task],undefined,undefined,[],{mutationId:randomUUID(),policy:'arrival'});
  assert.equal(raw(task.serverId).title,'Último envio');
  assert.equal(raw(task.serverId).description,'Descrição alterada no site');
});
await check('repetir envio cuja resposta se perdeu não desfaz edição posterior',async()=>{
  const {task}=await create(999999871);
  const first={...task,title:'Celular A'},second={...task,title:'Celular B'};
  const id=randomUUID();
  await replaceMobileTasks(request(),[first],[],[task],undefined,undefined,[],{mutationId:id,policy:'arrival'});
  await replaceMobileTasks(request(),[second],[],[task],undefined,undefined,[],{mutationId:randomUUID(),policy:'arrival'});
  const replay=await replaceMobileTasks(request(),[first],[],[task],undefined,undefined,[],{mutationId:id,policy:'arrival'});
  assert.equal(replay.replayed,true);
  assert.equal(raw(task.serverId).title,'Celular B');
  await assert.rejects(replaceMobileTasks(request(),[{...first,title:'Conteúdo trocado'}],[],[task],undefined,undefined,[],{mutationId:id,policy:'arrival'}),{statusCode:409});
});
await check('exclusão explícita recebida por último respeita a política e sua confirmação',async()=>{
  const {task}=await create(999999872);
  raw(task.serverId).title='Alterado antes da exclusão';
  const id=randomUUID();
  await replaceMobileTasks(request(),[],[task.serverId],[task],undefined,undefined,[],{mutationId:id,policy:'arrival'});
  assert.equal(raw(task.serverId),undefined);
  const replay=await replaceMobileTasks(request(),[],[task.serverId],[task],undefined,undefined,[],{mutationId:id,policy:'arrival'});
  assert.equal(replay.replayed,true);
});
await check('pastas mantêm alterações não concorrentes e não reaplicam envio antigo',async()=>{
  const before=await readMobileTaskOrganization(request());
  const first={folders:[...before.folders,{id:'folder-arrival-a',name:'Primeiro nome',position:20}],lists:before.lists};
  const id=randomUUID();
  await replaceMobileTaskOrganization(request(),first,before,{mutationId:id,policy:'arrival'});
  const current=await readMobileTaskOrganization(request());
  const later={...current,folders:current.folders.map(row=>row.id==='folder-arrival-a'?{...row,name:'Nome posterior'}:row)};
  await replaceMobileTaskOrganization(request(),later,current,{mutationId:randomUUID(),policy:'arrival'});
  const replay=await replaceMobileTaskOrganization(request(),first,before,{mutationId:id,policy:'arrival'});
  assert.equal(replay.replayed,true);
  assert.equal((await readMobileTaskOrganization(request())).folders.find(row=>row.id==='folder-arrival-a').name,'Nome posterior');
});

globalThis.syncAudit=undefined;
assert.ok(!(await readDatabase()).sessions.some(s=>s.id?.startsWith(auditId)));
console.log(JSON.stringify({passed:results.length,scenarios:results,persistentWrites:writes}));
process.exit(0);
