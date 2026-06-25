// Database connection pool (Neon.tech PostgreSQL)
import { Pool } from 'pg';

// Create a new pool using the connection string from env
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  max: 10,                    // Maximum connections in pool
  idleTimeoutMillis: 30000,   // Close idle clients after 30s
});

// Helper function to run a single query
export async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

// Export pool for transactions if needed
export { pool };
