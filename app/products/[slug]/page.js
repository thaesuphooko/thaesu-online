import { query } from '@/lib/db';
import AddToCartButton from '@/components/molecules/AddToCartButton';
import ProductReviews from '@/components/organisms/ProductReviews';
import Image from 'next/image';

// ISR: revalidate every 60 seconds
export const revalidate = 60;

// Generate static params for top products (optional)
export async function generateStaticParams() {
  const res = await query('SELECT slug FROM products WHERE is_active = true LIMIT 100');
  return res.rows.map(p => ({ slug: p.slug }));
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
  if (res.rows.length === 0) return <div>Product not found</div>;
  const product = res.rows[0];

  return (
    <div className="max-w-6xl mx-auto p-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative h-96 rounded-xl overflow-hidden">
          <Image
            src={product.media[0]?.url || '/placeholder.jpg'}
            alt={product.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
          <p className="text-yellow-600 text-lg mb-2">★ {Number(product.avg_rating).toFixed(1)} ({product.review_count} reviews)</p>
          <p className="text-3xl font-bold text-red-600 mb-4">{product.price.toLocaleString()} Ks</p>
          {product.compare_at_price && (
            <p className="text-gray-500 line-through">{product.compare_at_price.toLocaleString()} Ks</p>
          )}
          <p className="text-gray-700 mb-6">{product.description}</p>
          <AddToCartButton product={product} />
        </div>
      </div>
      <ProductReviews productId={product.id} />
    </div>
  );
}
