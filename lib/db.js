import { Pool } from 'pg';

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

export async function query(text, params, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const client = await getPool().connect();
    try {
      const res = await client.query(text, params);
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`Query attempt ${attempt} failed, retrying...`);
      await new Promise(r => setTimeout(r, 500));
    } finally {
      try { client.release(); } catch {}
    }
  }
}

export { getPool as pool };
