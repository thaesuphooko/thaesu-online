import pool from '@/lib/db';
import CouponsClient from './CouponsClient';

export const dynamic = 'force-dynamic';

export default async function CouponsPage() {
  const result = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
  return <CouponsClient initialCoupons={result.rows} />;
}
