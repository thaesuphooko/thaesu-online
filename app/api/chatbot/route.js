export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

const responses = {
  greeting: "Hello! I'm the Thaesu Online assistant. How can I help you?",
  order: "You can check your order status in 'My Orders' section. For tracking, use the Order Tracking page.",
  return: "Our return policy allows returns within 7 days of delivery. Please contact support for assistance.",
  default: "I'm sorry, I didn't understand. Please ask about orders, products, or contact support."
};

export async function POST(request) {
  const { message } = await request.json();
  let reply = responses.default;
  if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
    reply = responses.greeting;
  } else if (message.toLowerCase().includes('order')) {
    reply = responses.order;
  } else if (message.toLowerCase().includes('return') || message.toLowerCase().includes('refund')) {
    reply = responses.return;
  }
  return Response.json({ reply });
}
