export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

async function getOptimalPrice(title, category) {
  if (!DEEPSEEK_API_KEY) return null;
  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{
          role: 'user',
          content: `Suggest an optimal selling price in MMK for this product in Myanmar market. Only reply with the number.\nProduct: ${title}\nCategory: ${category || 'General'}`,
        }],
        max_tokens: 10,
      }),
    });
    const data = await res.json();
    const price = parseFloat(data.choices[0]?.message?.content?.replace(/[^0-9.]/g, ''));
    return isNaN(price) ? null : price;
  } catch (e) { return null; }
}

// State management – in production use Redis
let scanState = { running: false, total: 0, current: 0, purged: [], adjusted: [], snapshot: [] };

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  return Response.json({ running: scanState.running, progress: scanState.total ? Math.round((scanState.current / scanState.total) * 100) : 0, current: scanState.current, total: scanState.total });
}

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { action } = await request.json();

  if (action === 'start') {
    if (scanState.running) return Response.json({ error: 'Scan already running' }, { status: 400 });

    // Snapshot current products before scan
    const snapshot = await query('SELECT id, title, price, category, description FROM products');
    scanState = { running: true, total: snapshot.rows.length, current: 0, purged: [], adjusted: [], snapshot: snapshot.rows };

    // Process asynchronously
    (async () => {
      for (const product of scanState.snapshot) {
        if (!scanState.running) break;
        scanState.current++;
        let images = await query('SELECT id FROM media WHERE product_id = $1 LIMIT 1', [product.id]);
        const hasImage = images.rows.length > 0;
        const hasPrice = product.price && product.price > 0;

        // Purge if no image or no price
        if (!hasImage || !hasPrice) {
          await query('UPDATE products SET is_active = false WHERE id = $1', [product.id]);
          scanState.purged.push({ id: product.id, title: product.title, reason: !hasImage ? 'No image' : 'Price is 0' });
          continue;
        }

        // Price optimization
        const suggestedPrice = await getOptimalPrice(product.title, product.category);
        if (suggestedPrice && (suggestedPrice > product.price * 1.5 || suggestedPrice < product.price * 0.5)) {
          await query('UPDATE products SET price = $1 WHERE id = $2', [suggestedPrice, product.id]);
          scanState.adjusted.push({ id: product.id, title: product.title, oldPrice: product.price, newPrice: suggestedPrice });
        }
      }
      scanState.running = false;

      // Send Telegram Report
      const token = process.env.TELEGRAM_BOT_TOKEN_1 || process.env.TELEGRAM_BOT_TOKENS?.split(',')[0];
      const chatId = process.env.TELEGRAM_USER_ID;
      if (token && chatId) {
        const msg = `📊 *Catalog Sanitizer Report*\n\n📦 Scanned: ${scanState.total}\n🗑️ Purged: ${scanState.purged.length}\n✏️ Adjusted: ${scanState.adjusted.length}`;
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' }),
        }).catch(() => {});
      }
    })();

    return Response.json({ message: 'Scan started' });
  }

  if (action === 'rollback') {
    if (scanState.running) return Response.json({ error: 'Scan still running' }, { status: 400 });
    // Restore purged
    const purgedIds = scanState.purged.map(p => p.id);
    if (purgedIds.length) await query('UPDATE products SET is_active = true WHERE id = ANY($1)', [purgedIds]);
    // Restore prices
    for (const adj of scanState.adjusted) {
      await query('UPDATE products SET price = $1 WHERE id = $2', [adj.oldPrice, adj.id]);
    }
    scanState = { running: false, total: 0, current: 0, purged: [], adjusted: [], snapshot: [] };
    return Response.json({ message: 'Rollback complete' });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
}
