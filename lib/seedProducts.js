import { query } from './db.js';
async function seed() {
  const categories = ['Electronics', 'Fashion', 'Home', 'Books', 'Sports'];
  for (let i = 1; i <= 50; i++) {
    const title = `Product ${i} - ${categories[i % 5]}`;
    await query(
      `INSERT INTO products (vendor_id, title, slug, description, price, category)
       VALUES ((SELECT id FROM vendors LIMIT 1), $1, $2, 'Description for ${title}', $3, $4)
       ON CONFLICT DO NOTHING`,
      [title, title.toLowerCase().replace(/\s+/g, '-'), Math.floor(Math.random() * 10000) + 1000, categories[i % 5]]
    );
  }
  console.log('Seeded 50 products.');
  process.exit(0);
}
seed();
