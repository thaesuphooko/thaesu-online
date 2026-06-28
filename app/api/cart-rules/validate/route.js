export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
export async function POST(request) {
  const { totalAmount } = await request.json();
  const rules = await query('SELECT * FROM cart_rules WHERE is_active = true ORDER BY min_amount DESC');
  let discount = 0;
  for (const rule of rules.rows) {
    if (totalAmount >= rule.min_amount) {
      discount = (totalAmount * rule.discount_percent) / 100;
      break;
    }
  }
  return Response.json({ discount });
}
