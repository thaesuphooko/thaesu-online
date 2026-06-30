export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

async function getAICost(title, description) {
  if (!DEEPSEEK_API_KEY) return null;
  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{
          role: 'user',
          content: `Given the product title and description, estimate the typical wholesale/import cost in Myanmar Kyats (Ks) for a product sold online in Southeast Asia. Return ONLY the numeric cost (no currency symbol, no text). If you cannot estimate, return 0.\nTitle: ${title}\nDescription: ${description || 'N/A'}`,
        }],
        max_tokens: 10,
        temperature: 0.2,
      }),
    });
    const data = await res.json();
    const costText = data.choices[0]?.message?.content?.trim();
    const cost = parseFloat(costText);
    return isNaN(cost) ? null : cost;
  } catch (e) {
    return null;
  }
}

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { productId } = await request.json();
  if (!productId) return Response.json({ error: 'productId required' }, { status: 400 });

  const productRes = await query('SELECT title, description FROM products WHERE id = $1', [productId]);
  if (productRes.rows.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });
  const product = productRes.rows[0];

  const aiCost = await getAICost(product.title, product.description);
  if (aiCost !== null) {
    await query('UPDATE products SET cost_price = $1 WHERE id = $2', [aiCost, productId]);
    return Response.json({ message: 'Cost updated by AI', cost: aiCost });
  } else {
    return Response.json({ error: 'AI could not determine cost' }, { status: 400 });
  }
}
