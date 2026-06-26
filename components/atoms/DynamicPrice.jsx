'use client';
import { useState, useEffect } from 'react';

export default function DynamicPrice({ slug, originalPrice }) {
  const [dynamicPrice, setDynamicPrice] = useState(null);

  useEffect(() => {
    fetch(`/api/products/${slug}/price`)
      .then(res => res.json())
      .then(data => {
        if (data.dynamic_price !== undefined) setDynamicPrice(data.dynamic_price);
      })
      .catch(() => {});
  }, [slug]);

  if (dynamicPrice !== null && dynamicPrice !== originalPrice) {
    return (
      <div>
        <p className="text-3xl font-bold text-red-600">{dynamicPrice.toLocaleString()} Ks</p>
        <p className="text-sm text-gray-500 line-through">{originalPrice.toLocaleString()} Ks</p>
      </div>
    );
  }
  return <p className="text-3xl font-bold text-red-600">{originalPrice.toLocaleString()} Ks</p>;
}
