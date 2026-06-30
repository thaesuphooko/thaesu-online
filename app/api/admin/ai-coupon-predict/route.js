export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { discount_type, discount_value } = await request.json();
  if (!discount_type || !discount_value) return Response.json({ error: 'Missing fields' }, { status: 400 });

  // Get average order value for context
  const avgRes = await query("SELECT COALESCE(AVG(total_amount),0) as avg_order FROM orders WHERE payment_status='paid'");
  const avgOrder = parseFloat(avgRes.rows[0].avg_order).toFixed(0);

  if (!DEEPSEEK_API_KEY) {
    return Response.json({ advice: `Without AI, note: Average order is ${avgOrder} Ks. A ${discount_value}${discount_type==='percent'?'%':' Ks'} discount seems reasonable.` });
  }

  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{
          role: 'user',
          content: `A store owner is creating a coupon with discount type ${discount_type} and value ${discount_value}. The average order value is ${avgOrder} Ks. Provide a short, friendly advice on whether this discount is too high, too low, or good. Suggest a better value if needed. Keep it under 2 sentences.`,
        }],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });
    const data = await res.json();
    const advice = data.choices[0]?.message?.content?.trim() || 'Good discount strategy.';
    return Response.json({ advice });
  } catch (e) {
    return Response.json({ advice: 'AI prediction unavailable. Consider testing different values.' });
  }
}
