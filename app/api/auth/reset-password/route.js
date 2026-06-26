export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request) {
  try {
    const { token, new_password } = await request.json();
    if (!token || !new_password) {
      return Response.json({ error: 'Token and new password are required' }, { status: 400 });
    }
    if (new_password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Find a paid and non-expired reset token
    const resetResult = await query(
      `SELECT * FROM password_resets
       WHERE token = $1 AND payment_status = 'paid' AND expires_at > NOW()`,
      [token]
    );
    if (resetResult.rows.length === 0) {
      return Response.json({ error: 'Invalid, unverified, or expired token' }, { status: 400 });
    }
    const reset = resetResult.rows[0];

    // Hash new password and update user
    const newHash = await hashPassword(new_password);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, reset.user_id]);

    // Delete the used reset token
    await query('DELETE FROM password_resets WHERE id = $1', [reset.id]);

    return Response.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
