'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import ProductCard from '@/components/organisms/ProductCard';

export default function ProductCatalog() {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const observerRef = useRef(null);
  const limit = 12;

  const fetchProducts = useCallback(async (pageNum, filters) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL('/api/products', window.location.origin);
      url.searchParams.set('page', pageNum);
      url.searchParams.set('limit', limit);
      if (filters.search) url.searchParams.set('search', filters.search);
      if (filters.category) url.searchParams.set('category', filters.category);
      if (filters.minPrice) url.searchParams.set('minPrice', filters.minPrice);
      if (filters.maxPrice) url.searchParams.set('maxPrice', filters.maxPrice);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (pageNum === 1) setProducts(json.data);
      else setProducts(prev => [...prev, ...json.data]);
      setHasMore(json.pagination.page < json.pagination.totalPages);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    setProducts([]);
    fetchProducts(1, { search, category, minPrice, maxPrice });
  }, [search, category, minPrice, maxPrice, fetchProducts]);

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

  useEffect(() => {
    if (page > 1) fetchProducts(page, { search, category, minPrice, maxPrice });
  }, [page, search, category, minPrice, maxPrice, fetchProducts]);

  const clearFilters = () => {
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSearch('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Product Catalog</h1>

      <div className="flex flex-wrap gap-4 mb-8">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="p-2 border rounded w-48"
        />
        <select value={category} onChange={e => setCategory(e.target.value)} className="p-2 border rounded">
          <option value="">All Categories</option>
          {['Electronics', 'Fashion', 'Home & Living', 'Books', 'Sports'].map(c => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          type="number"
          value={minPrice}
          onChange={e => setMinPrice(e.target.value)}
          placeholder="Min price"
          className="p-2 border rounded w-32"
        />
        <input
          type="number"
          value={maxPrice}
          onChange={e => setMaxPrice(e.target.value)}
          placeholder="Max price"
          className="p-2 border rounded w-32"
        />
        <button onClick={clearFilters} className="px-3 py-1 bg-gray-200 rounded">
          Clear
        </button>
      </div>

      {error && (
        <div className="text-center py-4 mb-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">Error loading products: {error}</p>
          <button
            onClick={() => fetchProducts(1, { search, category, minPrice, maxPrice })}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product, index) => {
          const isLast = index === products.length - 1;
          return (
            <div ref={isLast ? lastProductRef : null} key={product.id}>
              <ProductCard product={product} />
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto" />
        </div>
      )}
      {!hasMore && products.length > 0 && (
        <p className="text-center py-8 text-gray-500">All products loaded.</p>
      )}
      {!loading && products.length === 0 && !error && (
        <p className="text-center py-8 text-gray-500">No products found.</p>
      )}
    </div>
  );
}
