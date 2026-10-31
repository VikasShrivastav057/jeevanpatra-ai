import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import ts from 'typescript';
const dataUrl = text => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
async function compile(path, dependencies = {}) {
  let code = ts.transpileModule(await readFile(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  for (const [name, value] of Object.entries(dependencies)) code = code.replaceAll(`from '${name}'`, `from '${value}'`);
  return dataUrl(code);
}
// Isolate authentication and database I/O; execute the actual route validation and JSON persistence.
const databaseModule = dataUrl('export const writes=[]; export const database={prepare(sql){return {bind(...args){return {async first(){return null}, async run(){writes.push(args)}}}}}};');
const { writes } = await import(databaseModule);
const { POST } = await import(await compile('../app/api/biodata/route.ts', {
  '../../../lib/app-auth': dataUrl('export async function getAppSession(req){return req.headers.has("x-no-session")?null:{role:req.headers.get("x-role")||"customer",userId:"photo_qa"}}; export function getStudioOwnerId(s){return s.role==="admin"?"admin_primary":s.userId}; export async function logActivity(){};'),
  '../../../lib/database': databaseModule,
  '../../../lib/chroma': dataUrl('export async function upsertProfileInChroma(){return "not_configured"}'),
  '../../../lib/template-catalog': await compile('../lib/template-catalog.ts'),
  '../../../lib/uploaded-artwork': await compile('../lib/uploaded-artwork.ts'),
  '../../../lib/photo-adjustment': await compile('../lib/photo-adjustment.ts'),
}));
async function post(body, headers = {}) { return POST(new Request('http://qa/api/biodata', { method: 'POST', headers, body: JSON.stringify(body) })); }
const base = { name: 'Photo QA', introduction: '', template: 'mahadev-parvati-devotional', photoKey: 'profiles/photo_qa/portrait.png', completed: true, details: { profileFields: [{ id: 'phone', label: 'Phone', value: '9999999999', section: 'contact' }], photoAdjustment: { crop: { x: 61.5, y: 24, zoom: 2.4 }, placement: { x: 45, y: 40, width: 20 } } } };
for (const role of ['customer', 'admin']) {
  assert.equal((await post(base, { 'x-role': role })).status, 200);
  const saved = JSON.parse(writes.at(-1)[6]); assert.deepEqual(saved, base.details); assert.equal(writes.at(-1)[1], role === 'admin' ? 'admin_primary' : 'photo_qa');
}
const before = writes.length;
for (const invalid of [{ crop: { x: -1, y: 0, zoom: 1 } }, { crop: { x: 50, y: 18, zoom: 8 } }, { crop: { x: 50, y: 18, zoom: 1 }, placement: { x: 99, y: 0, width: 30 } }, { crop: { x: 50, y: 18, zoom: 1 }, placement: { x: 0, y: 99, width: 30 } }, { crop: { x: '50', y: 18, zoom: 1 } }, { ...base.details.photoAdjustment, src: 'https://other-file' }]) assert.equal((await post({ ...base, details: { ...base.details, photoAdjustment: invalid } })).status, 400);
assert.equal(writes.length, before);
assert.equal((await post(base, { 'x-no-session': '1' })).status, 401); assert.equal(writes.length, before);
assert.equal((await post({ ...base, details: { ...base.details, photoAdjustment: null } })).status, 200); assert.equal(JSON.parse(writes.at(-1)[6]).photoAdjustment, null);
console.log('Photo adjustment storage, both roles, reset, invalid values and unauthenticated requests passed.');

