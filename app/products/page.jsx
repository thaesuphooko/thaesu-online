"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/products?search=${encodeURIComponent(search)}&page=${page}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        const list = data.products || data.data || [];
        setProducts(Array.isArray(list) ? list : []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(err => {
        setError(err.message);
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [search, page]);

  // Generate visible page numbers
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-zinc-900 text-white p-4 pt-24 pb-32">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold">Products</h1>
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <p className="text-xl text-red-400">Something went wrong</p>
            <p className="text-sm text-gray-400 mt-2">HTTP {error}</p>
            <button onClick={() => { setSearch(''); setPage(1); }} className="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl transition">Try Again</button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 mb-4">
              <span className="text-3xl">🔍</span>
            </div>
            <p className="text-xl text-gray-400">No products found</p>
            {search && <p className="text-sm text-gray-500 mt-2">Try a different search term</p>}
          </div>
        ) : (
          <>
            <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {products.map(product => (
                <Link key={product.id} href={`/products/${product.slug || product.id}`}
                  className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/50 hover:bg-white/10 transition-all hover:scale-[1.02]">
                  <div className="aspect-square bg-white/5 flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <span className="text-4xl text-white/20 group-hover:scale-110 transition-transform">📦</span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-white truncate">{product.title}</h3>
                    <p className="text-purple-400 font-bold mt-1">${parseFloat(product.price).toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </motion.div>

            {/* Premium Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-10">
                <nav className="flex items-center gap-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-2 py-2">
                  {/* First page */}
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="First page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  {/* Previous page */}
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Page numbers */}
                  {getPageNumbers().map(num => (
                    <button
                      key={num}
                      onClick={() => setPage(num)}
                      className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium transition ${
                        num === page
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                          : 'text-white/60 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {num}
                    </button>
                  ))}

                  {/* Next page */}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Last page */}
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Last page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
