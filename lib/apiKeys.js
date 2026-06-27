import { query } from './db.js';
import { randomBytes } from 'crypto';

export async function generateApiKey(userId, name = 'default') {
  const key = 'tha_' + randomBytes(24).toString('hex');
  await query('INSERT INTO api_keys (user_id, api_key, name) VALUES ($1, $2, $3)', [userId, key, name]);
  return key;
}

export async function validateApiKey(request) {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) return null;
  const res = await query('SELECT user_id FROM api_keys WHERE api_key = $1 AND is_active = true', [apiKey]);
  if (res.rows.length === 0) return null;
  return res.rows[0].user_id;
}
