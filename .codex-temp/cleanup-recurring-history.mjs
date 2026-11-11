import assert from 'node:assert/strict';
import {readdirSync,readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root='/var/www/pop-organize',ref='/var/www/pop-organize-sync-JSXwNf/.output/server/_ssr';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const load=async pattern=>{const files=readdirSync(ref).filter(f=>pattern.test(f));assert.equal(files.length,1);const path=resolve(root,'.output/server/_ssr',files[0]);assert.equal(hash(readFileSync(path)),hash(readFileSync(resolve(ref,files[0]))));return import(pathToFileURL(path));};
const {readDatabase,mutateDatabase}=await load(/^database\.server-.*\.mjs$/);
const {s:materialize,t:advance}=await load(/^recurrence\.server-.*\.mjs$/);
const keepFrom='2026-11-10', cutoff='2026-11-09';
const clean=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
const eligible=t=>!!t.recurrence&&![t.nativeData?.recurrenceRule,t.nativeData?.recurrence].some(v=>typeof v==='string'&&['NAO REPETIR','SEM RECORRENCIA'].includes(clean(v)));
const remove=t=>eligible(t)&&/^\d{4}-\d{2}-\d{2}$/.test(t.dueDate)&&t.dueDate<=cutoff;
const seriesId=t=>t.recurrenceParentId??t.id;
const slot=t=>t.recurrenceSlotDate??t.dueDate;
function prepare(db){
 const ws=db.workspaces.find(w=>w.company.id==='c4');assert.equal(clean(ws.company.name),'SAO FRANCISCO');
 const before=structuredClone(ws.tasks),other=hash(db.workspaces.filter(w=>w!==ws));
 const deleted=ws.tasks.filter(remove),ids=new Set(deleted.map(t=>t.id));
 const protectedRows=ws.tasks.filter(t=>!ids.has(t.id));
 assert(!protectedRows.some(t=>eligible(t)&&slot(t)<keepFrom&&t.dueDate>=keepFrom),'Moved survivor needs special handling');
 const groups=new Map();for(const t of ws.tasks.filter(eligible)){const id=seriesId(t);groups.set(id,[...(groups.get(id)??[]),t]);}
 const anchors=[];
 for(const [id,tasks] of groups){
  if(tasks.some(t=>!ids.has(t.id)))continue;
  tasks.sort((a,b)=>slot(a).localeCompare(slot(b)));
  const template=tasks[0],end=[template.recurrence.endDate,template.recurrenceSeriesEndDate].filter(Boolean).sort()[0];
  const excluded=new Set(tasks.flatMap(t=>t.recurrenceExcludedDates??[]));
  let next=slot(template),steps=0;
  while((next<keepFrom||excluded.has(next))&&(!end||next<=end)){const n=advance(next,template.recurrence);assert(n>next);next=n;assert(++steps<10000);}
  if(end&&next>end)continue;
  const simulation=structuredClone(ws);
  for(const t of simulation.tasks)if(seriesId(t)!==id)delete t.recurrence;
  const originalIds=new Set(simulation.tasks.map(t=>t.id));
  materialize(simulation,next);
  const anchor=simulation.tasks.find(t=>!originalIds.has(t.id)&&seriesId(t)===id&&t.dueDate===next);
  assert(anchor,`No future anchor for ${id}`);assert(!ws.tasks.some(t=>t.id===anchor.id));
  anchor.recurrenceExcludedDates=[...excluded].sort();
  ws.tasks.push(anchor);anchors.push(anchor);
 }
 const backup={workspaceId:ws.company.id,workspaceName:ws.company.name,keepFrom,cutoff,createdAt:new Date().toISOString(),tasks:before,taskLists:structuredClone(ws.taskLists),mobileTaskCreationIds:structuredClone(ws.mobileTaskCreationIds??[]),removedIds:[...ids],futureAnchors:anchors,protectedHash:hash(protectedRows),otherWorkspacesHash:other};
 assert.equal(deleted.flatMap(t=>t.attachmentItems??[]).filter(a=>a.fileId).length,0,'Attachment blob backup required');
 ws.tasks=ws.tasks.filter(t=>!ids.has(t.id));
 for(const list of ws.taskLists??[])list.taskIds=list.taskIds.filter(id=>!ids.has(id));
 const tombstones=deleted.filter(t=>t.nativeData?.clientId).map(t=>t.id);
 ws.mobileTaskCreationIds=[...new Set([...(ws.mobileTaskCreationIds??[]),...tombstones])];
 assert.equal(hash(ws.tasks.filter(t=>!anchors.some(a=>a.id===t.id))),hash(protectedRows));
 assert.equal(hash(db.workspaces.filter(w=>w!==ws)),other);
 assert.equal(ws.tasks.filter(remove).length,0);
 const probe=structuredClone(ws);materialize(probe,'2027-01-11');
 assert.equal(probe.tasks.filter(remove).length,0,'Old history would regenerate');
 for(const [id,tasks] of groups){if(anchors.some(a=>seriesId(a)===id)||tasks.some(t=>!ids.has(t.id)))assert(probe.tasks.some(t=>seriesId(t)===id));}
 return {backup,result:{workspace:'SAO FRANCISCO',removed:deleted.length,nonRecurringPreserved:before.filter(t=>!t.recurrence).length,existingSinceYesterdayPreserved:before.filter(t=>t.dueDate>=keepFrom).length,futureAnchors:anchors.map(t=>({id:t.id,seriesId:seriesId(t),dueDate:t.dueDate})),remaining:ws.tasks.length,bySector:deleted.reduce((o,t)=>{const key=t.target.type==='department'?t.target.label:'Outros destinos';o[key]=(o[key]??0)+1;return o;},{}),protectedHash:hash(protectedRows)}};
}
if(!process.argv.includes('--apply')){const db=await readDatabase();console.log(JSON.stringify({mode:'dry-run',...prepare(db).result,persistentWrites:0}));}
else{
 const dir='/var/backups/pop-organize/recurring-history-'+new Date().toISOString().replace(/[:.]/g,'-');mkdirSync(dir,{recursive:true,mode:0o700});
 const result=await mutateDatabase(db=>{const prepared=prepare(db);assert(prepared.result.removed>0);writeFileSync(resolve(dir,'before.json'),JSON.stringify(prepared.backup),{mode:0o600,flag:'wx'});writeFileSync(resolve(dir,'planned-result.json'),JSON.stringify(prepared.result),{mode:0o600,flag:'wx'});return prepared.result;});
 const actual=await readDatabase(),ws=actual.workspaces.find(w=>w.company.id==='c4');
 assert.equal(ws.tasks.filter(remove).length,0);assert.equal(hash(ws.tasks.filter(t=>!result.futureAnchors.some(a=>a.id===t.id))),result.protectedHash);
 writeFileSync(resolve(dir,'verified-result.json'),JSON.stringify(result),{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({mode:'applied',...result,backup:dir,verified:true}));
}
process.exit(0);
