import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';

export type AppRole = 'customer' | 'admin';

export type AppSession = {
  sessionId: string;
  userId: string | null;
  role: AppRole;
  identifier: string;
  displayName: string | null;
  expiresAt: number;
};

const SESSION_COOKIE = 'jp_session';
const CUSTOMER_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const ADMIN_SESSION_MS = 12 * 60 * 60 * 1000;

export async function getAppSession(request?: Request): Promise<AppSession | null> {
  const secret = env.SESSION_SECRET;
  if (!secret) return null;
  const requestHeaders = request?.headers ?? await headers();
  const token = readCookie(requestHeaders.get('cookie'), SESSION_COOKIE);
  if (!token || token.length > 200) return null;
  const sessionId = await sha256Hex(`${token}:${secret}`);
  const row = await env.DB.prepare(`SELECT s.id AS sessionId, s.user_id AS userId, s.role, s.identifier,
      s.expires_at AS expiresAt, u.display_name AS displayName
    FROM auth_sessions s LEFT JOIN app_users u ON u.id = s.user_id
    WHERE s.id = ? LIMIT 1`).bind(sessionId).first<Record<string, unknown>>();
  if (!row || (row.role !== 'customer' && row.role !== 'admin') || typeof row.expiresAt !== 'number') return null;
  if (row.expiresAt <= Date.now()) {
    await env.DB.prepare('DELETE FROM auth_sessions WHERE id = ?').bind(sessionId).run();
    return null;
  }
  return {
    sessionId,
    userId: typeof row.userId === 'string' ? row.userId : null,
    role: row.role,
    identifier: typeof row.identifier === 'string' ? row.identifier : '',
    displayName: typeof row.displayName === 'string' ? row.displayName : null,
    expiresAt: row.expiresAt,
  };
}

export async function createAppSession(input: {
  userId: string | null;
  role: AppRole;
  identifier: string;
}): Promise<{ cookie: string; session: AppSession }> {
  if (!env.SESSION_SECRET) throw new Error('Session security is not configured.');
  const token = randomToken(32);
  const sessionId = await sha256Hex(`${token}:${env.SESSION_SECRET}`);
  const now = Date.now();
  const expiresAt = now + (input.role === 'admin' ? ADMIN_SESSION_MS : CUSTOMER_SESSION_MS);
  await env.DB.prepare(`INSERT INTO auth_sessions
    (id, user_id, role, identifier, created_at, expires_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(sessionId, input.userId, input.role, input.identifier, now, expiresAt, now).run();
  return {
    cookie: `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor((expiresAt - now) / 1000)}`,
    session: { sessionId, userId: input.userId, role: input.role, identifier: input.identifier, displayName: null, expiresAt },
  };
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function revokeAppSession(session: AppSession) {
  await env.DB.prepare('DELETE FROM auth_sessions WHERE id = ?').bind(session.sessionId).run();
}

export async function logActivity(input: {
  session?: AppSession | null;
  userId?: string | null;
  identifier?: string;
  role?: AppRole;
  action: string;
  biodataId?: string | null;
  details?: Record<string, unknown>;
}) {
  const session = input.session;
  const identifier = input.identifier ?? session?.identifier ?? 'unknown';
  const role = input.role ?? session?.role ?? 'customer';
  let detailsJson = '{}';
  try { detailsJson = JSON.stringify(input.details ?? {}); } catch { detailsJson = '{}'; }
  if (detailsJson.length > 8_000) detailsJson = JSON.stringify({ note: 'Activity details exceeded the storage limit.' });
  await env.DB.prepare(`INSERT INTO activity_logs
    (id, user_id, actor_identifier, actor_role, action, biodata_id, details_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(`act_${crypto.randomUUID()}`, input.userId ?? session?.userId ?? null, identifier, role, input.action, input.biodataId ?? null, detailsJson, Date.now()).run();
}

export function normalizeCustomerEmail(value: unknown) {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) && raw.length <= 254 ? raw.toLowerCase() : null;
}

export async function hashCustomerPassword(password: string) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const iterations = 310_000;
  const hash = await derivePassword(password, salt, iterations, 32);
  return `pbkdf2_sha256:${iterations}:${toBase64Url(salt)}:${toBase64Url(hash)}`;
}

export async function verifyCustomerPassword(password: string, stored: string) {
  return verifyStoredPassword(password, stored);
}

export async function verifyAdminPassword(password: string) {
  const stored = env.ADMIN_PASSWORD_HASH;
  if (!stored || password.length > 300) return false;
  return verifyStoredPassword(password, stored);
}

async function verifyStoredPassword(password: string, stored: string) {
  if (!password || password.length > 300) return false;
  // Colon delimiters are safe in dotenv files; keep `$` support for existing
  // deployments created before the credential format was updated.
  const [algorithm, iterationsRaw, saltEncoded, hashEncoded] = stored.includes(':') ? stored.split(':') : stored.split('$');
  const iterations = Number(iterationsRaw);
  if (algorithm !== 'pbkdf2_sha256' || !Number.isSafeInteger(iterations) || iterations < 100_000 || !saltEncoded || !hashEncoded) return false;
  try {
    const expected = fromBase64Url(hashEncoded);
    const actual = await derivePassword(password, fromBase64Url(saltEncoded), iterations, expected.byteLength);
    return constantTimeEqual(actual, expected);
  } catch { return false; }
}

export function getRequestAuditDetails(request: Request) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
  return {
    ip: maskIp(ip),
    browser: (request.headers.get('user-agent') || 'Unknown browser').slice(0, 280),
  };
}

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return null;
}

function randomToken(bytes: number) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return toBase64Url(values);
}

async function derivePassword(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number, bytes: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, bytes * 8));
}

async function sha256Hex(value: string) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toBase64Url(value: Uint8Array) {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function maskIp(value: string) {
  if (!value) return 'Unavailable';
  if (value.includes(':')) return `${value.split(':').slice(0, 3).join(':')}::/48`;
  const parts = value.split('.');
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0/24` : 'Unavailable';
}
