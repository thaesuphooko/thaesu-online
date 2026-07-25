import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/socialAuth';
import { query } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';

export async function PUT(req) {
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, email, phone, currentPassword, newPassword } = await req.json();
  try {
    const updates = [];
    const values = [];
    let idx = 1;
    if (name) { updates.push(`full_name = $${idx++}`); values.push(name); }
    if (email) { updates.push(`email = $${idx++}`); values.push(email); }
    if (phone) { updates.push(`phone = $${idx++}`); values.push(phone); }

    if (newPassword && currentPassword) {
      const userRow = await query('SELECT password_hash FROM users WHERE id = $1', [user.id]);
      if (!userRow.rows.length) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      const valid = await verifyPassword(currentPassword, userRow.rows[0].password_hash);
      if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      const hashed = await hashPassword(newPassword);
      updates.push(`password_hash = $${idx++}`);
      values.push(hashed);
    }

    if (updates.length > 0) {
      values.push(user.id);
      await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, values);
    }

    const updated = await query('SELECT id, full_name, email, phone, uid, avatar_url FROM users WHERE id = $1', [user.id]);
    return NextResponse.json({ user: updated.rows[0] });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
