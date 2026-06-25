'use client';
import { memo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Crect fill=%22%23e2e8f0%22 width=%22300%22 height=%22300%22/%3E%3Ctext fill=%22%2394a3b8%22 font-size=%2230%22 dy=%2210.5%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22%3ENo Img%3C/text%3E%3C/svg%3E';

const ProductCard = memo(({ product }) => {
  const imageUrl = product.media?.[0]?.url || PLACEHOLDER_IMAGE;
  const [wishlisted, setWishlisted] = useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : '';

  const toggleWishlist = async () => {
    if (!token) return;
    if (wishlisted) {
      await fetch('/api/wishlist', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ product_id: product.id }) });
      setWishlisted(false);
    } else {
      await fetch('/api/wishlist', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ product_id: product.id }) });
      setWishlisted(true);
    }
  };

  return (
    <div className="glass-card p-3 flex flex-col transition-transform hover:scale-[1.02] hover:shadow-2xl duration-300 relative">
      <button onClick={toggleWishlist} className="absolute top-2 right-2 z-10 text-2xl">
        {wishlisted ? '❤️' : '🤍'}
      </button>
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative w-full h-48 rounded-lg overflow-hidden mb-3">
          <Image src={imageUrl} alt={product.title} fill className="object-cover" loading="lazy" sizes="(max-width: 768px) 100vw, 33vw" />
          {product.compare_at_price && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">Sale</span>
          )}
        </div>
        <h3 className="font-semibold text-sm line-clamp-2 hover:text-blue-600 transition">{product.title}</h3>
      </Link>
      <div className="mt-auto flex items-center justify-between pt-2">
        <div>
          <span className="text-lg font-bold">{product.price.toLocaleString()} Ks</span>
          {product.compare_at_price && <span className="text-xs text-gray-400 line-through ml-2">{product.compare_at_price.toLocaleString()} Ks</span>}
        </div>
        <span className="text-xs text-gray-500">{product.category}</span>
      </div>
    </div>
  );
});
ProductCard.displayName = 'ProductCard';
export default ProductCard;
