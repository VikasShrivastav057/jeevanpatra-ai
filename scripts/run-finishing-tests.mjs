import { readFile } from 'node:fs/promises';
import ts from 'typescript';
// Execute the real TypeScript guard modules without a framework server or test-only behaviour.
const url = text => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
async function compile(path, dependencies = {}) {
  let code = ts.transpileModule(await readFile(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  for (const [name, replacement] of Object.entries(dependencies)) code = code.replaceAll(`from '${name}'`, `from '${replacement}'`).replaceAll(`from "${name}"`, `from "${replacement}"`);
  return url(code);
}
const blessing = await compile('../lib/blessing-edit.ts');
const artwork = await compile('../lib/devotional-artwork.ts');
const position = await compile('../lib/blessing-position.ts');
const order = await compile('../lib/field-order.ts');
const instruction = await compile('../lib/finishing-instruction.ts');
const plan = await compile('../lib/finishing-plan.ts', { './blessing-edit': blessing, './devotional-artwork': artwork, './blessing-position': position, './field-order': order, './finishing-instruction': instruction });
const route = await compile('../app/api/ai/finalize/route.ts', {
  '../../../../lib/app-auth': url('export async function getAppSession(request) { return request.headers.has("x-no-session") ? null : {role:"customer",userId:"qa"}; }'),
  '../../../../lib/runtime-env': url('export const runtimeEnv = { GROQ_API_KEY: "synthetic-key-never-sent" };'),
  '../../../../lib/groq-models': await compile('../lib/groq-models.ts'),
  '../../../../lib/template-catalog': await compile('../lib/template-catalog.ts'),
  '../../../../lib/finishing-plan': plan, '../../../../lib/blessing-position': position,
});
try {
  await import(await compile('./test-field-order.mts', { '../lib/field-order.ts': order }));
  await import(await compile('./test-finishing-plan.mts', { '../lib/finishing-plan': plan }));
  await import(await compile('./test-finishing-reliability.mts', { '../lib/finishing-plan': plan }));
  await import(await compile('./test-finishing-route.mts', { '../app/api/ai/finalize/route': route }));
}
catch (error) { console.error(String(error.stack || error).replace(/data:text\/javascript;base64,[a-zA-Z0-9+/=]+/g, 'test-module')); process.exitCode = 1; }
