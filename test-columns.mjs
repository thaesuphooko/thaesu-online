import pool from './lib/db.js';
const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='products'");
console.log(res.rows.map(r => r.column_name));
process.exit(0);
