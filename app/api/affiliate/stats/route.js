import { query } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.split(' ')[1];
  let user;
  try { user = verifyToken(token); } catch { return Response.json({ error: 'Invalid token' }, { status: 401 }); }

  // Get or create referral code
  let ref = await query('SELECT code FROM referrals WHERE referrer_id = $1', [user.id]);
  let code;
  if (ref.rows.length > 0) {
    code = ref.rows[0].code;
  } else {
    const newCode = 'THAESU' + Math.random().toString(36).substring(2, 8).toUpperCase();
    await query('INSERT INTO referrals (referrer_id, code) VALUES ($1, $2)', [user.id, newCode]);
    code = newCode;
  }

  // Stats
  const clicks = await query('SELECT COUNT(*) FROM affiliate_clicks WHERE referrer_id = $1', [user.id]);
  const totalClicks = parseInt(clicks.rows[0].count);

  const pendingCommission = await query(
    "SELECT COALESCE(SUM(amount),0) FROM affiliate_commissions WHERE referrer_id = $1 AND status = 'pending'",
    [user.id]
  );

  const commissions = await query(
    'SELECT id, order_id, amount, status, created_at FROM affiliate_commissions WHERE referrer_id = $1 ORDER BY created_at DESC LIMIT 20',
    [user.id]
  );

  return Response.json({
    code,
    totalClicks,
    pendingCommission: parseFloat(pendingCommission.rows[0].coalesce),
    commissions: commissions.rows,
  });
}
