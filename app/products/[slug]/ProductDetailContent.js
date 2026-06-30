import { query } from '@/lib/db';
import AddToCartButton from '@/components/molecules/AddToCartButton';
import ProductReviews from '@/components/organisms/ProductReviews';
import Recommendations from '@/components/organisms/Recommendations';
import Image from 'next/image';

export default async function ProductDetailContent({ params }) {
  const { slug } = await params;
  let product;
  try {
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
    product = res.rows[0];
  } catch (err) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center space-y-4">
        <div className="text-6xl">⚠️</div>
        <h1 className="text-2xl font-bold">Temporary Error</h1>
        <p className="text-muted-foreground">We couldn't load this product right now. Please try again in a moment.</p>
        <a href="/products" className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-xl">Browse Products</a>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center space-y-4">
        <div className="text-6xl">🔍</div>
        <h1 className="text-2xl font-bold">Product Not Found</h1>
        <p className="text-muted-foreground">This product may have been removed or doesn't exist.</p>
        <a href="/products" className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-xl">Browse Products</a>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 py-8 animate-fadeIn">
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
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold">{product.title}</h1>
          <div className="flex items-center gap-2 text-yellow-600">
            <span>{'★'.repeat(Math.floor(product.avg_rating))}{'☆'.repeat(5 - Math.floor(product.avg_rating))}</span>
            <span className="text-sm text-muted-foreground">({product.review_count} reviews)</span>
          </div>
          <div className="text-4xl font-bold text-primary">{parseFloat(product.price).toLocaleString()} Ks</div>
          {product.compare_at_price && <div className="text-lg text-muted-foreground line-through">{parseFloat(product.compare_at_price).toLocaleString()} Ks</div>}
          <div className="prose prose-sm text-muted-foreground">{product.description}</div>
          <AddToCartButton product={product} />
        </div>
      </div>
      <div className="mt-12"><ProductReviews productId={product.id} /></div>
      <div className="mt-12"><Recommendations productId={product.id} /></div>
    </div>
  );
}
