export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { checkAdmin } from '@/lib/adminAuth';
import { query } from '@/lib/db';

export async function PATCH(request) {
  const auth = checkAdmin(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { ids } = await request.json();
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array required' }, { status: 400 });
  }
  const vps = await query('SELECT * FROM video_products WHERE id = ANY($1) AND status = $2', [ids, 'draft']);
  for (const vp of vps.rows) {
    const slug = (vp.title || 'video-product').toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 80) + '-' + Date.now().toString(36);
    await query(
      `INSERT INTO products (title, slug, description, price, category, is_active) VALUES ($1,$2,$3,$4,$5,true)`,
      [vp.title, slug, vp.description || '', vp.price || 0, vp.category || 'Other']
    );
    if (vp.thumbnail) {
      const prod = await query('SELECT id FROM products WHERE slug = $1', [slug]);
      if (prod.rows.length > 0) {
        await query(
          `INSERT INTO media (product_id, cloudinary_public_id, cloudinary_url, cloudinary_account, media_type, sort_order) VALUES ($1,$2,$2,'direct','image',0)`,
          [prod.rows[0].id, vp.thumbnail]
        );
      }
    }
  }
  await query('UPDATE video_products SET status = $1 WHERE id = ANY($2)', ['published', ids]);
  return NextResponse.json({ message: 'Published', count: vps.rows.length });
}
