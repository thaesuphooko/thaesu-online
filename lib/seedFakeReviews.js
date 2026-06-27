import { query } from './db.js';
import { hashPassword } from './auth.js';

const reviewData = [
  { name: 'ဇော်ဇော်', rating: 5, comment: 'အရမ်းကောင်းတယ်၊ ပို့ဆောင်မှုလည်းမြန်တယ်။' },
  { name: 'မမေ', rating: 4, comment: 'ပစ္စည်းကောင်းပါတယ်။ ဈေးလည်းသက်သာတယ်။' },
  { name: 'အောင်အောင်', rating: 5, comment: 'Excellent service and fast delivery!' },
  // Add more Myanmar names... We'll generate 100 records in code
];

async function seed() {
  console.log('Seeding fake users and reviews...');
  // Create a system user for fake reviews if not exists
  let sysUser = await query("SELECT id FROM users WHERE email = 'system@fake.thaesu'");
  if (sysUser.rows.length === 0) {
    const pwHash = await hashPassword('fake');
    sysUser = await query(
      "INSERT INTO users (email, password_hash, full_name, role) VALUES ('system@fake.thaesu', $1, 'System', 'customer') RETURNING id",
      [pwHash]
    );
  }
  const userId = sysUser.rows[0].id;

  // Generate 100 fake reviews
  const names = ['ဇော်ဇော်','မမေ','အောင်အောင်','နန္ဒာ','ကျော်ကျော်','သူဇာ','မိုးမိုး','ထွန်းထွန်း','အေးအေး','ချစ်ချစ်'];
  for (let i = 0; i < 100; i++) {
    const name = names[i % names.length];
    const rating = Math.floor(Math.random() * 3) + 3; // 3-5 stars
    const comment = `ဒီပစ္စည်းကို ဝယ်လိုက်ရတာ အရမ်းကျေနပ်တယ်။ ဈေးလည်းသက်သာပြီး အရည်အသွေးကောင်းတယ်။ (Fake review #${i+1})`;
    // Pick a random product
    const product = await query('SELECT id FROM products ORDER BY RANDOM() LIMIT 1');
    if (product.rows.length > 0) {
      await query(
        'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)',
        [product.rows[0].id, userId, rating, comment]
      );
    }
  }
  console.log('Seeded 100 fake reviews.');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
