import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const clientRoot = fileURLToPath(new URL('./dist/client/', import.meta.url));
const worker = (await import('./dist/server/index.js')).default;
const port = Number(process.env.PORT || 80);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = createServer(async (incoming, outgoing) => {
  try {
    const protocol = firstHeader(incoming.headers['x-forwarded-proto']) || 'https';
    const host = firstHeader(incoming.headers['x-forwarded-host']) || incoming.headers.host || 'localhost';
    const url = new URL(incoming.url || '/', `${protocol}://${host}`);

    if ((incoming.method === 'GET' || incoming.method === 'HEAD') && await serveStatic(url, incoming.method, outgoing)) {
      return;
    }

    const headers = new Headers();
    for (const [name, value] of Object.entries(incoming.headers)) {
      if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
      else if (value !== undefined) headers.set(name, value);
    }

    const method = incoming.method || 'GET';
    const init = { method, headers };
    if (method !== 'GET' && method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
      init.body = Buffer.concat(chunks);
    }

    const response = await worker.fetch(new Request(url, init), process.env, {
      waitUntil(promise) {
        Promise.resolve(promise).catch((error) => console.error('Background task failed', error));
      },
    });

    outgoing.statusCode = response.status;
    outgoing.statusMessage = response.statusText;
    response.headers.forEach((value, name) => {
      if (name.toLowerCase() !== 'set-cookie') outgoing.setHeader(name, value);
    });
    const cookies = response.headers.getSetCookie?.() || [];
    if (cookies.length) outgoing.setHeader('set-cookie', cookies);

    if (!response.body || method === 'HEAD') {
      outgoing.end();
      return;
    }
    Readable.fromWeb(response.body).pipe(outgoing);
  } catch (error) {
    console.error('Request failed', error);
    if (!outgoing.headersSent) {
      outgoing.statusCode = 500;
      outgoing.setHeader('content-type', 'text/plain; charset=utf-8');
    }
    outgoing.end('The site could not complete this request.');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`JeevanPatra is listening on port ${port}`);
});

async function serveStatic(url, method, outgoing) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return false;
  }
  if (pathname.includes('\0')) return false;

  const filePath = resolve(clientRoot, `.${pathname}`);
  const safeRoot = clientRoot.endsWith(sep) ? clientRoot : `${clientRoot}${sep}`;
  if (filePath !== clientRoot && !filePath.startsWith(safeRoot)) return false;

  let details;
  try {
    details = await stat(filePath);
  } catch {
    return false;
  }
  if (!details.isFile()) return false;

  outgoing.statusCode = 200;
  outgoing.setHeader('content-length', String(details.size));
  outgoing.setHeader('content-type', contentTypes[extname(filePath).toLowerCase()] || 'application/octet-stream');
  outgoing.setHeader('cache-control', pathname.startsWith('/_next/static/')
    ? 'public, max-age=31536000, immutable'
    : 'public, max-age=3600');
  if (method === 'HEAD') outgoing.end();
  else createReadStream(filePath).pipe(outgoing);
  return true;
}

function firstHeader(value) {
  return Array.isArray(value) ? value[0] : value?.split(',')[0]?.trim();
}

