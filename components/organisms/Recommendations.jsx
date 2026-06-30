'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Recommendations({ productId }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch(`/api/products/${productId}/recommendations`)
      .then(r => r.json())
      .then(d => setItems(d))
      .catch(() => {});
  }, [productId]);

  if (!items.length) return null;

  return (
    <div className="px-4">
      <h2 className="text-lg font-bold mb-3">You might also like</h2>
      <div className="grid grid-cols-2 gap-3">
        {items.map(item => (
          <Link key={item.id} href={`/products/${item.slug}`} className="glass-card p-2 space-y-1">
            <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-100">
              <Image src={item.image_url || '/placeholder.jpg'} alt={item.title} fill className="object-cover" />
            </div>
            <p className="text-xs font-medium line-clamp-2">{item.title}</p>
            <p className="text-sm font-bold text-rose-500">{parseFloat(item.price).toLocaleString()} Ks</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
