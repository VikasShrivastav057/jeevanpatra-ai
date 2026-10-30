import { env } from 'cloudflare:workers';
import { createAppSession, getRequestAuditDetails, logActivity, verifyAdminPassword } from '../../../../lib/app-auth';

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return denied(); }
  const email = typeof (body as { email?: unknown })?.email === 'string' ? (body as { email: string }).email.trim().toLowerCase() : '';
  const password = typeof (body as { password?: unknown })?.password === 'string' ? (body as { password: string }).password : '';
  const expectedEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
  const recentFailures = await env.DB.prepare("SELECT COUNT(*) AS total FROM activity_logs WHERE action = 'admin_login_failed' AND created_at > ?")
    .bind(Date.now() - 15 * 60 * 1000).first<{ total?: number }>();
  if ((recentFailures?.total ?? 0) >= 10) return Response.json({ error: 'Too many admin sign-in attempts. Please wait 15 minutes.' }, { status: 429 });
  const validPassword = await verifyAdminPassword(password);
  if (!expectedEmail || email !== expectedEmail || !validPassword) {
    await logActivity({ identifier: email || 'unknown-admin', role: 'admin', action: 'admin_login_failed', details: getRequestAuditDetails(request) });
    await new Promise((resolve) => setTimeout(resolve, 450));
    return denied();
  }
  const issued = await createAppSession({ userId: null, role: 'admin', identifier: expectedEmail });
  await logActivity({ session: issued.session, action: 'admin_login', details: getRequestAuditDetails(request) });
  return Response.json({ status: 'verified', role: 'admin' }, { headers: { 'set-cookie': issued.cookie, 'cache-control': 'no-store' } });
}

function denied() {
  return Response.json({ error: 'The admin email or password is incorrect.' }, { status: 401 });
}
