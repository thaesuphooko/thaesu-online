export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { randomBytes } from 'crypto';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.split(' ')[1];
  let user;
  try { user = verifyToken(token); } catch { return Response.json({ error: 'Invalid token' }, { status: 401 }); }
  let res = await query('SELECT code FROM referrals WHERE referrer_id = $1 LIMIT 1', [user.id]);
  if (res.rows.length > 0) return Response.json({ code: res.rows[0].code });
  const code = 'THAESU' + randomBytes(4).toString('hex').toUpperCase();
  await query('INSERT INTO referrals (referrer_id, code) VALUES ($1, $2)', [user.id, code]);
  return Response.json({ code });
}

export async function POST(request) {
  const { code, userId } = await request.json();
  const ref = await query('SELECT * FROM referrals WHERE code = $1', [code]);
  if (ref.rows.length === 0) return Response.json({ error: 'Invalid referral code' }, { status: 404 });
  const referrerId = ref.rows[0].referrer_id;
  if (referrerId === userId) return Response.json({ error: 'Cannot refer yourself' }, { status: 400 });
  await query('UPDATE referrals SET referred_user_id = $1, reward_granted = true WHERE code = $2', [userId, code]);
  const { addPoints } = await import('@/lib/loyalty');
  await addPoints(referrerId, 500, 'Referral reward');
  return Response.json({ message: 'Referral applied' });
}
