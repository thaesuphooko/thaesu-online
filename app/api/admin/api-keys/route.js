import { createApiRoute, requireAdmin } from '@/lib/api-wrapper';
import { safeQuery } from '@/lib/db-wrapper';
import crypto from 'crypto';

function generateSecureApiKey() {
  return 'sk-' + crypto.randomBytes(32).toString('hex');
}

function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

const handlers = {
  GET: requireAdmin(async () => {
    const { rows } = await safeQuery('SELECT id, name, created_at, last_used_at FROM api_keys ORDER BY created_at DESC');
    return Response.json(rows);
  }),
  
  POST: requireAdmin(async (req) => {
    const body = await req.json();
    if (!body.name) return Response.json({ error: 'Name required' }, { status: 400 });
    
    const apiKey = generateSecureApiKey();
    const hashedKey = hashApiKey(apiKey);
    
    await safeQuery('INSERT INTO api_keys (name, key_hash) VALUES ($1, $2)', [body.name, hashedKey]);
    
    // Return the raw key only once
    return Response.json({ key: apiKey, name: body.name }, { status: 201 });
  }),
  
  DELETE: requireAdmin(async (req) => {
    const { id } = await req.json();
    if (!id) return Response.json({ error: 'ID required' }, { status: 400 });
    await safeQuery('DELETE FROM api_keys WHERE id = $1', [id]);
    return Response.json({ success: true });
  })
};

export const { GET, POST, PUT, DELETE } = createApiRoute(handlers);
