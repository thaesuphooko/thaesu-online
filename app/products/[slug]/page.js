import { query } from '@/lib/db';
import AddToCartButton from '@/components/molecules/AddToCartButton';
import ProductReviews from '@/components/organisms/ProductReviews';
import Recommendations from '@/components/organisms/Recommendations';
import Image from 'next/image';
import Link from 'next/link';

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

  if (res.rows.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-8 text-center">
        <div className="glass-card p-8 animate-fadeIn">
          <h1 className="text-3xl font-bold mb-4">Product Not Found</h1>
          <p className="text-muted-foreground mb-6">This product may have been removed or is coming soon.</p>
          <Link href="/products" className="text-primary hover:underline text-lg">← Back to Products</Link>
        </div>
      </div>
    );
  }

  const product = res.rows[0];

  return (
    <div className="max-w-6xl mx-auto p-4 py-8 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="relative h-96 md:h-[500px] rounded-2xl overflow-hidden shadow-glass">
          <Image
            src={product.media[0]?.url || '/placeholder.jpg'}
            alt={product.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>

        {/* Product Info */}
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold">{product.title}</h1>
          <div className="flex items-center gap-2 text-yellow-600 text-lg">
            <span>{'★'.repeat(Math.floor(product.avg_rating))}{'☆'.repeat(5 - Math.floor(product.avg_rating))}</span>
            <span className="text-sm text-muted-foreground">({product.review_count} reviews)</span>
          </div>

          <div className="text-4xl font-bold text-primary">{product.price.toLocaleString()} Ks</div>
          {product.compare_at_price && (
            <div className="text-lg text-muted-foreground line-through">{product.compare_at_price.toLocaleString()} Ks</div>
          )}

          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">Stock: {product.stock > 0 ? <span className="text-green-600 font-semibold">{product.stock} available</span> : <span className="text-red-500">Out of stock</span>}</span>
          </div>

          <div className="prose prose-sm text-muted-foreground mt-4" dangerouslySetInnerHTML={{ __html: product.description }} />

          <div className="pt-4">
            {product.stock > 0 ? (
              <AddToCartButton product={product} />
            ) : (
              <button disabled className="px-6 py-3 bg-gray-400 text-white rounded-xl cursor-not-allowed">
                Out of Stock
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Description & Reviews */}
      <div className="mt-12">
        <ProductReviews productId={product.id} />
      </div>

      {/* Related Products */}
      <div className="mt-12">
        <Recommendations productId={product.id} />
      </div>
    </div>
  );
}
