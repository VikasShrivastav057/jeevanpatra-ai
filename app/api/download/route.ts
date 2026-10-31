import { getAppSession, getRequestAuditDetails, getStudioOwnerId, logActivity } from '../../../lib/app-auth';
import { database } from '../../../lib/database';

export async function POST(request: Request) {
  const session = await getAppSession(request);
  if (!session) return Response.json({ error: 'Sign in before downloading.' }, { status: 401 });
  const ownerId = getStudioOwnerId(session);
  if (!ownerId) return Response.json({ error: 'A signed-in account is required for downloads.' }, { status: 403 });
  const profile = await database.prepare(`SELECT id, name, template, status, completed_at AS "completedAt"
    FROM biodata_profiles WHERE owner_id = ? LIMIT 1`).bind(ownerId).first<Record<string, unknown>>();
  if (!profile || profile.status !== 'completed' || typeof profile.completedAt !== 'number') {
    return Response.json({ error: 'Save your completed biodata before downloading.' }, { status: 409 });
  }
  await logActivity({ session, action: 'download', biodataId: typeof profile.id === 'string' ? profile.id : null, details: { format: 'print_pdf', template: profile.template, name: profile.name, ...getRequestAuditDetails(request) } });
  return Response.json({ allowed: true });
}
