import pool from './lib/db.js';
const res = await pool.query('SELECT id FROM products LIMIT 1');
console.log('UUID:', res.rows[0].id);
process.exit(0);
