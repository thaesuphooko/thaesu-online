'use client';
import { memo } from 'react';

const ProductCard = memo(({ product }) => {
  const imageUrl = product.media?.[0]?.url || '/placeholder.jpg';
  return (
    <div className="glass-card p-3 flex flex-col transition-transform hover:scale-[1.02] hover:shadow-2xl duration-300">
      <div className="relative w-full h-48 rounded-lg overflow-hidden mb-3">
        <img
          src={imageUrl}
          alt={product.title}
          className="w-full h-full object-cover lazy-load"
          loading="lazy"
        />
        {product.compare_at_price && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            Sale
          </span>
        )}
      </div>
      <h3 className="font-semibold text-sm line-clamp-2">{product.title}</h3>
      <div className="mt-auto flex items-center justify-between pt-2">
        <div>
          <span className="text-lg font-bold">
            {product.price.toLocaleString()} Ks
          </span>
          {product.compare_at_price && (
            <span className="text-xs text-gray-400 line-through ml-2">
              {product.compare_at_price.toLocaleString()} Ks
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">{product.category}</span>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';
export default ProductCard;
