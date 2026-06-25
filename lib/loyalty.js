import { query } from './db.js';

export async function addPoints(userId, amount, reason) {
  await query(
    `INSERT INTO user_points (user_id, points, updated_at) 
     VALUES ($1, $2, NOW()) 
     ON CONFLICT (user_id) DO UPDATE SET points = user_points.points + $2, updated_at = NOW()`,
    [userId, amount]
  );
  await query('INSERT INTO points_history (user_id, amount, reason) VALUES ($1, $2, $3)', [userId, amount, reason]);
}

export async function getPoints(userId) {
  const res = await query('SELECT points FROM user_points WHERE user_id = $1', [userId]);
  return res.rows[0]?.points || 0;
}
