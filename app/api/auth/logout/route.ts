import { clearSessionCookie, getAppSession, logActivity, revokeAppSession } from '../../../../lib/app-auth';

export async function POST(request: Request) {
  const session = await getAppSession(request);
  if (session) {
    await logActivity({ session, action: 'logout' });
    await revokeAppSession(session);
  }
  return Response.json({ status: 'signed-out' }, { headers: { 'set-cookie': clearSessionCookie(), 'cache-control': 'no-store' } });
}
