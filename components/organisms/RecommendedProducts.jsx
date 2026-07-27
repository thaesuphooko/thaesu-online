'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';

const getToken = () => localStorage.getItem('token');

export default function RecommendedProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    fetch('/api/recommendations', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => res.json())
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null; // or skeleton
  if (products.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-yellow-400" />
        Recommended For You
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {products.slice(0, 4).map(p => (
          <Link key={p.id} href={`/products/${p.slug || p.id}`}>
            <motion.div whileHover={{ scale: 1.02 }} className="bg-zinc-900/50 backdrop-blur rounded-xl p-2 border border-zinc-800 hover:border-purple-500/30 transition">
              <img src={p.media?.[0]?.url || '/placeholder.jpg'} alt={p.title} className="w-full h-24 object-cover rounded-lg mb-1" />
              <p className="text-xs truncate">{p.title}</p>
              <p className="text-purple-400 font-bold text-xs">${parseFloat(p.price).toFixed(2)}</p>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
