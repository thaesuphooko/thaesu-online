import { query } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password, full_name, is_18_plus } = await request.json();

    // Basic validation
    if (!email || !password || !full_name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return Response.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Insert user
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, is_18_plus)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, role, is_verified, created_at`,
      [email, password_hash, full_name, is_18_plus || false]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = generateToken(user);

    return Response.json(
      {
        message: 'Registration successful',
        user: { id: user.id, email: user.email, role: user.role },
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
