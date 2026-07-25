import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import * as cheerio from 'cheerio';

export async function GET() {
  try {
    // Try cache first
    const cached = await pool.query(
      "SELECT * FROM wattpad_cache WHERE updated_at > NOW() - INTERVAL '6 hours' ORDER BY created_at DESC LIMIT 20"
    );
    if (cached.rows.length > 0) {
      return NextResponse.json({ stories: cached.rows });
    }

    const agents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    ];
    const randomAgent = agents[Math.floor(Math.random() * agents.length)];

    const res = await fetch('https://www.wattpad.com/stories/myanmar', {
      headers: {
        'User-Agent': randomAgent,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const stories = [];

    $('.browse-story-item, .story-card, .story-list-item').each((i, el) => {
      if (stories.length >= 20) return false;
      const $el = $(el);
      const title = $el.find('.title, h3, .story-title').first().text().trim();
      const description = $el.find('.description, .story-description, .summary').first().text().trim();
      let coverUrl = $el.find('img').first().attr('src') || '';
      if (coverUrl && !coverUrl.startsWith('http')) coverUrl = 'https:' + coverUrl;
      const author = $el.find('.author, .username, .byline').first().text().trim();
      let url = $el.find('a').first().attr('href') || '';
      if (url && !url.startsWith('http')) url = 'https://www.wattpad.com' + url;

      if (title && url) {
        stories.push({
          story_id: url.split('/').pop() || Date.now().toString(),
          title,
          description: description?.substring(0, 300) || '',
          cover_url: coverUrl || '/placeholder.jpg',
          author,
          url,
        });
      }
    });

    // Save to cache
    for (const s of stories) {
      await pool.query(
        `INSERT INTO wattpad_cache (story_id, title, description, cover_url, author, url)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (story_id) DO UPDATE SET
           title=EXCLUDED.title, description=EXCLUDED.description, cover_url=EXCLUDED.cover_url,
           author=EXCLUDED.author, url=EXCLUDED.url, updated_at=NOW()`,
        [s.story_id, s.title, s.description, s.cover_url, s.author, s.url]
      );
    }
    return NextResponse.json({ stories });
  } catch (error) {
    console.error('Wattpad error:', error);
    // Fallback to cache
    const { rows: cache } = await pool.query('SELECT * FROM wattpad_cache ORDER BY created_at DESC LIMIT 20');
    if (cache.length > 0) return NextResponse.json({ stories: cache });
    return NextResponse.json({ error: 'Failed to fetch Wattpad stories' }, { status: 500 });
  }
}
