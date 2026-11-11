import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root='/var/www/pop-organize', ref='/var/www/pop-organize-sync-JSXwNf/.output/server/_ssr';
const load=async(pattern)=>{
  const names=readdirSync(ref).filter(f=>pattern.test(f));assert.equal(names.length,1);
  return import(pathToFileURL(resolve(root,'.output/server/_ssr',names[0])));
};
const {readDatabase}=await load(/^database\.server-.*\.mjs$/);
const db=await readDatabase();
const ws=db.workspaces.find(w=>w.company.id==='c4');
const clean=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
assert.equal(clean(ws.company.name),'SAO FRANCISCO');
const keepFrom='2026-11-10';
const noRepeat=t=>t.nativeData&&[t.nativeData.recurrenceRule,t.nativeData.recurrence].some(v=>typeof v==='string'&&['NAO REPETIR','SEM RECORRENCIA'].includes(clean(v)));
const eligible=t=>!!t.recurrence&&!noRepeat(t);
const removed=ws.tasks.filter(t=>eligible(t)&&t.dueDate<keepFrom);
const series=new Map();
for(const task of ws.tasks.filter(eligible)){const id=task.recurrenceParentId??task.id;series.set(id,[...(series.get(id)??[]),task]);}
const allOld=[...series].filter(([,tasks])=>tasks.every(t=>t.dueDate<keepFrom));
const activeAllOld=allOld.filter(([,tasks])=>tasks.some(t=>(!t.recurrence.endDate||t.recurrence.endDate>=keepFrom)&&(!t.recurrenceSeriesEndDate||t.recurrenceSeriesEndDate>=keepFrom)));
const movedSurvivors=ws.tasks.filter(t=>eligible(t)&&t.dueDate>=keepFrom&&(t.recurrenceSlotDate??t.dueDate)<keepFrom);
const grouped=removed.reduce((out,t)=>{const name=t.target.type==='department'?t.target.label:'Outros destinos';out[name]=(out[name]??0)+1;return out;},{});
console.log(JSON.stringify({workspace:ws.company.name,workspaceId:ws.company.id,keepFrom,total:ws.tasks.length,
  toRemove:removed.length,bySector:grouped,byStatus:removed.reduce((out,t)=>(out[t.status]=(out[t.status]??0)+1,out),{}),
  nonRecurringToPreserve:ws.tasks.filter(t=>!t.recurrence).length,ambiguousNoRepeatToPreserve:ws.tasks.filter(t=>t.recurrence&&noRepeat(t)).length,
  datedYesterdayAndLaterToPreserve:ws.tasks.filter(t=>t.dueDate>=keepFrom).length,
  recurringSeries:series.size,allOldSeries:allOld.length,activeSeriesNeedingFutureAnchor:activeAllOld.length,movedSurvivorsNeedingExclusion:movedSurvivors.length,
  affectedAttachmentFileIds:[...new Set(removed.flatMap(t=>(t.attachmentItems??[]).map(a=>a.fileId)))].length,
  activeSeriesRules:activeAllOld.map(([id,tasks])=>({seriesId:id,lastDate:tasks.map(t=>t.dueDate).sort().at(-1),rule:tasks[0].recurrence})),
  departments:ws.departments.map(d=>({id:d.id,name:d.name})),persistentWrites:0}));
process.exit(0);
