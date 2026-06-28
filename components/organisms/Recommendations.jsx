'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Recommendations({ productId }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (productId) {
      fetch(`/api/products/${productId}/recommendations`)
        .then(res => res.json())
        .then(data => {
          // Ensure data is an array
          if (Array.isArray(data)) {
            setItems(data);
          } else {
            setItems([]);
          }
        })
        .catch(() => setItems([]));
    }
  }, [productId]);

  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-4">You might also like</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map(item => (
          <Link key={item.id} href={`/products/${item.slug}`} className="glass-card p-3 hover:scale-[1.02] transition">
            <img src={item.image_url || '/placeholder.jpg'} alt={item.title} className="w-full h-32 object-cover rounded-lg mb-2" />
            <h3 className="text-sm font-semibold line-clamp-2">{item.title}</h3>
            <p className="text-sm font-bold mt-1">{item.price.toLocaleString()} Ks</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
