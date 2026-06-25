import { query } from './db.js';
(async () => {
  await query(`INSERT INTO users (email, password_hash, full_name, role) VALUES ('vendor@thaesu.com', 'hash', 'Test Vendor', 'vendor') ON CONFLICT DO NOTHING`);
  const user = await query(`SELECT id FROM users WHERE email='vendor@thaesu.com'`);
  await query(`INSERT INTO vendors (user_id, store_name, store_slug) VALUES ($1, 'Test Store', 'test-store') ON CONFLICT DO NOTHING`, [user.rows[0].id]);
  console.log('Vendor seeded.');
  process.exit(0);
})();
