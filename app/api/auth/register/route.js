import { query } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password, full_name, is_18_plus, role, referral_code } = await request.json();
    if (!email || !password || !full_name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    const userRole = (role === 'vendor' || role === 'admin') ? role : 'customer';
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return Response.json({ error: 'Email already registered' }, { status: 409 });
    }
    const password_hash = await hashPassword(password);
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_18_plus)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, role, is_verified, created_at`,
      [email, password_hash, full_name, userRole, is_18_plus || false]
    );
    const user = result.rows[0];

    if (referral_code) {
      try {
        await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/referrals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: referral_code, userId: user.id }),
        });
      } catch (e) { console.error('Referral error:', e); }
    }

    const token = generateToken(user);
    return Response.json(
      { message: 'Registration successful', user: { id: user.id, email: user.email, role: user.role }, token },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
