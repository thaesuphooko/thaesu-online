export const dynamic = 'force-dynamic';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.split(' ')[1];
  let user;
  try { user = verifyToken(token); } catch { return Response.json({ error: 'Invalid token' }, { status: 401 }); }

  const secret = speakeasy.generateSecret({ name: `Thaesu:${user.email}` });
  // Store secret temporarily; in production store in users table
  const otpauth_url = secret.otpauth_url;
  const qrImage = await QRCode.toDataURL(otpauth_url);

  // Save secret to user record
  await query('UPDATE users SET totp_secret = $1 WHERE id = $2', [secret.base32, user.id]);

  return Response.json({ secret: secret.base32, qr: qrImage });
}
