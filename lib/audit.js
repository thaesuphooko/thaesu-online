import { query } from './db.js';

export async function logAdminAction(action, ip = '127.0.0.1', metadata = {}) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, ip_address, metadata) VALUES ($1, $2, $3, $4)`,
      [null, action, ip, JSON.stringify(metadata)]
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}
