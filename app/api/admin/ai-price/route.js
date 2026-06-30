export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

async function getAIPrice(title, description) {
  if (!DEEPSEEK_API_KEY) return null;
  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{
          role: 'user',
          content: `Given the product title and description, estimate a reasonable selling price in Myanmar Kyats (Ks). The product is likely sold online in Southeast Asia. Return ONLY the numeric price (no currency symbol, no text). If you cannot estimate, return 0.\nTitle: ${title}\nDescription: ${description || 'N/A'}`,
        }],
        max_tokens: 10,
        temperature: 0.2,
      }),
    });
    const data = await res.json();
    const priceText = data.choices[0]?.message?.content?.trim();
    const price = parseFloat(priceText);
    return isNaN(price) ? null : price;
  } catch (e) {
    return null;
  }
}

// Convert foreign price to Ks with profit margin
async function convertCurrency(amount, currency, marginPercent) {
  // For simplicity, use static rates (should be fetched from API in production)
  const rates = { THB: 2.8, CNY: 210, USD: 2100 };
  const rate = rates[currency] || 1;
  const basePriceKs = amount * rate;
  // Add profit margin
  const finalPrice = basePriceKs * (1 + marginPercent / 100);
  return Math.round(finalPrice * 100) / 100;
}

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { productId, action } = await request.json(); // action: 'validate' or 'convert'
  if (!productId) return Response.json({ error: 'productId required' }, { status: 400 });

  const productRes = await query('SELECT * FROM products WHERE id = $1', [productId]);
  if (productRes.rows.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });
  const product = productRes.rows[0];

  if (action === 'validate') {
    // AI validate price: if price is 0 or seems abnormal, suggest new price
    const aiPrice = await getAIPrice(product.title, product.description);
    if (aiPrice && aiPrice > 0) {
      await query('UPDATE products SET price = $1, ai_priced = true WHERE id = $2', [aiPrice, productId]);
      return Response.json({ message: 'Price updated by AI', newPrice: aiPrice });
    } else {
      return Response.json({ error: 'AI could not determine price' }, { status: 400 });
    }
  } else if (action === 'convert') {
    // Assume source_url contains original currency code? Actually we need original price and currency.
    // We'll make it simple: if product has a compare_at_price that looks like foreign currency, use it.
    const foreignPrice = product.compare_at_price;
    if (!foreignPrice || foreignPrice <= 0) return Response.json({ error: 'No foreign price available' });
    // Guess currency from product description or source_url (hardcoded THB for now)
    const currency = 'THB'; // Default, can be improved
    const marginPercent = 20; // Default profit margin
    const newPrice = await convertCurrency(foreignPrice, currency, marginPercent);
    await query('UPDATE products SET price = $1, ai_priced = true WHERE id = $2', [newPrice, productId]);
    return Response.json({ message: 'Price converted', newPrice });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
}
