export const dynamic = 'force-dynamic';
import { checkAdmin } from '@/lib/adminAuth';
export async function GET(request) {
  const auth = checkAdmin(request);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });
  const { sendOrderNotification } = await import('@/lib/telegram');
  await sendOrderNotification('test-123', [{ product_title:'Test Item', quantity:1, price:0 }], 0, 'Bot Test');
  return Response.json({ message: 'Test sent' });
}
