export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
export async function PATCH(request) {
  const { vendorId, rating } = await request.json();
  await query('UPDATE vendors SET rating = (rating * review_count + $1) / (review_count + 1), review_count = review_count + 1 WHERE id = $2', [rating, vendorId]);
  return Response.json({ message: 'Reputation updated' });
}
