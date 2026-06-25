import { query } from './db.js';
import { hashPassword } from './auth.js';

async function seed() {
  console.log('Seeding vendor and products...');

  // 1. Create a vendor user (if not exists)
  const vendorEmail = 'vendor@thaesu.com';
  const existingUser = await query('SELECT id FROM users WHERE email = $1', [vendorEmail]);
  let vendorUserId;
  if (existingUser.rows.length === 0) {
    const pwHash = await hashPassword('Vendor1234!');
    const userRes = await query(
      `INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, 'Demo Vendor', 'vendor') RETURNING id`,
      [vendorEmail, pwHash]
    );
    vendorUserId = userRes.rows[0].id;
  } else {
    vendorUserId = existingUser.rows[0].id;
  }

  // 2. Create a vendor store (if not exists)
  const existingStore = await query('SELECT id FROM vendors WHERE user_id = $1', [vendorUserId]);
  let vendorId;
  if (existingStore.rows.length === 0) {
    const storeRes = await query(
      `INSERT INTO vendors (user_id, store_name, store_slug, is_approved) VALUES ($1, 'Demo Store', 'demo-store', true) RETURNING id`,
      [vendorUserId]
    );
    vendorId = storeRes.rows[0].id;
  } else {
    vendorId = existingStore.rows[0].id;
  }

  // 3. Insert 10 sample products
  const categories = ['Electronics', 'Fashion', 'Home & Living', 'Books', 'Sports'];
  for (let i = 1; i <= 10; i++) {
    const title = `Sample Product ${i} - ${categories[i % 5]}`;
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const price = Math.floor(Math.random() * 50000) + 5000;
    const stock = Math.floor(Math.random() * 50) + 1;
    await query(
      `INSERT INTO products (vendor_id, title, slug, description, price, stock, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (slug) DO NOTHING`,
      [vendorId, title, slug, `High quality ${title.toLowerCase()}.`, price, stock, categories[i % 5]]
    );
  }
  console.log('✅ Seeded 10 products.');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
