export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { verifyWavePayment } from '@/lib/wavepay';

export async function POST(request) {
  try {
    const { token, wave_transaction_id } = await request.json();
    if (!token || !wave_transaction_id) {
      return Response.json({ error: 'Token and transaction ID are required' }, { status: 400 });
    }

    // Find reset record by token
    const resetResult = await query(
      'SELECT * FROM password_resets WHERE token = $1 AND payment_status = $2',
      [token, 'pending']
    );
    if (resetResult.rows.length === 0) {
      return Response.json({ error: 'Invalid or expired token' }, { status: 400 });
    }
    const reset = resetResult.rows[0];

    // Check expiry
    if (new Date(reset.expires_at) < new Date()) {
      return Response.json({ error: 'Token has expired' }, { status: 400 });
    }

    // Verify Wave payment (simulated)
    const isPaid = await verifyWavePayment(wave_transaction_id);
    if (!isPaid) {
      return Response.json({ error: 'Payment verification failed. Please check your transaction ID.' }, { status: 402 });
    }

    // Mark as paid
    await query(
      `UPDATE password_resets SET payment_status = 'paid', wave_transaction_id = $1 WHERE id = $2`,
      [wave_transaction_id, reset.id]
    );

    return Response.json({ message: 'Payment verified. You may now reset your password.', token });
  } catch (error) {
    console.error('Verify wave error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
