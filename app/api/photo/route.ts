import { env } from 'cloudflare:workers';
import { getAppSession } from '../../../lib/app-auth';

export async function POST(request: Request) {
  const session = await getAppSession(request);
  if (!session) return Response.json({ error: 'Sign in to upload a photo.' }, { status: 401 });
  if (session.role !== 'customer' || !session.userId) return Response.json({ error: 'A customer account is required.' }, { status: 403 });
  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: 'The photo upload could not be read.' }, { status: 400 }); }
  const photo = form.get('photo');
  if (!(photo instanceof File) || !['image/jpeg', 'image/png'].includes(photo.type) || photo.size > 5_000_000) return Response.json({ error: 'Choose a JPG or PNG under 5 MB.' }, { status: 400 });
  const extension = photo.type === 'image/png' ? 'png' : 'jpg';
  const key = `profiles/${session.userId}/portrait.${extension}`;
  try { await env.FILES.put(key, photo.stream(), { httpMetadata: { contentType: photo.type } }); }
  catch { return Response.json({ error: 'Photo storage is temporarily unavailable.' }, { status: 503 }); }
  return Response.json({ key, url: `/api/photo/portrait.${extension}`, status: 'uploaded' });
}
