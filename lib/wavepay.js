// Wave Pay integration helper (simulated verification for development)
// In production, integrate with Wave Pay's actual API.

/**
 * Generate a Wave Pay payment order (static for now).
 * Returns a dummy transaction reference and the merchant info.
 */
export async function createWavePayment(amount = 1000) {
  const merchantNumber = process.env.WAVE_MERCHANT_NUMBER || '09xxxxxxxxx';
  return {
    merchant_number: merchantNumber,
    amount,
    reference: `reset-${Date.now()}`,
    message: `Please send ${amount} Kyat to ${merchantNumber} to verify your identity.`,
  };
}

/**
 * Simulate verifying a Wave transaction.
 * In production, check via Wave API using the transaction_id.
 */
export async function verifyWavePayment(transactionId) {
  // For now, any non-empty transaction ID is treated as "paid" (demo mode)
  if (process.env.WAVE_VERIFY_MODE === 'demo') {
    return transactionId && transactionId.length > 5;
  }
  // TODO: Call Wave API to verify transaction
  return false;
}
