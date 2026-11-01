import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const url = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
let session = { role: 'customer', userId: 'qa-upload' }, stored = [], failStorage = false;
globalThis.__uploadTest = { session: () => session, put: async (...args) => { if (failStorage) throw Error('Storage offline'); stored.push(args); } };
const auth = url('export const getAppSession=async()=>globalThis.__uploadTest.session();export const getStudioOwnerId=s=>s.role==="admin"?"qa-admin":s.userId;');
const blob = url('export const put=(...args)=>globalThis.__uploadTest.put(...args);');
let code = ts.transpileModule(await readFile(new URL('../app/api/photo/route.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
code = code.replace("from '@vercel/blob'", `from '${blob}'`).replace("from '../../../lib/app-auth'", `from '${auth}'`);
const { POST } = await import(url(code));
const bytes = new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
const send = (purpose, image = new File([bytes], 'picture.png', { type: 'image/png' })) => { const form = new FormData(); form.set('purpose', purpose); form.set('photo', image); return POST(new Request('http://qa/api/photo', { method: 'POST', body: form })); };
try {
  let r = await send('replacement'); assert.equal(r.status, 200); assert.match((await r.json()).url, /^\/api\/photo\/generated-[\w-]+\.png$/); assert.match(stored[0][0], /^profiles\/qa-upload\/generated-/);
  assert.equal(stored[0][2].access, 'private');
  await send('artwork'); assert.match(stored.at(-1)[0], /\/artwork-/);
  await send('portrait'); assert.equal(stored.at(-1)[0], 'profiles/qa-upload/portrait.png');
  session = { role: 'admin' }; await send('replacement'); assert.match(stored.at(-1)[0], /^profiles\/qa-admin\/generated-/);
  r = await send('replacement', new File(['bad'], 'picture.png', { type: 'image/png' })); assert.equal(r.status, 400);
  r = await send('replacement', new File([new Uint8Array([255,216,255])], 'picture.jpg', { type: 'image/jpeg' })); assert.equal(r.status, 400);
  r = await send('replacement', new File([new Uint8Array(8_000_001)], 'picture.png', { type: 'image/png' })); assert.equal(r.status, 400);
  failStorage = true; r = await send('replacement'); assert.equal(r.status, 503);
  session = null; const count = stored.length; r = await send('replacement'); assert.equal(r.status, 401); assert.equal(stored.length, count);
  console.log('12 upload checks passed: owner isolation, admin, private storage, portrait separation, type/magic/size validation and failure handling.');
} finally { delete globalThis.__uploadTest; }
