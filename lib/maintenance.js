import { query } from './db.js';

export async function isMaintenanceMode() {
  const res = await query("SELECT value FROM global_settings WHERE key = 'maintenance_mode'");
  return res.rows[0]?.value === 'true';
}
