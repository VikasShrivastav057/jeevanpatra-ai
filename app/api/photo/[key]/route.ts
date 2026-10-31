import { get } from '@vercel/blob';
import { getAppSession, getStudioOwnerId } from '../../../../lib/app-auth';

export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const session = await getAppSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });
  const ownerId = getStudioOwnerId(session);
  if (!ownerId) return new Response('Unauthorized', { status: 401 });
  const { key } = await params;
  if (!/^portrait\.(?:jpg|png)$/.test(key)) return new Response('Not found', { status: 404 });
  const object = await get(`profiles/${ownerId}/${key}`, { access: 'private', useCache: false });
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.stream, { headers: { 'content-type': object.blob.contentType ?? 'image/jpeg', 'cache-control': 'private, no-store, max-age=0' } });
}
