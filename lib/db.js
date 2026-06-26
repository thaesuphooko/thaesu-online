import { Pool } from 'pg';

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,  // 10 seconds
    });
  }
  return pool;
}

export async function query(text, params, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const client = await getPool().connect();
    try {
      const res = await client.query(text, params);
      return res;
    } catch (err) {
      client.release();
      if (attempt === retries) throw err;
      console.warn(`Query attempt ${attempt} failed, retrying...`);
      await new Promise(r => setTimeout(r, 500));
    } finally {
      client.release();
    }
  }
}

export { getPool as pool };
