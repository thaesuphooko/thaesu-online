// Wave Pay Real API Integration (requires merchant credentials)
const WAVE_MERCHANT_ID = process.env.WAVE_MERCHANT_ID;
const WAVE_SECRET_KEY = process.env.WAVE_SECRET_KEY;

export async function createWavePaymentReal(amount, orderId) {
  const response = await fetch('https://api.wavepay.com/v1/payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${WAVE_SECRET_KEY}`
    },
    body: JSON.stringify({
      merchant_id: WAVE_MERCHANT_ID,
      amount,
      order_id: orderId,
      currency: 'MMK',
      redirect_url: `${process.env.VERCEL_URL}/api/payment/callback`
    })
  });
  if (!response.ok) throw new Error('Wave Pay error');
  return response.json();
}

export async function verifyWavePaymentReal(transactionId) {
  const response = await fetch(`https://api.wavepay.com/v1/transaction/${transactionId}`, {
    headers: { 'Authorization': `Bearer ${WAVE_SECRET_KEY}` }
  });
  if (!response.ok) return false;
  const data = await response.json();
  return data.status === 'success';
}
