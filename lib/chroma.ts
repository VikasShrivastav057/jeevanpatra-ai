import { env } from 'cloudflare:workers';

type ProfileDocument = { id: string; ownerId: string; name: string; introduction: string; template: string; details: unknown };

export async function upsertProfileInChroma(profile: ProfileDocument): Promise<'saved' | 'not_configured'> {
  const config = env as unknown as Record<string, string | undefined>;
  const baseUrl = config.CHROMA_URL?.replace(/\/$/, '');
  const { CHROMA_API_KEY: apiKey, CHROMA_TENANT: tenant, CHROMA_DATABASE: database } = config;
  if (!baseUrl || !apiKey || !tenant || !database) return 'not_configured';
  const headers = { 'content-type': 'application/json', 'x-chroma-token': apiKey };
  const path = `${baseUrl}/api/v2/tenants/${encodeURIComponent(tenant)}/databases/${encodeURIComponent(database)}`;
  const signal = AbortSignal.timeout(5000);
  const collectionResponse = await fetch(`${path}/collections`, { method: 'POST', headers, body: JSON.stringify({ name: 'jeevanpatra_profiles', get_or_create: true }), signal });
  if (!collectionResponse.ok) throw new Error(`Chroma collection request failed (${collectionResponse.status})`);
  const collection = (await collectionResponse.json()) as { id: string };
  const upsertResponse = await fetch(`${path}/collections/${collection.id}/upsert`, { method: 'POST', headers, body: JSON.stringify({ ids: [profile.id], documents: [`${profile.name}. ${profile.introduction}`], metadatas: [{ ownerId: profile.ownerId, name: profile.name, template: profile.template, details: JSON.stringify(profile.details ?? {}) }] }), signal });
  if (!upsertResponse.ok) throw new Error(`Chroma profile save failed (${upsertResponse.status})`);
  return 'saved';
}
