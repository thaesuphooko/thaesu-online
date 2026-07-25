import pool from '@/lib/db';
import VendorClient from './VendorClient';

export const dynamic = 'force-dynamic';

export default async function VendorPage() {
  let vendors = [];
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.full_name AS name, u.email, u.phone,
        u.store_name, u.store_slug,
        COALESCE(u.vendor_status, 'pending') AS status, u.created_at,
        COUNT(p.id)::int AS product_count
      FROM users u
      LEFT JOIN products p ON p.vendor_id = u.id
      WHERE u.role = 'vendor'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    vendors = result.rows;
  } catch (error) {
    console.error('Failed to fetch vendors:', error.message);
  }
  return <VendorClient initialVendors={vendors} />;
}
