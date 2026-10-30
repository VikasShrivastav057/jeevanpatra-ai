import { env } from 'cloudflare:workers';
import { createAppSession, getRequestAuditDetails, hashCustomerPassword, logActivity, normalizeCustomerEmail } from '../../../../lib/app-auth';

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return invalid('Enter a valid email address and password.'); }
  const email = normalizeCustomerEmail((body as { email?: unknown })?.email);
  const password = typeof (body as { password?: unknown })?.password === 'string' ? (body as { password: string }).password : '';
  const passwordError = validatePassword(password);
  if (!email) return invalid('Enter a valid email address.');
  if (passwordError) return invalid(passwordError);
  if (email === env.ADMIN_EMAIL?.trim().toLowerCase()) return Response.json({ error: 'Use the administrator sign-in for this email address.' }, { status: 409 });

  const existing = await env.DB.prepare('SELECT id FROM app_users WHERE identifier = ? LIMIT 1').bind(email).first<{ id?: string }>();
  if (existing?.id) return Response.json({ error: 'An account already exists for this email. Sign in instead.' }, { status: 409 });

  const userId = `usr_${crypto.randomUUID()}`;
  const now = Date.now();
  const passwordHash = await hashCustomerPassword(password);
  try {
    await env.DB.prepare(`INSERT INTO app_users
      (id, identifier, identifier_type, password_hash, display_name, created_at, verified_at, last_login_at)
      VALUES (?, ?, 'email', ?, NULL, ?, ?, ?)`)
      .bind(userId, email, passwordHash, now, now, now).run();
  } catch {
    return Response.json({ error: 'An account already exists for this email. Sign in instead.' }, { status: 409 });
  }

  const issued = await createAppSession({ userId, role: 'customer', identifier: email });
  await logActivity({ session: issued.session, action: 'account_created', details: getRequestAuditDetails(request) });
  return Response.json({ status: 'created', role: 'customer' }, { status: 201, headers: { 'set-cookie': issued.cookie, 'cache-control': 'no-store' } });
}

function validatePassword(password: string) {
  if (password.length < 8) return 'Use at least 8 characters for your password.';
  if (password.length > 128) return 'Keep your password under 128 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Include at least one letter and one number in your password.';
  return '';
}

function invalid(message: string) {
  return Response.json({ error: message }, { status: 400 });
}
