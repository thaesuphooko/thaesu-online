export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { message } = await request.json();
    // Safety check: if message is undefined or not a string, return error
    if (typeof message !== 'string' || message.trim() === '') {
      return Response.json({ reply: 'Please provide a valid message.' }, { status: 400 });
    }

    const faq = {
      'order': 'You can track your order in "My Orders".',
      'return': 'Returns are accepted within 7 days of delivery.',
      'payment': 'We accept WavePay. Transfer screenshot after order.',
    };

    const lowerMsg = message.toLowerCase();
    const reply = faq[lowerMsg] || 'Please ask about orders, returns, or payment.';
    return Response.json({ reply });
  } catch (error) {
    console.error('Chatbot error:', error);
    return Response.json({ reply: 'An error occurred. Please try again.' }, { status: 500 });
  }
}
