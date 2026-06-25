import { query } from '@/lib/db';
import { createWavePayment } from '@/lib/wavepay';
import { randomBytes } from 'crypto';

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find user
    const userResult = await query('SELECT id, email FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      // Don't reveal if email exists; still return "success"
      return Response.json({ message: 'If the email is registered, you will receive a reset link.' });
    }
    const user = userResult.rows[0];

    // Generate reset token
    const token = randomBytes(32).toString('hex');

    // Create Wave payment instruction
    const payment = await createWavePayment(1000); // 1,000 Kyat

    // Save reset record with pending status
    await query(
      `INSERT INTO password_resets (user_id, token, amount, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes')`,
      [user.id, token, 1000]
    );

    // In a real app, send this via email. For now, return it in response (dev only).
    return Response.json({
      message: 'Payment required to reset password.',
      reset_token: token,          // ⚠️ In production, send via email, not here!
      payment_instruction: `Please transfer ${payment.amount} Kyat to ${payment.merchant_number} (Wave Pay) and then verify using the token.`,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
