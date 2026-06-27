import { query } from '@/lib/db';
import AddToCartButton from '@/components/molecules/AddToCartButton';
import ProductReviews from '@/components/organisms/ProductReviews';
import Recommendations from '@/components/organisms/Recommendations';
import Image from 'next/image';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const res = await query('SELECT title, description FROM products WHERE slug = $1', [slug]);
  if (res.rows.length === 0) return { title: 'Product Not Found' };
  const product = res.rows[0];
  return {
    title: `${product.title} | Thaesu Online`,
    description: product.description || 'Premium product on Thaesu Online',
  };
}

export default async function ProductDetail({ params }) {
  const { slug } = await params;
  const res = await query(
    `SELECT p.*, 
      COALESCE(json_agg(DISTINCT jsonb_build_object('id', m.id, 'url', m.cloudinary_url, 'type', m.media_type))
      FILTER (WHERE m.id IS NOT NULL), '[]') AS media,
      COALESCE(AVG(r.rating), 0) AS avg_rating,
      COUNT(r.id) AS review_count
    FROM products p
    LEFT JOIN media m ON m.product_id = p.id
    LEFT JOIN reviews r ON r.product_id = p.id
    WHERE p.slug = $1
    GROUP BY p.id`,
    [slug]
  );
  if (res.rows.length === 0) notFound();
  const product = res.rows[0];
  return (
    <div className="max-w-6xl mx-auto p-4 py-8 animate-fadeIn">
      {/* ... same as before ... */}
    </div>
  );
}
