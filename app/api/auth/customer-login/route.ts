import { env } from 'cloudflare:workers';
import { createAppSession, getRequestAuditDetails, hashCustomerPassword, logActivity, normalizeCustomerEmail, verifyCustomerPassword } from '../../../../lib/app-auth';

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return denied(); }
  const email = normalizeCustomerEmail((body as { email?: unknown })?.email);
  const password = typeof (body as { password?: unknown })?.password === 'string' ? (body as { password: string }).password : '';
  if (!email || !password || password.length > 128) return denied();

  const recentFailures = await env.DB.prepare("SELECT COUNT(*) AS total FROM activity_logs WHERE actor_identifier = ? AND action = 'customer_login_failed' AND created_at > ?")
    .bind(email, Date.now() - 15 * 60 * 1000).first<{ total?: number }>();
  if ((recentFailures?.total ?? 0) >= 10) return Response.json({ error: 'Too many sign-in attempts. Please wait 15 minutes.' }, { status: 429 });

  const user = await env.DB.prepare('SELECT id, password_hash AS passwordHash FROM app_users WHERE identifier = ? LIMIT 1')
    .bind(email).first<{ id?: string; passwordHash?: string | null }>();
  let valid = false;
  if (typeof user?.passwordHash === 'string') valid = await verifyCustomerPassword(password, user.passwordHash);
  else await hashCustomerPassword(password);
  if (!user?.id || !valid) {
    await logActivity({ identifier: email, role: 'customer', action: 'customer_login_failed', details: getRequestAuditDetails(request) });
    return denied();
  }

  const now = Date.now();
  await env.DB.prepare('UPDATE app_users SET last_login_at = ? WHERE id = ?').bind(now, user.id).run();
  const issued = await createAppSession({ userId: user.id, role: 'customer', identifier: email });
  await logActivity({ session: issued.session, action: 'login', details: { method: 'password', ...getRequestAuditDetails(request) } });
  return Response.json({ status: 'verified', role: 'customer' }, { headers: { 'set-cookie': issued.cookie, 'cache-control': 'no-store' } });
}

function denied() {
  return Response.json({ error: 'The email or password is incorrect.' }, { status: 401 });
}
