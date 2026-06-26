export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';

export async function POST(request) {
  const { code } = await request.json();
  if (!code) return Response.json({ error: 'Code required' }, { status: 400 });

  const res = await query(
    'SELECT id, balance, is_active, expires_at FROM gift_cards WHERE code = $1',
    [code]
  );
  if (res.rows.length === 0) return Response.json({ error: 'Invalid gift card code' }, { status: 404 });
  const card = res.rows[0];
  if (!card.is_active) return Response.json({ error: 'Gift card is disabled' }, { status: 400 });
  if (card.expires_at && new Date(card.expires_at) < new Date()) {
    return Response.json({ error: 'Gift card expired' }, { status: 400 });
  }
  return Response.json({ valid: true, balance: card.balance, card_id: card.id });
}
