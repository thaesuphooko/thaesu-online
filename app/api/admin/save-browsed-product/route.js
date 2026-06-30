export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

async function categorizeWithAI(title, description) {
  if (!DEEPSEEK_API_KEY) return null;
  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{
          role: 'user',
          content: `Categorize this product into one category (Electronics, Fashion, Home & Living, Books, Sports, Health, Beauty, Food, Other). Reply ONLY with the category name.\nTitle: ${title}\nDescription: ${description || ''}`,
        }],
        max_tokens: 10,
      }),
    });
    const data = await res.json();
    return data.choices[0]?.message?.content?.trim() || null;
  } catch (e) {
    return null;
  }
}

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  const { title, price, description, images, url } = await request.json();
  if (!title) return Response.json({ error: 'Title required' }, { status: 400 });

  const category = await categorizeWithAI(title, description);

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 80) + '-' + Date.now().toString(36);
  const numericPrice = parseFloat(price) || 0;

  const productRes = await query(
    `INSERT INTO products (title, slug, description, price, category, is_active) VALUES ($1,$2,$3,$4,$5,true) RETURNING *`,
    [title, slug, description || '', numericPrice, category || 'Other']
  );
  const product = productRes.rows[0];

  if (images && images.length) {
    for (let i = 0; i < Math.min(images.length, 10); i++) {
      await query(
        `INSERT INTO media (product_id, cloudinary_public_id, cloudinary_url, cloudinary_account, media_type, sort_order) VALUES ($1,$2,$3,'direct','image',$4)`,
        [product.id, images[i], images[i], i]
      );
    }
  }

  return Response.json({ message: 'Product saved', product, category }, { status: 201 });
}
