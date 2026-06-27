export const dynamic = 'force-dynamic';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';
import speakeasy from 'speakeasy';

export async function POST(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.split(' ')[1];
  let user;
  try { user = verifyToken(token); } catch { return Response.json({ error: 'Invalid token' }, { status: 401 }); }

  const { code } = await request.json();
  const userData = await query('SELECT totp_secret FROM users WHERE id = $1', [user.id]);
  const secret = userData.rows[0]?.totp_secret;
  if (!secret) return Response.json({ error: '2FA not set up' }, { status: 400 });

  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 1,
  });

  if (verified) {
    return Response.json({ message: '2FA verified' });
  } else {
    return Response.json({ error: 'Invalid code' }, { status: 400 });
  }
}
