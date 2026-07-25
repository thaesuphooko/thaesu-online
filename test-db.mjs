import pool from './lib/db.js';

try {
  // Check if products table exists and count rows
  const res = await pool.query('SELECT count(*) FROM products');
  console.log('✅ Products count:', res.rows[0].count);
} catch (error) {
  console.error('❌ Database error:', error.message);
} finally {
  process.exit(0);
}
