import { query } from './db.js';
import { hashPassword } from './auth.js';

async function createAdmin() {
  const email = 'admin@thaesu.com';
  const password = 'Admin1234!';
  const hash = await hashPassword(password);
  await query(
    `INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, 'System Admin', 'admin') ON CONFLICT (email) DO NOTHING`,
    [email, hash]
  );
  console.log('✅ Admin user ready:', email);
}

createAdmin()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
