import { createApiRoute, validateBody, requireAdmin } from '@/lib/api-wrapper';
import { safeQuery, withTransaction } from '@/lib/db-wrapper';
import { verifyToken } from '@/lib/auth';

const handlers = {
  // GET – Get referral stats for the authenticated user
  GET: async (req) => {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return Response.json({ error: 'Authentication required' }, { status: 401 });
    let user;
    try { user = verifyToken(token); } catch { return Response.json({ error: 'Invalid token' }, { status: 401 }); }
    if (!user?.id) return Response.json({ error: 'User not found' }, { status: 404 });

    const { rows: [stats] } = await safeQuery(
      `SELECT 
        u.referral_code,
        COUNT(ac.id)::int AS total_clicks,
        COUNT(DISTINCT ac.referrer_id)::int AS successful_referrals,
        COALESCE(SUM(u2.wallet_balance), 0)::numeric(10,2) AS total_commission
       FROM users u
       LEFT JOIN affiliate_clicks ac ON ac.referrer_id = u.id
       LEFT JOIN users u2 ON u2.referred_by = u.referral_code
       WHERE u.id = $1
       GROUP BY u.id`,
      [user.id]
    );
    return Response.json(stats || { referral_code: '', total_clicks: 0, successful_referrals: 0, total_commission: 0 });
  },

  // POST – Create a referral code for the user (if they don't have one)
  POST: async (req) => {
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) return Response.json({ error: 'Authentication required' }, { status: 401 });
    let user;
    try { user = verifyToken(token); } catch { return Response.json({ error: 'Invalid token' }, { status: 401 }); }
    if (!user?.id) return Response.json({ error: 'User not found' }, { status: 404 });

    // Check if user already has a referral code
    const { rows: [existing] } = await safeQuery('SELECT referral_code FROM users WHERE id = $1', [user.id]);
    if (existing?.referral_code) {
      return Response.json({ referral_code: existing.referral_code }, { status: 200 });
    }

    // Generate unique referral code
    const code = user.uid + Math.random().toString(36).substring(2, 6).toUpperCase();
    await safeQuery('UPDATE users SET referral_code = $1 WHERE id = $2', [code, user.id]);
    return Response.json({ referral_code: code }, { status: 201 });
  },
};

export const { GET, POST, PUT, DELETE } = createApiRoute(handlers);
