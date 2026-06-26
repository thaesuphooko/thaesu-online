export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { verifyToken, hashPassword } from '@/lib/auth';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.split(' ')[1];
  let user;
  try { user = verifyToken(token); } catch { return Response.json({ error: 'Invalid token' }, { status: 401 }); }
  const res = await query('SELECT id, email, full_name, role, is_18_plus, created_at FROM users WHERE id = $1', [user.id]);
  if (res.rows.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(res.rows[0]);
}

export async function PUT(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.split(' ')[1];
  let user;
  try { user = verifyToken(token); } catch { return Response.json({ error: 'Invalid token' }, { status: 401 }); }
  const { full_name, email, current_password, new_password } = await request.json();
  // Update password if provided
  if (new_password) {
    if (!current_password) return Response.json({ error: 'Current password required' }, { status: 400 });
    const userData = await query('SELECT password_hash FROM users WHERE id = $1', [user.id]);
    const valid = await comparePassword(current_password, userData.rows[0].password_hash);
    if (!valid) return Response.json({ error: 'Current password incorrect' }, { status: 400 });
    const newHash = await hashPassword(new_password);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
  }
  // Update profile
  if (full_name) await query('UPDATE users SET full_name = $1 WHERE id = $2', [full_name, user.id]);
  // Note: email change requires verification in real app; skip for now
  return Response.json({ message: 'Profile updated' });
}
