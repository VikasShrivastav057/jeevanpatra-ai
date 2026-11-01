import { get, put } from '@vercel/blob';
import { PNG } from 'pngjs';
import { getAppSession, getStudioOwnerId, logActivity } from '../../../../lib/app-auth';
import { database } from '../../../../lib/database';
import { runtimeEnv } from '../../../../lib/runtime-env';
import { artworkSource, isArtworkArea, isArtworkFile, isArtworkReplacement, matchesArtwork } from '../../../../lib/artwork-generation';
import { artworkMask, compositeArtwork, decodeArtwork } from '../../../../lib/artwork-pixels';

const pending = new Set<string>();
const fail = (error: string, status = 400) => Response.json({ error }, { status, headers: { 'cache-control': 'no-store' } });
async function ownedImage(owner: string, src: string) {
  const object = await get(`profiles/${owner}/${src.split('/').pop()}`, { access: 'private', useCache: false });
  if (!object || (object.blob.size ?? 0) > 8_000_000) throw new Error('The saved artwork could not be opened.');
  return { bytes: new Uint8Array(await new Response(object.stream).arrayBuffer()), type: object.blob.contentType || 'image/png' };
}
export async function POST(request: Request) {
  const session = await getAppSession(request);
  if (!session) return fail('Sign in to generate artwork.', 401);
  const owner = getStudioOwnerId(session);
  if (!owner) return fail('A signed-in account is required.', 403);
  if (!runtimeEnv.OPENAI_API_KEY) return fail('Image generation is not connected yet. The administrator needs to connect the image-generation key.', 503);
  if (Number(request.headers.get('content-length')) > 20_000) return fail('Keep the artwork description under 2000 characters.');
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return fail('The artwork request could not be read.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('Choose an artwork area and describe the replacement.');
  if (Object.keys(body).some(key => !['template', 'variant', 'prompt', 'area', 'current', 'reference', 'referenceConsent', 'requestId'].includes(key))) return fail('Send only artwork choices, without personal biodata details.');
  const { template, variant = 'template', prompt, area, current, reference, referenceConsent, requestId } = body;
  if (typeof template !== 'string' || typeof variant !== 'string' || !['template', 'mahadev-radha-krishna', 'radha-krishna-replacement'].includes(variant)) return fail('Choose a valid template.');
  const source = artworkSource(template, variant);
  if (!source) return fail('This template has no background picture to replace. You can add an uploaded image instead.');
  if (typeof prompt !== 'string' || prompt.trim().length < 8 || prompt.length > 2000 || !isArtworkArea(area)) return fail('Describe the artwork in 8–2000 characters and select a valid area.');
  if (current != null && (!isArtworkReplacement(current) || !matchesArtwork(current, template, variant))) return fail('The saved artwork does not match this template.');
  if (reference != null && (!isArtworkFile(reference) || referenceConsent !== true)) return fail('Confirm that this uploaded artwork reference may be sent to OpenAI for this request.');
  if (typeof requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(requestId)) return fail('Start a fresh artwork request.');
  if (pending.has(owner)) return fail('An artwork request is already running. Wait for its preview.', 429);
  pending.add(owner);
  try {
    const fingerprint = JSON.stringify({ requestId, template, variant, prompt, area, current, reference });
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint)));
    const hex = Array.from(digest.slice(0, 16), byte => byte.toString(16).padStart(2, '0')).join('');
    const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    const filename = `generated-${id}.png`, key = `profiles/${owner}/${filename}`;
    const replacement = { src: `/api/photo/${filename}`, template, variant };
    // A retry of the same request reuses its private result instead of charging twice.
    if (await get(key, { access: 'private', useCache: false })) return Response.json({ replacement });
    const quota = await database.prepare("SELECT COUNT(*) AS count FROM activity_logs WHERE user_id = ? AND action = 'artwork_generation_requested' AND created_at > ?").bind(owner, Date.now() - 3_600_000).first<{ count: number }>();
    if (Number(quota?.count) >= 5) return fail('You have used five artwork generations this hour. Try again later or upload an image.', 429);
    const original = isArtworkReplacement(current) ? (await ownedImage(owner, current.src)).bytes : new Uint8Array(await (async () => {
      const response = await fetch(new URL(source, request.url), { signal: AbortSignal.timeout(15_000), redirect: 'error' });
      if (!response.ok) throw new Error('The template artwork could not be opened.');
      return response.arrayBuffer();
    })());
    const decoded = decodeArtwork(original);
    const images = [{ image_url: `data:image/png;base64,${PNG.sync.write(decoded).toString('base64')}` }];
    if (isArtworkFile(reference) && referenceConsent === true) {
      const ref = await ownedImage(owner, reference);
      images.push({ image_url: `data:${ref.type};base64,${Buffer.from(ref.bytes).toString('base64')}` });
    }
    await logActivity({ session, userId: owner, action: 'artwork_generation_requested', details: { template, area } });
    const result = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST', headers: { authorization: `Bearer ${runtimeEnv.OPENAI_API_KEY}`, 'content-type': 'application/json' },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(240_000)]),
      body: JSON.stringify({ model: runtimeEnv.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-sunburst', images,
        mask: { image_url: `data:image/png;base64,${artworkMask(decoded, area).toString('base64')}` },
        prompt: `Edit only the selected transparent mask area of the FIRST image, a premium biodata background. Replace the requested artwork with the subject the customer describes. Any second image is an artwork reference. Preserve the original style, lighting, background scenery, flowers and decorative details unless the artwork instruction explicitly changes them. Blend the replacement naturally. Outside the mask preserve everything exactly. Do not add any text, portrait, names, fields, typography or new frame. Keep the full image dimensions and composition. Customer artwork instruction: ${prompt}`,
        size: '1024x1536', quality: 'medium', output_format: 'png', n: 1 }),
    });
    const payload = await result.json().catch(() => undefined) as { data?: { b64_json?: string }[]; error?: { code?: string; type?: string } } | undefined;
    if (!result.ok) {
      const code = payload?.error?.code || payload?.error?.type;
      if (code === 'insufficient_quota' || code === 'billing_hard_limit_reached') return fail('Image generation needs API credits on the connected OpenAI account. The administrator must add credits before creating new pictures. Your biodata is unchanged.', 503);
      if (result.status === 401 || result.status === 403) return fail('The image service key or model access needs attention from the administrator. Your biodata is unchanged.', 503);
      if (result.status === 429) return fail('The image service is busy. Wait a little and try again. Your biodata is unchanged.', 429);
      return fail('The image service could not create this artwork. Try a clearer description or upload a reference image. Your biodata is unchanged.', 502);
    }
    const encoded = payload?.data?.[0]?.b64_json;
    if (!encoded || encoded.length > 40_000_000) return fail('The image service returned an invalid picture. Your biodata is unchanged.', 502);
    const output = compositeArtwork(decoded, decodeArtwork(Buffer.from(encoded, 'base64')), area);
    if (request.signal.aborted) return fail('Artwork generation was cancelled.', 499);
    await put(key, output, { access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'image/png', cacheControlMaxAge: 60 });
    return Response.json({ replacement }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return fail(error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name) ? 'The artwork request timed out or was cancelled. Your biodata is unchanged.' : 'Artwork could not be generated or stored. Please try again. Your biodata is unchanged.', 503);
  } finally { pending.delete(owner); }
}
