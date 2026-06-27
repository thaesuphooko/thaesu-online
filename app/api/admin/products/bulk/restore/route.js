export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';
export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { products } = await request.json();
  for (const p of products) {
    await query('INSERT INTO products (id, title, slug, price, stock) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [p.id, p.title, p.slug, p.price, p.stock]);
  }
  return Response.json({ message: 'Restored' });
}
