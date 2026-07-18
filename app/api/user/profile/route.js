import { query } from '@/lib/db';
import { verifyToken, hashPassword } from '@/lib/auth';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);
  if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 });

  const result = await query(
    'SELECT id, uid, email, full_name, phone, role, avatar_url, avatar_url, created_at FROM users WHERE id = $1',
    [user.id]
  );
  if (result.rows.length === 0) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }
  return Response.json({ user: result.rows[0] });
}

export async function PUT(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);
  if (!user) return Response.json({ error: 'Invalid token' }, { status: 401 });

  const { name, email, phone, currentPassword, newPassword } = await request.json();

  // If changing password, verify current password
  if (newPassword) {
    if (!currentPassword) {
      return Response.json({ error: 'Current password is required to set new password' }, { status: 400 });
    }
    const currentUser = await query('SELECT password_hash FROM users WHERE id = $1', [user.id]);
    const { verifyPassword } = await import('@/lib/auth');
    const valid = await verifyPassword(currentPassword, currentUser.rows[0].password_hash);
    if (!valid) {
      return Response.json({ error: 'Current password is incorrect' }, { status: 400 });
    }
    const newHash = await hashPassword(newPassword);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
  }

  // Update other fields
  await query(
    'UPDATE users SET full_name = COALESCE($1, full_name), email = COALESCE($2, email), phone = COALESCE($3, phone) WHERE id = $4',
    [name || null, email || null, phone || null, user.id]
  );

  const updated = await query('SELECT id, uid, email, full_name, phone, role, avatar_url, avatar_url FROM users WHERE id = $1', [user.id]);
  return Response.json({ user: updated.rows[0] });
}
