export const dynamic = 'force-dynamic';
export async function POST(request) {
  const { message } = await request.json();
  const faq = {
    'order': 'You can track your order in "My Orders".',
    'return': 'Returns are accepted within 7 days of delivery.',
    'payment': 'We accept WavePay. Transfer screenshot after order.',
  };
  const reply = faq[message.toLowerCase()] || 'Please ask about orders, returns, or payment.';
  return Response.json({ reply });
}
