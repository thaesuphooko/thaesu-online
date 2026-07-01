'use client';
import { memo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Crect fill=%22%23f3f4f6%22 width=%22300%22 height=%22300%22/%3E%3Ctext fill=%22%239ca3af%22 font-family=%22sans-serif%22 font-size=%2230%22 dy=%2210.5%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22%3ENo Image%3C/text%3E%3C/svg%3E';

const ProductCard = memo(({ product }) => {
  const imageUrl = product.media?.[0]?.url || PLACEHOLDER;
  const discount = product.compare_at_price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : null;
  // Stock: -1 = Unlimited, 0 = Out of Stock, >0 = In Stock
  const isUnlimited = product.stock === -1;
  const inStock = product.stock > 0 || isUnlimited;

  return (
    <Link href={`/products/${product.slug}`} className="block group">
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 active:scale-[0.98]">
        <div className="relative w-full aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, 25vw"
            onError={(e) => { e.target.src = PLACEHOLDER; }}
          />
          {discount && discount > 0 && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              -{discount}%
            </span>
          )}
          {!inStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white text-xs font-bold bg-red-500 px-2 py-1 rounded">Out of Stock</span>
            </div>
          )}
        </div>

        <div className="p-2 space-y-1">
          <h3 className="text-xs font-medium text-gray-800 dark:text-gray-100 line-clamp-2 leading-4">
            {product.title}
          </h3>
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-bold text-rose-500">
              {parseFloat(product.price).toLocaleString()} Ks
            </span>
            {product.compare_at_price && (
              <span className="text-[10px] text-gray-400 line-through">
                {parseFloat(product.compare_at_price).toLocaleString()} Ks
              </span>
            )}
          </div>
          <div className="text-[10px]">
            {inStock ? (
              <span className="text-green-500">✓ In Stock</span>
            ) : (
              <span className="text-red-400">✗ Out of Stock</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
});
ProductCard.displayName = 'ProductCard';
export default ProductCard;
