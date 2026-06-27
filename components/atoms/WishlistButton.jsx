'use client';
import { useState, useEffect } from 'react';
export default function WishlistButton({ productId, icon = '❤️' }) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [token, setToken] = useState('');
  useEffect(() => { setToken(localStorage.getItem('adminToken') || ''); }, []);
  useEffect(() => { if (token && productId) { fetch('/api/wishlist', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => setIsWishlisted(d.some(i => i.id === productId))); } }, [token, productId]);
  const toggle = async () => {
    if (!token) return;
    const method = isWishlisted ? 'DELETE' : 'POST';
    await fetch('/api/wishlist', { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ product_id: productId }) });
    setIsWishlisted(!isWishlisted);
  };
  return <button onClick={toggle} className="absolute top-2 right-2 z-10 text-2xl">{isWishlisted ? icon : '🤍'}</button>;
}
