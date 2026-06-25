'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function WishlistPage() {
  const [token, setToken] = useState('');
  const [items, setItems] = useState([]);

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
    if (savedToken) fetchWishlist(savedToken);
  }, []);

  const fetchWishlist = async (authToken) => {
    const res = await fetch('/api/wishlist', { headers: { Authorization: `Bearer ${authToken}` } });
    if (res.ok) setItems(await res.json());
  };

  const removeItem = async (productId) => {
    await fetch('/api/wishlist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ product_id: productId }),
    });
    fetchWishlist(token);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Wishlist</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map(item => (
          <div key={item.id} className="glass-card p-3">
            <Link href={`/products/${item.slug}`}>
              <img src={item.image_url || '/placeholder.jpg'} className="w-full h-32 object-cover rounded" />
              <h3 className="text-sm font-semibold mt-1">{item.title}</h3>
              <p className="text-sm font-bold">{item.price} Ks</p>
            </Link>
            <button onClick={() => removeItem(item.id)} className="mt-2 text-red-500 text-sm">Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
