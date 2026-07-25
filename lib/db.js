import { Pool } from 'pg';

// Connection pool with optimal settings for Neon (serverless PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: {
    rejectUnauthorized: false, // Neon requires this
  },
});

// Slow query logger (development helper)
const originalQuery = pool.query.bind(pool);
pool.query = async (...args) => {
  const start = Date.now();
  const result = await originalQuery(...args);
  const duration = Date.now() - start;
  if (duration > 500) {
    console.warn(
      `⚠️ SLOW QUERY (${duration}ms):`,
      typeof args[0] === 'string'
        ? args[0].substring(0, 100)
        : args[0]?.text?.substring(0, 100)
    );
  }
  return result;
};

// Convenience query function (returns full pg Result)
export const query = (text, params) => pool.query(text, params);

// Named export for routes that import { pool }
export { pool };

// Default export for routes that import poolDefault from '@/lib/db'
export default pool;
