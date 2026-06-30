'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import ProductCard from '@/components/organisms/ProductCard';
import { useCartStore } from '@/store/cartStore';

const Skeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden animate-pulse">
    <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-700" />
    <div className="p-2.5 space-y-2">
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
    </div>
  </div>
);

export default function ProductCatalog() {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const observerRef = useRef(null);
  const limit = 20;

  const fetchProducts = useCallback(async (pageNum, searchTerm = '') => {
    setLoading(true);
    try {
      const url = new URL('/api/products', window.location.origin);
      url.searchParams.set('page', pageNum);
      url.searchParams.set('limit', limit);
      if (searchTerm) url.searchParams.set('search', searchTerm);
      const res = await fetch(url);
      const json = await res.json();
      if (pageNum === 1) setProducts(json.data);
      else setProducts(prev => [...prev, ...json.data]);
      setHasMore(json.pagination.page < json.pagination.totalPages);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { setPage(1); setProducts([]); fetchProducts(1, search); }, [search, fetchProducts]);

  const lastProductRef = useCallback(node => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) setPage(prev => prev + 1);
    }, { threshold: 0.1 });
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore]);

  useEffect(() => { if (page > 1) fetchProducts(page, search); }, [page, search, fetchProducts]);

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-3 py-3">
      {/* Search Bar */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md pb-3 mb-3">
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-rose-400 text-sm"
        />
      </div>

      {/* Product Grid – 2 cols mobile, 3 tablet, 4 small desktop, 5 large desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
        {loading && products.length === 0 && Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} />)}
        {products.map((product, index) => {
          const isLast = index === products.length - 1;
          return (
            <div ref={isLast ? lastProductRef : null} key={product.id}>
              <ProductCard product={product} />
            </div>
          );
        })}
      </div>

      {loading && products.length > 0 && (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-rose-400" />
        </div>
      )}
      {!hasMore && products.length > 0 && (
        <p className="text-center py-8 text-xs text-gray-400">— All products loaded —</p>
      )}
    </div>
  );
}
