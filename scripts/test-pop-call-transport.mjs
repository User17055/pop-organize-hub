import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// Exercise the real component handlers without requiring microphone hardware.
const source = await readFile(new URL("../src/components/tasks/pop-assistant.tsx", import.meta.url), "utf8");
const ast = ts.createSourceFile("pop-assistant.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "PopAssistant");
const names = new Set(["appendCallTranscript", "flushPendingCallReply", "executeCallDraftTool", "handleCallEvent"]);
const handlers = component.body.statements.filter((node) => ts.isFunctionDeclaration(node) && names.has(node.name?.text)).map((node) => node.getText(ast)).join("\n");
assert.equal(component.body.statements.filter((node) => ts.isFunctionDeclaration(node) && names.has(node.name?.text)).length, 4);
const guard = await readFile(new URL("../src/lib/pop-call-session.ts", import.meta.url), "utf8");
const fixtureSource = `${guard}
export function fixture(preparePopCallDraft) {
 const sent = [], errors = [], answers = [];
 const callSessionRef = {current:new PopCallSession()};
 const generation = callSessionRef.current.begin();
 const callChannelRef = {current:{readyState:"open",send(raw){sent.push(JSON.parse(raw));}}};
 const callResponseActiveRef = {current:false}, callSpeechActiveRef = {current:false};
 const pendingCallReplyRef = {current:null}, pendingToolResumeRef = {current:false};
 const callAudioNeedsFadeInRef = {current:false};
 const handledCallItemsRef = {current:new Set()}, messagesRef = {current:[]}, answerRef = {current:null};
 const setMessages = ()=>{}, setAnswer = value=>answers.push(value), setCallState = ()=>{};
 const setError = value=>errors.push(value), fadeCallAudio = ()=>{}, isMeaningfulCallTranscript = ()=>true;
 ${handlers}
 return {sent,errors,answers,answerRef,messagesRef,generation,callSessionRef,
   emit(event){handleCallEvent(JSON.stringify(event),generation);},
   speech:callSpeechActiveRef, active:callResponseActiveRef};
}`;
const js = ts.transpileModule(fixtureSource, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {fixture} = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const done = (id = "r1", count = 1) => ({type:"response.done",response:{id,status:"completed",output:Array.from({length:count},(_,i)=>({type:"function_call",name:"preparar_rascunho",call_id:`call-${i}`,arguments:JSON.stringify({draft:{title:`Task ${i}`},missingFields:[]})}))}});
const settle = () => new Promise(resolve => setImmediate(resolve));

test("voice transcripts are logged once without calling the text assistant", () => {
  const f = fixture(async()=>{throw new Error("Unexpected tool call");});
  const input = {type:"conversation.item.input_audio_transcription.completed",item_id:"u",transcript:"Troque para amanhã"};
  f.emit(input); f.emit(input);
  f.emit({type:"response.output_audio_transcript.done",item_id:"a",transcript:"Mudei para amanhã."});
  assert.deepEqual(f.messagesRef.current.map(x=>x.role),["user","assistant"]);
  assert.equal(f.sent.length,0);
});
test("tool output is returned once and then the native conversation resumes", async () => {
  let calls=0;
  const f=fixture(async({data})=>{calls++;return {status:"ready",draft:data.draft};});
  f.emit(done()); f.emit(done()); await settle();
  assert.equal(calls,1);
  assert.deepEqual(f.sent.map(x=>x.type),["conversation.item.create","response.create"]);
  assert.equal(f.sent[0].item.type,"function_call_output");
  assert.equal(JSON.parse(f.sent[0].item.output).created,false);
  assert.equal(f.answers[0].draft.title,"Task 0");
});
test("all tool results are sent before starting one response", async () => {
  const order=[];
  const f=fixture(async({data})=>{order.push(data.draft.title);return {status:"ready",draft:data.draft};});
  f.emit(done("multi",2)); await settle();
  assert.deepEqual(order,["Task 0","Task 1"]);
  assert.deepEqual(f.sent.map(x=>x.type),["conversation.item.create","conversation.item.create","response.create"]);
});
test("a response from a closed call cannot change the draft or a new call", async () => {
  let finish;
  const f=fixture(()=>new Promise(resolve=>{finish=resolve;}));
  f.emit(done()); await settle();
  f.callSessionRef.current.end(); f.callSessionRef.current.begin();
  finish({status:"ready",draft:{title:"Old call"}}); await settle();
  assert.equal(f.answers.length,0);
  assert.equal(f.sent.length,0);
});
test("tool failures are explained to the voice model without claiming creation", async () => {
  const f=fixture(async()=>{throw new Error("Sem permissão para criar tarefas.");});
  f.emit(done()); await settle();
  const output=JSON.parse(f.sent[0].item.output);
  assert.equal(output.created,false);
  assert.match(output.error,/Sem permissão/);
  assert.equal(f.answers.length,0);
});
test("a tool result does not start speaking over an active user turn", async () => {
  const f=fixture(async()=>({status:"ready",draft:{title:"Task"}}));
  f.emit({type:"input_audio_buffer.speech_started"});
  f.emit(done()); await settle();
  assert.deepEqual(f.sent.map(x=>x.type),["conversation.item.create"]);
  f.emit({type:"input_audio_buffer.speech_stopped"});
  f.emit({type:"response.created"});
  f.emit({type:"response.done",response:{id:"next",status:"completed",output:[]}});
  assert.equal(f.sent.filter(x=>x.type==="response.create").length,0);
});
