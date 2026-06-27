export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';

export async function GET() {
  const result = await query(
    "UPDATE orders SET status = 'cancelled' WHERE status = 'pending' AND timer_expiry < NOW()"
  );
  return Response.json({ cancelled: result.rowCount });
}
