export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { scrapeAndSave } from '@/lib/scraper';

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  try {
    const { url, vendor_id, category } = await request.json();
    if (!url) return Response.json({ error: 'URL is required' }, { status: 400 });

    const product = await scrapeAndSave(url, vendor_id || null, category || null);
    return Response.json({ message: 'Product scraped and saved', product }, { status: 201 });
  } catch (err) {
    console.error('Scrape error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
