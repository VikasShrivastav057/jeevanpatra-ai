import { getAppSession } from '../../../lib/app-auth';

export async function GET(request: Request) {
  const session = await getAppSession(request);
  return Response.json(session ? {
    signedIn: true,
    role: session.role,
    identifier: session.identifier,
    displayName: session.displayName,
  } : { signedIn: false }, { headers: { 'cache-control': 'private, no-store' } });
}
