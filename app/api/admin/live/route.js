export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';

export async function GET(request) {
  let lastId = '00000000-0000-0000-0000-000000000000';
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      request.signal.addEventListener('abort', () => {
        closed = true;
        controller.close();
      });

      const sendEvent = (data) => {
        if (!closed) {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        }
      };

      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }
        try {
          const orders = await query(
            'SELECT id, total_amount, status, created_at FROM orders WHERE id > $1 ORDER BY id DESC LIMIT 5',
            [lastId]
          );
          if (orders.rows.length > 0) {
            lastId = orders.rows[0].id;
            sendEvent({ type: 'NEW_ORDERS', orders: orders.rows });
          }

          const lowStock = await query(
            'SELECT id, title, stock FROM products WHERE stock <= 5 AND is_active = true'
          );
          if (lowStock.rows.length > 0) {
            sendEvent({ type: 'LOW_STOCK', items: lowStock.rows });
          }
        } catch (e) {
          console.error('Live fetch error:', e);
        }
      }, 2000);

      // Keep-alive
      const keepAlive = setInterval(() => {
        sendEvent({ type: 'PING' });
      }, 15000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        clearInterval(keepAlive);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
