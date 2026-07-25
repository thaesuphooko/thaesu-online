export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

function generateUID() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let uid = '';
  for (let i = 0; i < 8; i++) {
    uid += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return uid;
}

export async function POST(request) {
  try {
    const { name, password, email, phone, role, store_name, store_slug } = await request.json();

    if (!name || !password) {
      return Response.json({ error: 'Name and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Determine role – accept from client if 'vendor', otherwise default 'customer'
    const userRole = (role === 'vendor' || role === 'admin') ? role : 'customer';

    // Generate unique UID
    let uid = '';
    let exists = true;
    while (exists) {
      uid = generateUID();
      const check = await query('SELECT id FROM users WHERE uid = $1', [uid]);
      if (check.rows.length === 0) exists = false;
    }

    const password_hash = await hashPassword(password);
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, phone, uid, role, store_name, store_slug)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, full_name, phone, uid, role, store_name, store_slug, is_verified, created_at`,
      [email || null, password_hash, name, phone || null, uid, userRole, store_name || null, store_slug || null]
    );
    const user = result.rows[0];

    const token = generateToken(user);
    return Response.json({
      message: 'Registration successful',
      user: {
        id: user.id,
        uid: user.uid,
        name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        store_name: user.store_name,
        store_slug: user.store_slug,
      },
      token,
    }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
