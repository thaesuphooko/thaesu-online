'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, AlertTriangle, RefreshCcw } from 'lucide-react';

// ─── Network retry helper ──────────────────────
const fetchWithRetry = async (url, options = {}, retries = 2) => {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(body || `Request failed with status ${res.status}`);
      }
      const text = await res.text();
      if (!text) return []; // empty response → empty array
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error('Invalid JSON response');
      }
    } catch (err) {
      lastError = err;
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastError;
};

const SkeletonCard = () => (
  <div className="bg-zinc-900/50 backdrop-blur rounded-xl p-2 border border-zinc-800 animate-pulse">
    <div className="w-full h-24 bg-zinc-800 rounded-lg mb-1" />
    <div className="h-3 bg-zinc-800 rounded w-3/4 mb-1" />
    <div className="h-3 bg-zinc-800 rounded w-1/2" />
  </div>
);

export default function RecommendedProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const data = await fetchWithRetry('/api/recommendations', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Recommendations fetch error:', err);
      setError(err.message || 'Failed to load recommendations');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // ── Error state ─────────────────────────────
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between"
      >
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span>Could not load recommendations. {error}</span>
        </div>
        <button
          onClick={loadProducts}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
        >
          <RefreshCcw className="w-4 h-4 text-red-400" />
        </button>
      </motion.div>
    );
  }

  // ── Loading skeleton ────────────────────────
  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <div className="h-5 bg-zinc-800 rounded w-40 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="mb-6">
      <motion.h3
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-lg font-bold flex items-center gap-2 mb-3"
      >
        <Sparkles className="w-5 h-5 text-yellow-400" />
        Recommended For You
      </motion.h3>
      <div className="grid grid-cols-2 gap-2">
        {products.slice(0, 4).map((p, idx) => (
          <Link key={p.id} href={`/products/${p.slug || p.id}`}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(168,85,247,0.15)' }}
              className="bg-zinc-900/50 backdrop-blur-md rounded-xl p-2 border border-zinc-800 hover:border-purple-500/50 transition-all duration-300"
            >
              <div className="w-full h-24 rounded-lg mb-1 overflow-hidden">
                <img
                  src={p.media?.[0]?.url || p.image || '/placeholder.jpg'}
                  alt={p.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                  onError={(e) => { e.target.src = '/placeholder.jpg'; }}
                />
              </div>
              <p className="text-xs truncate font-medium">{p.title}</p>
              <p className="text-purple-400 font-bold text-xs">
                ${parseFloat(p.price || 0).toFixed(2)}
              </p>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
