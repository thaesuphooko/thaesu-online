import pool from '@/lib/db';
import * as cheerio from 'cheerio';

export async function startWattpadCrawl(jobId, url) {
  await pool.query('UPDATE crawl_jobs SET status = \'running\' WHERE id = $1', [jobId]);
  await addLog(jobId, 'info', 'Wattpad crawl started');

  try {
    const agents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    ];
    let page = 1;
    let hasMore = true;
    let totalStories = 0;

    while (hasMore && page < 50) { // Limit pages to avoid infinite loop
      await addLog(jobId, 'info', `Fetching page ${page}...`);
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      const res = await fetch(url + (url.includes('?') ? '&' : '?') + `page=${page}`, {
        headers: { 'User-Agent': randomAgent },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const $ = cheerio.load(html);

      const storyCards = $('.browse-story-item, .story-card, .story-item');
      if (storyCards.length === 0) {
        hasMore = false;
        await addLog(jobId, 'info', 'No more stories found.');
        break;
      }

      for (let i = 0; i < storyCards.length; i++) {
        const el = storyCards[i];
        const $el = $(el);
        const title = $el.find('.title, h3, .story-title').first().text().trim();
        const description = $el.find('.description, .story-description, .summary').first().text().trim();
        let coverUrl = $el.find('img').first().attr('src') || '';
        if (coverUrl && !coverUrl.startsWith('http')) coverUrl = 'https:' + coverUrl;
        const author = $el.find('.author, .username, .byline').first().text().trim();
        let storyUrl = $el.find('a').first().attr('href') || '';
        if (storyUrl && !storyUrl.startsWith('http')) storyUrl = 'https://www.wattpad.com' + storyUrl;

        if (title && storyUrl) {
          const storyId = storyUrl.split('/').pop() || Date.now().toString();
          try {
            await pool.query(
              `INSERT INTO wattpad_cache (story_id, title, description, cover_url, author, url)
               VALUES ($1,$2,$3,$4,$5,$6)
               ON CONFLICT (story_id) DO UPDATE SET
                 title=EXCLUDED.title, description=EXCLUDED.description, cover_url=EXCLUDED.cover_url,
                 author=EXCLUDED.author, url=EXCLUDED.url, updated_at=NOW()`,
              [storyId, title, description?.substring(0, 300) || '', coverUrl || '/placeholder.jpg', author, storyUrl]
            );
            totalStories++;
            await addLog(jobId, 'info', `[${totalStories}] Saved: ${title}`);
          } catch (dbErr) {
            await addLog(jobId, 'error', `DB Error: ${dbErr.message}`);
          }
        }
      }
      page++;
      await new Promise(r => setTimeout(r, 2000)); // polite delay
    }

    await pool.query('UPDATE crawl_jobs SET status = \'completed\' WHERE id = $1', [jobId]);
    await addLog(jobId, 'info', `Crawl completed. Total stories saved: ${totalStories}`);
  } catch (error) {
    console.error('Wattpad crawl error:', error);
    await pool.query('UPDATE crawl_jobs SET status = \'failed\' WHERE id = $1', [jobId]);
    await addLog(jobId, 'error', `Fatal: ${error.message}`);
  }
}

async function addLog(jobId, level, message) {
  try {
    await pool.query(
      'INSERT INTO crawl_logs (job_id, level, message) VALUES ($1, $2, $3)',
      [jobId, level, message]
    );
  } catch (e) {
    console.error('Log error:', e);
  }
}
