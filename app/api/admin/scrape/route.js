export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
import { scrapeURL } from '@/lib/scraper';

export async function POST(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

  try {
    const { url } = await request.json();
    if (!url) return Response.json({ error: 'URL is required' }, { status: 400 });

    const html = await scrapeURL(url);
    // For demo, we return only the first 200 chars; in production, parse and store.
    return Response.json({ message: 'Scrape successful', preview: html.substring(0, 200) });
  } catch (err) {
    console.error('Scrape error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
