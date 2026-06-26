import webpush from 'web-push';

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
  webpush.setVapidDetails('mailto:noreply@thaesu.com', publicKey, privateKey);
}

export async function sendPush(userId, payload) {
  if (!publicKey || !privateKey) return;
  
  const { query } = await import('./db.js');
  const user = await query('SELECT push_subscription FROM users WHERE id = $1', [userId]);
  const sub = user.rows[0]?.push_subscription;
  if (!sub) return;

  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
  } catch (err) {
    console.error('Push error:', err.message);
    // Remove invalid subscription
    if (err.statusCode === 410 || err.statusCode === 404) {
      await query('UPDATE users SET push_subscription = NULL WHERE id = $1', [userId]);
    }
  }
}
