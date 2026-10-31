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
const plan = await compile('../lib/finishing-plan.ts', { './blessing-edit': blessing, './devotional-artwork': artwork });
try { await import(await compile('./test-finishing-plan.mts', { '../lib/finishing-plan': plan })); }
catch (error) { console.error(String(error.stack || error).replace(/data:text\/javascript;base64,[a-zA-Z0-9+/=]+/g, 'test-module')); process.exitCode = 1; }

