import assert from 'node:assert/strict';
import { POST } from '../app/api/ai/finalize/route';
const instruction='Switch the font to a modern sans serif typeface.';
const body={name:'QA',introduction:'I enjoy reading.',recommendation:instruction,currentTemplate:'classic-red',fields:[{id:'phone',label:'Phone',section:'contact',hasValue:true}],changeTargets:[],improvementMode:'requested-only'};
const valid={operations:[{target:'design.fontStyle',value:'modern',evidence:instruction}],unfulfilled:[]};
const upstream=(content: unknown)=>Response.json({choices:[{message:{content:typeof content==='string'?content:JSON.stringify(content)}}]});
const originalFetch=globalThis.fetch;let count=0;
async function check(name: string, replies: Array<Response|Error>, expectedStatus=200, override: Record<string,unknown>={}, headers: Record<string,string>={}){
 const calls: Array<{model:string;messages:Array<{role:string;content:string}>}>=[];
 globalThis.fetch=async(input,init)=>{assert.equal(String(input),'https://api.groq.com/openai/v1/chat/completions');calls.push(JSON.parse(String(init?.body)));const next=replies[Math.min(calls.length-1,replies.length-1)];if(next instanceof Error)throw next;return next.clone();};
 try{const response=await POST(new Request('http://qa/api/ai/finalize',{method:'POST',headers,body:JSON.stringify({...body,...override})}));const data=await response.json() as {design:{fontStyle:string};fieldUpdates:unknown[];introduction:string;fieldOrder:string[];error?:string};assert.equal(response.status,expectedStatus,name+': '+JSON.stringify(data));if(expectedStatus===200){assert.equal(data.design.fontStyle,'modern');assert.deepEqual(data.fieldUpdates,[]);assert.equal(data.introduction,body.introduction);assert.deepEqual(data.fieldOrder,['phone']);}else assert.ok(data.error);count++;return {calls,data};}finally{globalThis.fetch=originalFetch;}
}
for(const [name,first] of [['bad JSON','not JSON'],['missing requested edit',{operations:[],unfulfilled:[]}],['false unsupported response',{operations:[],unfulfilled:['Font changes are unsupported']}],['unrelated template operation',{operations:[{target:'template',value:'other',evidence:instruction}],unfulfilled:[]}]] as const){const {calls}=await check(name,[upstream(first),upstream(valid)]);assert.equal(calls.length,2);assert.equal(calls[1].messages[1].content,calls[0].messages[1].content);assert.match(calls[1].messages.at(-1)!.content,/previous plan failed verification/i);assert.match(calls[1].messages.at(-1)!.content,/unchanged instruction/);}
for(const status of [429,500,503,404]){const {calls}=await check('upstream '+status,[Response.json({}, {status}),upstream(valid)]);assert.equal(calls.length,2);}
assert.equal((await check('network fallback',[new Error('network unavailable'),upstream(valid)])).calls.length,2);
const exhausted=await check('bounded invalid plans',[upstream({operations:[],unfulfilled:['Upload a new image first.']})],422);assert.equal(exhausted.calls.length,3);assert.match(exhausted.data.error!,/Upload a new image first/);
const limited=await check('rate limit wait guidance',[Response.json({}, {status:429,headers:{'retry-after':'7'}})],429);assert.equal(limited.calls.length,2);assert.match(limited.data.error!,/7 seconds/);
assert.equal((await check('auth boundary',[upstream(valid)],401,{}, {'x-no-session':'1'})).calls.length,0);
assert.equal((await check('private values rejected',[upstream(valid)],400,{fields:[{...body.fields[0],value:'private'}]})).calls.length,0);
assert.equal((await check('direct verified style',[upstream('must not be called')],200,{recommendation:'Use a modern font, keep the photo and colours unchanged.'})).calls.length,0);
assert.equal((await check('contradiction blocks',[upstream(valid)],422,{recommendation:'Use a modern font. Keep the fonts unchanged.'})).calls.length,0);
try{let calls=0;globalThis.fetch=async()=>{calls++;return upstream(valid)};const abort=new AbortController();abort.abort();const response=await POST(new Request('http://qa/api/ai/finalize',{method:'POST',body:JSON.stringify(body),signal:abort.signal}));assert.equal(response.status,499);assert.equal(calls,0);count++;}finally{globalThis.fetch=originalFetch;}
console.log(`${count} real-route retry, repair feedback, provider fallback, privacy, cancellation and direct-edit checks passed.`);
