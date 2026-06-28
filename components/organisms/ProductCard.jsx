'use client';
import { memo } from 'react';
import Link from 'next/link';
import useCartStore from '@/store/cartStore';
import WishlistButton from '@/components/atoms/WishlistButton';

const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Crect fill=%22%23e2e8f0%22 width=%22300%22 height=%22300%22/%3E%3Ctext fill=%22%2394a3b8%22 font-size=%2230%22 dy=%2210.5%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22%3ENo Image%3C/text%3E%3C/svg%3E';

const ProductCard = memo(({ product }) => {
  const imageUrl = product.media?.[0]?.url || PLACEHOLDER_IMAGE;
  const addItem = useCartStore((s) => s.addItem);
  const price = Number(product.price) || 0;
  const comparePrice = product.compare_at_price ? Number(product.compare_at_price) : null;

  return (
    <div className="glass-card p-3 flex flex-col transition-transform hover:scale-[1.02] hover:shadow-2xl duration-300 relative">
      <WishlistButton productId={product.id} />
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative w-full h-48 rounded-lg overflow-hidden mb-3">
          <img src={imageUrl} alt={product.title} className="w-full h-full object-cover" loading="lazy" />
          {comparePrice && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">Sale</span>
          )}
        </div>
        <h3 className="font-semibold text-sm line-clamp-2 hover:text-blue-600 transition">{product.title}</h3>
      </Link>
      <div className="mt-auto flex items-center justify-between pt-2">
        <div>
          <span className="text-lg font-bold">{price.toLocaleString()} Ks</span>
          {comparePrice && (
            <span className="text-xs text-gray-400 line-through ml-2">{comparePrice.toLocaleString()} Ks</span>
          )}
        </div>
        <span className="text-xs text-gray-500">{product.category || ''}</span>
      </div>
      <button
        onClick={() => addItem(product)}
        className="mt-3 w-full py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition text-sm font-medium"
      >
        Add to Cart
      </button>
    </div>
  );
});
ProductCard.displayName = 'ProductCard';
export default ProductCard;
