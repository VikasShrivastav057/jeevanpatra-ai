import { getAppSession } from '../../../../lib/app-auth';
import { database } from '../../../../lib/database';

export async function GET(request: Request) {
  const session = await getAppSession(request);
  if (!session) return Response.json({ error: 'Admin sign-in required.' }, { status: 401 });
  if (session.role !== 'admin') return Response.json({ error: 'Admin access required.' }, { status: 403 });

  const [counts, users, profiles, activities] = await Promise.all([
    database.prepare(`SELECT
      (SELECT COUNT(*)::int FROM app_users) AS customers,
      (SELECT COUNT(*)::int FROM biodata_profiles) AS creations,
      (SELECT COUNT(*)::int FROM biodata_profiles WHERE status = 'completed') AS completed,
      (SELECT COUNT(*)::int FROM activity_logs WHERE action = 'download') AS downloads`).first<Record<string, unknown>>(),
    database.prepare(`SELECT u.id, u.identifier, u.identifier_type AS "identifierType", u.created_at AS "createdAt",
      u.last_login_at AS "lastLoginAt",
      COUNT(DISTINCT p.id)::int AS creations,
      COUNT(*) FILTER (WHERE a.action = 'download')::int AS downloads
      FROM app_users u
      LEFT JOIN biodata_profiles p ON p.owner_id = u.id
      LEFT JOIN activity_logs a ON a.user_id = u.id
      GROUP BY u.id ORDER BY u.last_login_at DESC LIMIT 100`).all<Record<string, unknown>>(),
    database.prepare(`SELECT p.id, p.owner_id AS "ownerId", u.identifier, p.name, p.introduction, p.template,
      p.profile_json AS "profileJson", p.status, p.created_at AS "createdAt", p.completed_at AS "completedAt", p.updated_at AS "updatedAt"
      FROM biodata_profiles p LEFT JOIN app_users u ON u.id = p.owner_id
      ORDER BY p.updated_at DESC LIMIT 100`).all<Record<string, unknown>>(),
    database.prepare(`SELECT id, user_id AS "userId", actor_identifier AS "actorIdentifier", actor_role AS "actorRole",
      action, biodata_id AS "biodataId", details_json AS "detailsJson", created_at AS "createdAt"
      FROM activity_logs ORDER BY created_at DESC LIMIT 200`).all<Record<string, unknown>>(),
  ]);

  return Response.json({
    counts: counts ?? {},
    users: users.results.map((row) => ({ ...row, creations: Number(row.creations || 0), downloads: Number(row.downloads || 0) })),
    profiles: profiles.results.map((row) => ({ ...row, details: parseJson(row.profileJson), profileJson: undefined })),
    activities: activities.results.map((row) => ({ ...row, details: parseJson(row.detailsJson), detailsJson: undefined })),
  }, { headers: { 'cache-control': 'private, no-store' } });
}

function parseJson(value: unknown) {
  if (typeof value !== 'string') return {};
  try { return JSON.parse(value) as unknown; } catch { return {}; }
}

