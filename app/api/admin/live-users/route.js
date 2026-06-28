export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';

export async function GET(request) {
  let closed = false;              // track if stream is already closed
  let interval;

  const stream = new ReadableStream({
    start(controller) {
      const sendCount = async () => {
        // If the stream has been closed, do nothing
        if (closed) return;

        try {
          const res = await query(
            "SELECT COUNT(*) FROM live_users WHERE last_seen > NOW() - INTERVAL '1 minute'"
          );
          const count = parseInt(res.rows[0].count);
          // Double‑check closed before enqueuing
          if (!closed) controller.enqueue(`data: ${count}\n\n`);
        } catch (e) {
          // Log but don't crash – send a zero count as fallback
          console.error('live-users query error:', e);
          if (!closed) controller.enqueue(`data: 0\n\n`);
        }
      };

      // Send the very first count immediately
      sendCount();

      // Then send every 5 seconds
      interval = setInterval(sendCount, 5000);

      // When the client disconnects, clean up gracefully
      request.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch (_) {
          // controller may already be closed – ignore
        }
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
