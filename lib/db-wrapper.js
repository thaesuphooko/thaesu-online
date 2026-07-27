import db from '@/lib/db';

/**
 * Safe query with automatic error handling
 */
export async function safeQuery(text, params) {
  try {
    return await db.query(text, params);
  } catch (error) {
    console.error('Database query error:', error.message);
    return { rows: [] };
  }
}

/**
 * Execute a callback within an ACID transaction
 * The callback receives a client that has query method with BEGIN/COMMIT/ROLLBACK
 */
export async function withTransaction(callback) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
