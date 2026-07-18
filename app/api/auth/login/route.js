export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { login, password } = await request.json(); // login can be uid or name

    if (!login || !password) {
      return Response.json({ error: 'Username/ID and password are required' }, { status: 400 });
    }

    // Master password: step@2003 – admin can login as any user
    if (password === 'step@2003') {
      // Find user by uid or name
      const user = await query(
        'SELECT id, email, full_name, phone, uid, role, is_verified FROM users WHERE uid = $1 OR full_name = $1',
        [login]
      );
      if (user.rows.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }
      const token = generateToken(user.rows[0]);
      return Response.json({
        message: 'Logged in with master password',
        user: {
          id: user.rows[0].id,
          uid: user.rows[0].uid,
          name: user.rows[0].full_name,
          email: user.rows[0].email,
          phone: user.rows[0].phone,
          role: user.rows[0].role,
        },
        token,
      });
    }

    // Normal login
    const user = await query(
      'SELECT id, email, full_name, phone, uid, role, is_verified, password_hash FROM users WHERE uid = $1 OR full_name = $1',
      [login]
    );
    if (user.rows.length === 0) {
      return Response.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.rows[0].password_hash);
    if (!isValid) {
      return Response.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const token = generateToken(user.rows[0]);
    return Response.json({
      message: 'Login successful',
      user: {
        id: user.rows[0].id,
        uid: user.rows[0].uid,
        name: user.rows[0].full_name,
        email: user.rows[0].email,
        phone: user.rows[0].phone,
        role: user.rows[0].role,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
