import { env } from 'cloudflare:workers';
import { getAppSession } from '../../../../lib/app-auth';

export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const session = await getAppSession(request);
  if (!session || session.role !== 'customer' || !session.userId) return new Response('Unauthorized', { status: 401 });
  const { key } = await params;
  if (!/^portrait\.(?:jpg|png)$/.test(key)) return new Response('Not found', { status: 404 });
  const object = await env.FILES.get(`profiles/${session.userId}/${key}`);
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body, { headers: { 'content-type': object.httpMetadata?.contentType ?? 'image/jpeg', 'cache-control': 'private, no-store, max-age=0' } });
}
