import { getAppSession, getStudioOwnerId, logActivity } from '../../../lib/app-auth';
import { isArtworkReplacement } from '../../../lib/artwork-generation';
import { upsertProfileInChroma } from '../../../lib/chroma';
import { database } from '../../../lib/database';
import { builtInTemplateIds, type TemplateId } from '../../../lib/template-catalog';
import { isUploadedArtwork } from '../../../lib/uploaded-artwork';
import { isPhotoAdjustment } from '../../../lib/photo-adjustment';

const validTemplates = new Set<TemplateId>([...builtInTemplateIds, 'ai-custom']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function invalid(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  const session = await getAppSession(request);
  if (!session) return Response.json({ error: 'Sign in to save your biodata.' }, { status: 401 });
  const ownerId = getStudioOwnerId(session);
  if (!ownerId) return Response.json({ error: 'A signed-in account is required to save biodata.' }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch { return invalid('The biodata could not be read.'); }
  if (!isRecord(body)) return invalid('The biodata request is invalid.');

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const introduction = typeof body.introduction === 'string' ? body.introduction.trim() : '';
  const template = typeof body.template === 'string' && validTemplates.has(body.template as TemplateId) ? body.template as TemplateId : undefined;
  const photoKey = typeof body.photoKey === 'string' ? body.photoKey : body.photoKey == null ? undefined : null;
  if (!name || name.length > 120) return invalid('Add a name shorter than 120 characters.');
  if (introduction.length > 1600) return invalid('Keep the introduction under 1600 characters.');
  if (!template) return invalid('Choose a valid template.');
  if (isRecord(body.details) && body.details.artworkReplacement != null && !isArtworkReplacement(body.details.artworkReplacement)) return invalid('Choose a valid generated artwork image.');
  if (isRecord(body.details) && body.details.uploadedArtwork != null && !isUploadedArtwork(body.details.uploadedArtwork)) return invalid('Choose a valid uploaded artwork image and placement.');
  if (isRecord(body.details) && body.details.photoAdjustment != null && !isPhotoAdjustment(body.details.photoAdjustment)) return invalid('Choose a valid profile photo crop, position and size.');
  if (photoKey === null || (photoKey && (photoKey.length > 300 || !/^profiles\/[a-zA-Z0-9_-]+\/portrait\.(?:jpg|png)$/.test(photoKey)))) return invalid('Choose a valid uploaded photo.');

  let profileJson: string;
  try { profileJson = JSON.stringify(body.details ?? {}); } catch { return invalid('The profile details could not be saved.'); }
  if (profileJson.length > 200_000) return invalid('The profile contains too much information.');

  const id = `bio_${ownerId}`;
  const completed = body.completed === true;
  const now = Date.now();
  try {
    const existing = await database.prepare('SELECT id FROM biodata_profiles WHERE id = ? LIMIT 1').bind(id).first<{ id?: string }>();
    await database.prepare(`INSERT INTO biodata_profiles (id, owner_id, name, introduction, template, photo_key, profile_json, status, created_at, completed_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, introduction = excluded.introduction, template = excluded.template,
        photo_key = excluded.photo_key, profile_json = excluded.profile_json, status = excluded.status,
        completed_at = excluded.completed_at, updated_at = excluded.updated_at`)
      .bind(id, ownerId, name, introduction, template, photoKey ?? null, profileJson, completed ? 'completed' : 'draft', now, completed ? now : null, now).run();
    await logActivity({ session, action: existing?.id ? 'biodata_updated' : 'biodata_created', biodataId: id, details: { name, template, status: completed ? 'completed' : 'draft' } });
  } catch {
    return Response.json({ error: 'Storage is temporarily unavailable. Please try again.' }, { status: 503 });
  }

  let chroma: 'saved' | 'not_configured' | 'unavailable' = 'not_configured';
  try { chroma = await upsertProfileInChroma({ id, ownerId, name, introduction, template, details: body.details }); } catch { chroma = 'unavailable'; }
  return Response.json({ id, status: completed ? 'completed' : 'draft', chroma });
}

export async function GET(request: Request) {
  const session = await getAppSession(request);
  if (!session) return Response.json({ error: 'Sign in required.' }, { status: 401 });
  const ownerId = getStudioOwnerId(session);
  if (!ownerId) return Response.json({ error: 'A signed-in account is required.' }, { status: 403 });
  try {
    const row = await database.prepare('SELECT id, name, introduction, template, photo_key AS "photoKey", profile_json AS "profileJson", status, completed_at AS "completedAt", updated_at AS "updatedAt" FROM biodata_profiles WHERE owner_id = ? LIMIT 1').bind(ownerId).first<Record<string, unknown>>();
    if (!row) return Response.json({ profile: null });
    let details: unknown = {};
    try { details = typeof row.profileJson === 'string' ? JSON.parse(row.profileJson) : {}; } catch { details = {}; }
    const { profileJson: _profileJson, ...profile } = row;
    return Response.json({ profile: { ...profile, details } });
  } catch {
    return Response.json({ error: 'Storage is temporarily unavailable. Please try again.' }, { status: 503 });
  }
}
