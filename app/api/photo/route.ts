import { put } from '@vercel/blob';
import { getAppSession, getStudioOwnerId } from '../../../lib/app-auth';

export async function POST(request: Request) {
  const session = await getAppSession(request);
  if (!session) return Response.json({ error: 'Sign in to upload a photo.' }, { status: 401 });
  const ownerId = getStudioOwnerId(session);
  if (!ownerId) return Response.json({ error: 'A signed-in account is required.' }, { status: 403 });
  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: 'The photo upload could not be read.' }, { status: 400 }); }
  const photo = form.get('photo');
  const isArtwork = form.get('purpose') === 'artwork';
  const acceptedTypes = isArtwork ? ['image/jpeg', 'image/png', 'image/webp'] : ['image/jpeg', 'image/png'];
  if (!(photo instanceof File) || !acceptedTypes.includes(photo.type) || photo.size === 0 || photo.size > 5_000_000) return Response.json({ error: isArtwork ? 'Choose a JPG, PNG or WebP under 5 MB.' : 'Choose a JPG or PNG under 5 MB.' }, { status: 400 });
  if (isArtwork) {
    const bytes = new Uint8Array(await photo.slice(0, 12).arrayBuffer());
    const valid = photo.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : photo.type === 'image/png' ? [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)
      : String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
    if (!valid) return Response.json({ error: 'This file is not a valid image. Choose a JPG, PNG or WebP.' }, { status: 400 });
  }
  const extension = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
  const filename = isArtwork ? `artwork-${crypto.randomUUID()}.${extension}` : `portrait.${extension}`;
  const key = `profiles/${ownerId}/${filename}`;
  try {
    await put(key, photo, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: photo.type,
      cacheControlMaxAge: 60,
    });
  }
  catch { return Response.json({ error: 'Photo storage is temporarily unavailable.' }, { status: 503 }); }
  return Response.json({ key, url: `/api/photo/${filename}`, status: 'uploaded' });
}

