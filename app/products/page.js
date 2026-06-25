'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import ProductCard from '@/components/organisms/ProductCard';

export default function ProductCatalog() {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const observerRef = useRef(null);

  const limit = 12;

  // Fetch products from API
  const fetchProducts = useCallback(async (pageNum, searchTerm = '') => {
    setLoading(true);
    try {
      const url = new URL('/api/products', window.location.origin);
      url.searchParams.set('page', pageNum);
      url.searchParams.set('limit', limit);
      if (searchTerm) url.searchParams.set('search', searchTerm);

      const res = await fetch(url);
      const json = await res.json();
      if (pageNum === 1) {
        setProducts(json.data);
      } else {
        setProducts(prev => [...prev, ...json.data]);
      }
      setHasMore(json.pagination.page < json.pagination.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load & search change
  useEffect(() => {
    setPage(1);
    setProducts([]);
    fetchProducts(1, search);
  }, [search, fetchProducts]);

  // Infinite scroll observer
  const lastProductRef = useCallback(node => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    }, { threshold: 0.5 });
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore]);

  // Fetch when page changes (except page 1 already handled)
  useEffect(() => {
    if (page > 1) {
      fetchProducts(page, search);
    }
  }, [page, search, fetchProducts]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Product Catalog</h1>
      
      {/* Search Bar */}
      <div className="mb-8">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full md:w-1/2 p-3 rounded-xl glass-card outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product, index) => {
          if (products.length === index + 1) {
            return (
              <div ref={lastProductRef} key={product.id}>
                <ProductCard product={product} />
              </div>
            );
          }
          return (
            <div key={product.id}>
              <ProductCard product={product} />
            </div>
          );
        })}
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      )}

      {!hasMore && products.length > 0 && (
        <p className="text-center py-8 text-gray-500">All products loaded.</p>
      )}
    </div>
  );
}
