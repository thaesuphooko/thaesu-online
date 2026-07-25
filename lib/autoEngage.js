import { query } from '@/lib/db';

// Schedule many engagements for a post/product
export async function schedulePostEngagements(postId, authorId) {
  // Get pool of users (exclude author)
  const users = await query('SELECT id FROM users WHERE id != $1 ORDER BY RANDOM() LIMIT 80', [authorId]);
  const userIds = users.rows.map(r => r.id);
  if (userIds.length < 5) return;

  // Determine if post is product-related (check product_id)
  const post = await query('SELECT product_id FROM posts WHERE id = $1', [postId]);
  const isProduct = !!post.rows[0]?.product_id;

  const totalComments = isProduct ? 150 : 100;   // product posts get more comments
  const totalLikes = totalComments * 2;
  const totalShares = Math.floor(totalComments * 0.2); // ~20% of comments

  // Create tasks: comments, likes, shares distributed over time
  const tasks = [];
  const shuffledUsers = [...userIds].sort(() => Math.random() - 0.5);
  let userIndex = 0;

  // Add comments
  for (let i = 0; i < totalComments; i++) {
    const delayMinutes = generateRealisticDelay(i, totalComments);
    const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
    const userId = shuffledUsers[userIndex % shuffledUsers.length];
    userIndex++;
    const commentText = await pickComment(isProduct);
    tasks.push({ type: 'comment', userId, commentText, scheduledAt });
  }

  // Add likes (2x comments)
  for (let i = 0; i < totalLikes; i++) {
    const delayMinutes = generateRealisticDelay(i, totalLikes, 'like');
    const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
    const userId = shuffledUsers[userIndex % shuffledUsers.length];
    userIndex++;
    tasks.push({ type: 'like', userId, scheduledAt });
  }

  // Add shares
  for (let i = 0; i < totalShares; i++) {
    const delayMinutes = generateRealisticDelay(i, totalShares, 'share');
    const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
    const userId = shuffledUsers[userIndex % shuffledUsers.length];
    userIndex++;
    tasks.push({ type: 'share', userId, scheduledAt });
  }

  // Insert all tasks into DB
  for (const task of tasks) {
    await query(
      `INSERT INTO auto_engagement_tasks (post_id, type, user_id, comment_text, scheduled_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [postId, task.type, task.userId, task.commentText || null, task.scheduledAt]
    );
  }
}

function generateRealisticDelay(index, total, type = 'comment') {
  // Generate logarithmic delay: first few tasks happen quickly, then taper off
  const baseDelay = type === 'like' ? 0.5 : 1; // minutes per item early
  const spread = total / 10; // later items spread over days
  const progress = index / total;
  // Exponential curve: first few minutes, then hours, then days
  return Math.min(0.5 + Math.pow(progress, 1.5) * 43200, 43200); // max 30 days
}

async function pickComment(isProduct) {
  let category = isProduct ? 'product_positive' : 'general';
  // Occasionally use neutral or negative comments for realism
  if (Math.random() < 0.1) category = 'general'; // 10% general comments on products
  const result = await query(
    'SELECT text FROM engagement_comments_pool WHERE category = $1 ORDER BY RANDOM() LIMIT 1',
    [category]
  );
  if (result.rows.length > 0) return result.rows[0].text;
  // fallback
  return isProduct ? 'ဒီပစ္စည်းကောင်းတယ်ဗျာ' : 'မိုက်တယ်';
}

// Process due tasks (called by cron)
export async function processEngagementTasks() {
  const now = new Date().toISOString();
  const tasks = await query(
    'SELECT * FROM auto_engagement_tasks WHERE executed = false AND scheduled_at <= $1 ORDER BY scheduled_at ASC LIMIT 30',
    [now]
  );

  for (const task of tasks.rows) {
    try {
      if (task.type === 'like') {
        const existing = await query('SELECT id FROM likes WHERE user_id = $1 AND post_id = $2', [task.user_id, task.post_id]);
        if (existing.rows.length === 0) {
          await query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [task.user_id, task.post_id]);
        }
      } else if (task.type === 'comment') {
        if (task.comment_text) {
          await query('INSERT INTO comments (user_id, post_id, content) VALUES ($1, $2, $3)', [task.user_id, task.post_id, task.comment_text]);
        }
      } else if (task.type === 'share') {
        await query('INSERT INTO shares (user_id, post_id) VALUES ($1, $2)', [task.user_id, task.post_id]);
      }
      await query('UPDATE auto_engagement_tasks SET executed = true WHERE id = $1', [task.id]);

      // Send notification to post author
      const post = await query('SELECT user_id FROM posts WHERE id = $1', [task.post_id]);
      if (post.rows.length > 0) {
        const authorId = post.rows[0].user_id;
        const actionMap = { like: 'liked', comment: 'commented on', share: 'shared' };
        const user = await query('SELECT full_name FROM users WHERE id = $1', [task.user_id]);
        const username = user.rows[0]?.full_name || 'တစ်ဦး';
        await query(
          `INSERT INTO notifications (user_id, message, type, created_at)
           VALUES ($1, $2, 'social', NOW())`,
          [authorId, `${username} က ${actionMap[task.type]} ပို့စ်ကို`]
        );
      }
    } catch (err) {
      console.error('Engagement task error:', err.message);
      await query('UPDATE auto_engagement_tasks SET executed = true WHERE id = $1', [task.id]);
    }
  }
}
