import { cookies } from 'next/headers';
import Link from 'next/link';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import OrdersClient from './OrdersClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OrdersPage() {
  const token = cookies().get('token')?.value;
  if (!token) return <div className="text-center py-20 text-zinc-400">Please login to view orders.</div>;
  let user;
  try { user = verifyToken(token); } catch { return <div className="text-center py-20 text-red-500">Invalid session.</div>; }
  if (!user?.id) return <div className="text-center py-20 text-red-500">Please login.</div>;

  const { rows: orders } = await db.query(
    `SELECT o.*, COUNT(oi.id)::int AS item_count
     FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id
     WHERE o.user_id = $1 GROUP BY o.id ORDER BY o.created_at DESC`,
    [user.id]
  );

  return <OrdersClient orders={orders} />;
}
