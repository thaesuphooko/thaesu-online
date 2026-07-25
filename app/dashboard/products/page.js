import pool from '@/lib/db';
import ProductsClient from './ProductsClient';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  let products = [];
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    products = result.rows;
  } catch (error) {
    console.error('❌ Failed to fetch products:', error.message);
  }
  return <ProductsClient initialProducts={products} />;
}
