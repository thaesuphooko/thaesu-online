export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';


export async function GET() {
  const { rows: products } = await query('SELECT slug, updated_at FROM products WHERE is_active = true');
  const baseUrl = process.env.VERCEL_URL || 'http://localhost:3000';
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${products.map(p => `
  <url>
    <loc>${baseUrl}/products/${p.slug}</loc>
    <lastmod>${new Date(p.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
