import { query } from '@/lib/db';
import { checkAdmin } from '@/lib/adminAuth';

export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  try {
    const result = await query('SELECT key, value, description, updated_at FROM config ORDER BY key');
    return Response.json(result.rows);
  } catch (error) {
    console.error('GET config error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  try {
    const { key, value } = await request.json();
    if (!key || value === undefined) {
      return Response.json({ error: 'key and value are required' }, { status: 400 });
    }
    // If value is string, parse it
    let jsonValue = value;
    if (typeof value === 'string') {
      try { jsonValue = JSON.parse(value); } catch {}
    }
    const result = await query(
      `UPDATE config SET value = $1, updated_at = NOW() WHERE key = $2 RETURNING *`,
      [JSON.stringify(jsonValue), key]
    );
    if (result.rows.length === 0) {
      return Response.json({ error: 'Config key not found' }, { status: 404 });
    }
    return Response.json(result.rows[0]);
  } catch (error) {
    console.error('PATCH config error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
