import { query } from './db.js';
import { hashPassword } from './auth.js';

const reviewData = [
  { name: 'ဇော်ဇော်', rating: 5, comment: 'ဒီပစ္စည်းကို ဝယ်လိုက်ရတာ အရမ်းကျေနပ်တယ်။ ဈေးလည်းသက်သာပြီး အရည်အသွေးကောင်းတယ်။ နောက်ထပ်ထပ်ဝယ်မယ်။' },
  { name: 'မမေ', rating: 4, comment: 'ပစ္စည်းကောင်းပါတယ်။ ပို့တာလည်းမြန်တယ်။ အထုပ်အပိုးလည်း သေသပ်တယ်။' },
  { name: 'အောင်အောင်', rating: 5, comment: 'Excellent quality! Fast delivery. Will definitely order again.' },
  { name: 'နန္ဒာ', rating: 4, comment: 'အားလုံးအဆင်ပြေပါတယ်။ ဒါပေမယ့် color က ပုံမှာထက် နည်းနည်းဖျော့တယ်။' },
  { name: 'ကျော်ကျော်', rating: 3, comment: 'အသံအရည်အသွေး သာမန်ပါပဲ။ ဈေးနှုန်းနဲ့တော့ တန်ပါတယ်။' },
  { name: 'သူဇာ', rating: 5, comment: 'ဒီဆိုင်က အကောင်းဆုံးပဲ။ customer service လည်း ကောင်းတယ်။' },
  { name: 'မိုးမိုး', rating: 4, comment: 'Delivery က ၂ ရက်ပဲ ကြာတယ်။ ပစ္စည်းကလည်း ကောင်းတယ်။' },
  { name: 'ထွန်းထွန်း', rating: 5, comment: 'Great product, arrived in perfect condition. Highly recommended.' },
  { name: 'အေးအေး', rating: 4, comment: 'ဈေးနှုန်းက သင့်တင့်တယ်။ ဒါပေမယ့် size က နည်းနည်းသေးတယ်။' },
  { name: 'ချစ်ချစ်', rating: 5, comment: 'ဒီပစ္စည်းလေးကို ကျွန်မ အရမ်းကြိုက်တယ်။ မိသားစုကိုလည်း ဝယ်ပေးမယ်။' },
];

async function seed() {
  console.log('Creating fake users and reviews...');

  // Get all active product IDs
  const productsRes = await query('SELECT id FROM products WHERE is_active = true');
  const productIds = productsRes.rows.map(r => r.id);
  if (productIds.length === 0) {
    console.error('No active products found. Seed products first.');
    process.exit(1);
  }

  // Delete previous fake reviews and users (clean slate)
  await query("DELETE FROM reviews WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@fake.thaesu')");
  await query("DELETE FROM users WHERE email LIKE '%@fake.thaesu'");

  // Create distinct fake users
  const userIds = [];
  for (const entry of reviewData) {
    const email = `${entry.name.replace(/\s/g, '').toLowerCase()}@fake.thaesu`;
    let user = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (user.rows.length === 0) {
      const pwHash = await hashPassword('fake123');
      user = await query(
        "INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, 'customer') RETURNING id",
        [email, pwHash, entry.name]
      );
    }
    userIds.push(user.rows[0].id);
  }

  // Insert 100 reviews with varied data
  for (let i = 0; i < 100; i++) {
    const entry = reviewData[i % reviewData.length];
    const userId = userIds[i % userIds.length];
    const productId = productIds[Math.floor(Math.random() * productIds.length)];
    const rating = entry.rating; // already varied
    const comment = entry.comment + (i > 0 ? ` (Review #${i+1})` : '');
    const daysAgo = Math.floor(Math.random() * 30) + 1; // 1-30 days ago
    const created_at = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO reviews (product_id, user_id, rating, comment, created_at) VALUES ($1, $2, $3, $4, $5)',
      [productId, userId, rating, comment, created_at]
    );
  }
  console.log('Seeded 100 realistic fake reviews with diverse users.');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
