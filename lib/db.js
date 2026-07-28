import { Pool } from 'pg';

// ════════════════════════════════════════════════════════════
//  GOD MODE DATABASE LAYER (Premium Ultra Max)
//  · Retry + backoff, circuit breaker, health check,
//  · keep‑alive, graceful shutdown, slow query logging
// ════════════════════════════════════════════════════════════

// ─── Connection pool (Neon‑optimized) ───────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,                           // Neon free tier limit
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 8000,
  ssl: {
    rejectUnauthorized: false,      // Neon requires
  },
});

// ─── Keep‑alive (prevent idle disconnect) ───────
const keepAlive = setInterval(() => {
  pool.query('SELECT 1').catch(() => {});
}, 30000);
keepAlive.unref?.();

// ─── Original query (non‑wrapped) ────────────────
const originalPoolQuery = pool.query.bind(pool);

// ─── Circuit breaker state ──────────────────────
let failureCount = 0;
let openUntil = 0;
const MAX_FAILURES = 5;
const BREAKER_TIMEOUT = 15000; // 15 seconds

function isCircuitOpen() {
  if (failureCount >= MAX_FAILURES && Date.now() < openUntil) return true;
  if (Date.now() >= openUntil) {
    failureCount = 0; // reset after timeout
    return false;
  }
  return false;
}

function recordSuccess() {
  failureCount = 0;
}

function recordFailure() {
  failureCount++;
  if (failureCount >= MAX_FAILURES) {
    openUntil = Date.now() + BREAKER_TIMEOUT;
    console.warn(`🔴 Circuit breaker OPEN – blocking DB queries for ${BREAKER_TIMEOUT/1000}s`);
  }
}

// ─── Retry helper with exponential backoff ─────
async function queryWithRetry(text, params, retries = 3) {
  if (isCircuitOpen()) {
    throw new Error('Database circuit breaker is open – too many failures');
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const start = Date.now();
      // ✅ Use original query to avoid recursion
      const result = await originalPoolQuery(text, params);
      const duration = Date.now() - start;

      // Slow query warning
      if (duration > 500) {
        console.warn(
          `⚠️ SLOW QUERY (${duration}ms):`,
          typeof text === 'string' ? text.substring(0, 100) : text?.text?.substring(0, 100)
        );
      }

      recordSuccess();
      return result;
    } catch (error) {
      const isTransient =
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENETUNREACH' ||
        error.code === 'ECONNRESET' ||
        error.code === '57P01';

      recordFailure();

      if (attempt === retries || !isTransient) {
        throw error;
      }

      const delay = Math.min(1000 * 2 ** attempt, 4000); // 1s, 2s, 4s
      console.warn(
        `Database query attempt ${attempt + 1} failed (${error.code}), retrying in ${delay}ms...`
      );
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// ─── Override pool.query with robust wrapper ────
pool.query = async (text, params) => {
  return queryWithRetry(text, params);
};

// ─── Pool‑level error handling ──────────────────
pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
  // Could exit process so PM2 can restart
  // process.exit(-1);
});

// ─── Graceful shutdown ──────────────────────────
const gracefulShutdown = async () => {
  console.log('🔌 Closing database pool...');
  clearInterval(keepAlive);
  await pool.end();
  console.log('✅ Database pool closed.');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// ─── Health check function ──────────────────────
export const ready = async () => {
  try {
    await originalPoolQuery('SELECT 1');
    return true;
  } catch {
    return false;
  }
};

// ─── Convenience exports ────────────────────────
export const query = (text, params) => pool.query(text, params);
export { pool };
export default pool;
