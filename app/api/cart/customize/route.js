export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
export async function PATCH(request) {
  const { productId, customization } = await request.json();
  return Response.json({ message: 'Customization saved' });
}
