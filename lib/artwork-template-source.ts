import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runtimeEnv } from './runtime-env';

export async function readTemplateArtwork(source: string, requestUrl: string): Promise<Uint8Array> {
  if (!/^\/templates\/[a-z-]+\.(?:png|jpg)$/.test(source)) throw new Error('Invalid template artwork path.');
  if (process.env.NODE_ENV === 'production') {
    // The Vercel container ships these exact static files. Avoid a self-request through the deployment gateway.
    return new Uint8Array(await readFile(resolve(process.cwd(), 'dist/client', source.slice(1))));
  }
  const origin = runtimeEnv.PUBLIC_SITE_URL || (runtimeEnv.VERCEL_PROJECT_PRODUCTION_URL ? `https://${runtimeEnv.VERCEL_PROJECT_PRODUCTION_URL}` : requestUrl);
  const response = await fetch(new URL(source, origin), { signal: AbortSignal.timeout(15_000), redirect: 'error' });
  if (!response.ok) throw new Error(`The template artwork could not be opened (${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}
