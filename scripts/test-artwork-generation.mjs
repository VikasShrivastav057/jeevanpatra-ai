import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { PNG } from 'pngjs';
const require = createRequire(import.meta.url);
const data = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
async function compile(path, deps = {}) {
  let code = ts.transpileModule(await readFile(new URL('../' + path, import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, esModuleInterop: true } }).outputText;
  for (const [name, url] of Object.entries(deps)) code = code.replaceAll(`from '${name}'`, `from '${url}'`);
  return data(code);
}
const instruction = await compile('lib/finishing-instruction.ts');
const generation = await compile('lib/artwork-generation.ts', { './finishing-instruction': instruction });
const pixels = await compile('lib/artwork-pixels.ts', { pngjs: pathToFileURL(require.resolve('pngjs')).href, 'jpeg-js': pathToFileURL(require.resolve('jpeg-js')).href });
const { requestsGeneratedArtwork, isArtworkArea, isArtworkReplacement } = await import(generation);
const { compositeArtwork, decodeArtwork, pixelArea } = await import(pixels);
let count = 0;
const check = (value, message) => { assert.ok(value, message); count++; };
for (const prompt of ['Replace RadhaKrishna Photo with Shri Ram and Mata Sita', 'Replace the image with a lotus, keep the same fonts and border.', 'Add a mountain painting. Do not change the photo of my face.', 'Generate a picture of a peacock']) check(requestsGeneratedArtwork(prompt), prompt);
for (const prompt of ['Move my profile photo 1% down.', 'Replace the text “ॐ नमः शिवाय” with “Jai Shri RadhaKrishna”. Keep the image unchanged.', 'Do not replace the artwork.', 'Change the font and preserve the picture.']) check(!requestsGeneratedArtwork(prompt), prompt);
check(!isArtworkArea({ x: 1, y: 1, width: Infinity, height: 5 }), 'infinite area rejected');
check(!isArtworkArea({ x: 95, y: 1, width: 10, height: 5 }), 'off-page area rejected');
check(!isArtworkReplacement({ src: '/api/photo/portrait.png', template: 'mahadev-parvati-devotional', variant: 'template' }), 'portrait cannot be used as generated artwork');
const original = new PNG({ width: 32, height: 48 }); original.data.fill(170);
const generated = new PNG({ width: 64, height: 96 }); generated.data.fill(20); for (let i = 3; i < generated.data.length; i += 4) generated.data[i] = 255;
const area = { x: 42, y: 1, width: 53, height: 36 };
const output = decodeArtwork(compositeArtwork(original, generated, area));
const box = pixelArea(original, area);
for (let y = 0; y < original.height; y++) for (let x = 0; x < original.width; x++) {
  const at = (y * original.width + x) * 4;
  const inside = x >= box.left && x < box.right && y >= box.top && y < box.bottom;
  assert.equal(output.data[at], inside ? 20 : 170); assert.equal(output.data[at + 3], 170);
} count++;
// Test the actual request handler; replace only external auth/storage/provider boundaries.
const store = new Map(); let quota = 0, calls = 0, providerStatus = 200, providerCode = '', captured, reads = [];
globalThis.__artworkTest = {
  session: { userId: 'qa-one', role: 'customer' },
  get: async key => { reads.push(key); return store.has(key) ? { blob: { size: store.get(key).length, contentType: 'image/png' }, stream: new Response(store.get(key)).body } : null; },
  put: async (key, bytes) => store.set(key, bytes),
  quota: () => quota,
};
const bridge = data('const t=globalThis.__artworkTest; export const get=(...a)=>t.get(...a),put=(...a)=>t.put(...a);');
const auth = data('const t=globalThis.__artworkTest;export const getAppSession=async()=>t.session;export const getStudioOwnerId=s=>s.userId;export const logActivity=async()=>{};');
const db = data('export const database={prepare:()=>({bind:()=>({first:async()=>({count:globalThis.__artworkTest.quota()})})})};');
const env = data('export const runtimeEnv={OPENAI_API_KEY:"test-key-not-real"};');
const routeUrl = await compile('app/api/ai/artwork/route.ts', { '@vercel/blob': bridge, pngjs: pathToFileURL(require.resolve('pngjs')).href, '../../../../lib/app-auth': auth, '../../../../lib/database': db, '../../../../lib/runtime-env': env, '../../../../lib/artwork-generation': generation, '../../../../lib/artwork-pixels': pixels });
const { POST } = await import(routeUrl);
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).includes('/templates/')) return new Response(PNG.sync.write(original));
  assert.equal(String(url), 'https://api.openai.com/v1/images/edits');
  calls++; captured = JSON.parse(init.body);
  return Response.json(providerStatus === 200 ? { data: [{ b64_json: PNG.sync.write(generated).toString('base64') }] } : { error: { code: providerCode } }, { status: providerStatus });
};
const base = { template: 'mahadev-parvati-devotional', variant: 'template', prompt: 'Replace artwork with Shri Ram and Mata Sita', area, requestId: crypto.randomUUID() };
const send = value => POST(new Request('http://localhost/api/ai/artwork', { method: 'POST', body: JSON.stringify(value) }));
try {
  let r = await send(base); check(r.ok, 'arbitrary artwork supported'); let result = await r.json(); check(isArtworkReplacement(result.replacement), 'private generated result');
  check(captured.images.length === 1 && !captured.prompt.includes('qa-one'), 'no portrait or personal values transmitted');
  check(store.size === 1 && [...store.keys()][0].startsWith('profiles/qa-one/generated-'), 'owner-scoped immutable result');
  await send(base); check(calls === 1, 'duplicate request reuses saved result');
  r = await send({ ...base, requestId: crypto.randomUUID(), current: result.replacement }); check(r.ok, 'repeated editing uses previous generated background');
  const ref = '/api/photo/artwork-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.png'; store.set('profiles/qa-one/' + ref.split('/').pop(), PNG.sync.write(original));
  r = await send({ ...base, reference: ref }); check(r.status === 400, 'reference export requires explicit consent');
  r = await send({ ...base, requestId: crypto.randomUUID(), reference: ref, referenceConsent: true }); check(r.ok && captured.images.length === 2, 'opted-in artwork reference transmitted');
  check(reads.every(key => key.startsWith('profiles/qa-one/')), 'all private reads stay within owner');
  r = await send({ ...base, requestId: crypto.randomUUID(), reference: '/api/photo/portrait.png', referenceConsent: true }); check(r.status === 400, 'profile image reference blocked');
  r = await send({ ...base, name: 'personal name' }); check(r.status === 400, 'personal-data request rejected');
  r = await send({ ...base, area: { ...area, x: 95 } }); check(r.status === 400, 'invalid mask rejected');
  globalThis.__artworkTest.session = null; r = await send(base); check(r.status === 401, 'sign-in required'); globalThis.__artworkTest.session = { userId: 'qa-two', role: 'admin' };
  r = await send({ ...base, current: result.replacement, requestId: crypto.randomUUID() }); check(!r.ok && calls === 3, 'another account cannot use first account artwork');
  quota = 5; r = await send({ ...base, requestId: crypto.randomUUID() }); check(r.status === 429, 'quota enforced before provider'); quota = 0;
  providerStatus = 429; providerCode = 'insufficient_quota'; r = await send({ ...base, requestId: crypto.randomUUID() }); check(r.status === 503 && /credits/.test((await r.json()).error), 'billing failure actionable');
  providerStatus = 403; r = await send({ ...base, requestId: crypto.randomUUID() }); check(r.status === 503, 'model/key access failure safe');
  check(store.size === 4, 'failed requests do not store proposed changes');
  console.log(`${count} artwork generation checks passed, including exact outside-mask pixel preservation.`);
} finally { globalThis.fetch = nativeFetch; delete globalThis.__artworkTest; }
