import { query } from './db.js';
import { categorizeWithAI } from './aiCategorize.js';

// Simulated TikTok/YouTube video fetching (replace with real APIs)
async function fetchVideosFromPlatform(platform, accountUrl) {
  // This is a mock – in production, use TikTok API or YouTube Data API
  const mockVideos = [];
  const baseId = Date.now().toString(36);
  for (let i = 0; i < 5; i++) {
    mockVideos.push({
      video_id: `${platform}_${baseId}_${i}`,
      video_url: `https://${platform}.com/video/${baseId}_${i}`,
      title: `${platform} video ${i+1} – Amazing Product`,
      thumbnail: `https://via.placeholder.com/300x200?text=${platform}+Video+${i+1}`,
    });
  }
  return mockVideos;
}

export async function syncJob(jobId) {
  const job = await query('SELECT * FROM video_sync_jobs WHERE id = $1', [jobId]);
  if (job.rows.length === 0) return;
  const cfg = job.rows[0];
  const config = cfg.config || {};

  const videos = await fetchVideosFromPlatform(cfg.platform, cfg.account_url);

  for (const video of videos) {
    // Check duplicate
    const exists = await query('SELECT id FROM video_products WHERE job_id = $1 AND video_id = $2', [jobId, video.video_id]);
    if (exists.rows.length > 0) continue;

    // Determine price
    let price = null;
    if (config.price_mode === 'global' && config.global_price) {
      price = parseFloat(config.global_price);
    }

    // Determine description
    let description = '';
    if (config.desc_mode === 'ai') {
      // Use AI to generate description from title (or we could fetch captions)
      description = video.title;
    } else if (config.desc_mode === 'template' && config.desc_template) {
      description = config.desc_template;
    }

    // AI categorization
    const category = await categorizeWithAI(video.title, description);

    // Save as draft
    await query(
      `INSERT INTO video_products (job_id, video_id, video_url, title, thumbnail, price, description, category, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft')`,
      [jobId, video.video_id, video.video_url, video.title, video.thumbnail, price, description, category]
    );
  }

  // Update last synced
  await query('UPDATE video_sync_jobs SET last_synced_at = NOW() WHERE id = $1', [jobId]);
}
