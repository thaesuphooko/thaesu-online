export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
export async function GET(request) {
  const stream = new ReadableStream({
    start(controller) {
      const send = async () => {
        const alerts = await query("SELECT id, title FROM products WHERE stock <= 5 AND is_active = true LIMIT 1");
        if (alerts.rows.length > 0) controller.enqueue(`data: ${JSON.stringify({ type: 'LOW_STOCK', product: alerts.rows[0] })}\n\n`);
      };
      send();
      const interval = setInterval(send, 10000);
      request.signal.addEventListener('abort', () => clearInterval(interval));
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
}
