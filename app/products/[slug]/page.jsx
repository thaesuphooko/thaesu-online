"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Heart, Share2, ShoppingCart, Star, ChevronLeft, ChevronRight, ShieldCheck, Truck, RotateCcw } from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const [reviews, setReviews] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    if (!slug) return;
    fetchProduct();
  }, [slug]);

  const fetchProduct = async () => {
    try {
      let prod = null;

      // 1. Fetch by exact slug
      let res = await fetch(`/api/products?slug=${encodeURIComponent(slug)}`);
      let data = await res.json();
      // API returns { data: [...] } sometimes, also may return { products: [...] }
      const products = data.products || data.data || [];
      if (products.length > 0) {
        // Find the product with exact slug match (in case multiple)
        prod = products.find(p => p.slug === slug) || products[0];
      }

      // 2. If not found, try extracting the last part as a potential ID
      if (!prod) {
        const parts = slug.split('-');
        const potentialId = parts[parts.length - 1];
        if (potentialId && potentialId.length > 4) {
          res = await fetch(`/api/products/${potentialId}`);
          if (res.ok) {
            data = await res.json();
            prod = data.product || data; // sometimes API returns { product: ... }
          }
        }
      }

      // 3. If still not found, search with full slug
      if (!prod) {
        res = await fetch(`/api/products?search=${encodeURIComponent(slug)}`);
        data = await res.json();
        const searchResults = data.products || data.data || [];
        if (searchResults.length > 0) {
          prod = searchResults[0];
        }
      }

      if (prod) {
        setProduct(prod);
        fetchReviews(prod.id);
        fetchRecommendations(prod.category, prod.id);
      } else {
        setProduct(null);
      }
    } catch (error) {
      console.error("Failed to load product:", error);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (productId) => {
    try {
      const res = await fetch(`/api/reviews?productId=${productId}`);
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (e) {}
  };

  const fetchRecommendations = async (category, currentId) => {
    try {
      const res = await fetch(`/api/products?category=${encodeURIComponent(category)}&limit=8`);
      const data = await res.json();
      const recs = data.products || data.data || [];
      setRecommendations(recs.filter(p => p.id !== currentId).slice(0, 6));
    } catch (e) {}
  };

  const images = product?.images || (product?.image_url ? [product.image_url] : product?.media?.map(m => m.url) || []);
  const mainImage = images[activeImage] || product?.image_url || (product?.media && product.media[0]?.url) || "/placeholder.jpg";
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : "0.0";

  const addToCart = () => {
    if (!product) return;
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        id: product.id,
        title: product.title || product.name,
        price: product.price,
        image: mainImage,
        quantity: quantity,
        slug: product.slug,
      });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    alert("Added to cart! 🛒");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Product Not Found</h1>
          <Link href="/products" className="text-purple-400 hover:underline">Back to Products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white">
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/" className="hover:text-purple-400 transition">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-purple-400 transition">Products</Link>
          <span>/</span>
          <span className="text-gray-200 truncate">{product.title || product.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="space-y-4">
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl group">
              <Image src={mainImage} alt={product.title || product.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" unoptimized />
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => setIsWishlisted(!isWishlisted)} className={`p-2 rounded-full backdrop-blur-xl border border-white/20 transition-all ${isWishlisted ? "bg-red-500/20 text-red-400" : "bg-black/30 text-white hover:bg-white/10"}`}>
                  <Heart className={`w-5 h-5 ${isWishlisted ? "fill-current" : ""}`} />
                </button>
                <button className="p-2 rounded-full backdrop-blur-xl border border-white/20 bg-black/30 text-white hover:bg-white/10 transition">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
              {images.length > 1 && (
                <>
                  <button onClick={() => setActiveImage(prev => prev === 0 ? images.length - 1 : prev - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={() => setActiveImage(prev => prev === images.length - 1 ? 0 : prev + 1)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
              {product.compare_at_price && product.compare_at_price > product.price && (
                <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  -{Math.round((1 - product.price / product.compare_at_price) * 100)}%
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, index) => (
                  <button key={index} onClick={() => setActiveImage(index)} className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${activeImage === index ? "border-purple-500 scale-105" : "border-white/10 hover:border-white/30"}`}>
                    <Image src={img} alt={`View ${index + 1}`} fill className="object-cover" unoptimized />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-purple-400">
              {product.category && <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">{product.category}</span>}
              {product.brand && <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">{product.brand}</span>}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              {product.title || product.name}
            </h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-5 h-5 ${i < Math.round(avgRating) ? "fill-current" : "text-gray-600"}`} />
                ))}
              </div>
              <span className="text-gray-400">{avgRating} ({reviews.length} reviews)</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  ${parseFloat(product.price).toFixed(2)}
                </span>
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <span className="text-xl text-gray-500 line-through">${parseFloat(product.compare_at_price).toFixed(2)}</span>
                )}
              </div>
              {product.stock > 0 ? (
                <p className="text-sm text-green-400">In Stock ({product.stock} available)</p>
              ) : (
                <p className="text-sm text-red-400">Out of Stock</p>
              )}
            </div>
            {(product.color || product.size) && (
              <div className="flex flex-wrap gap-4">
                {product.color && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Color</p>
                    <div className="flex gap-2">
                      {product.color.split(",").map((c, i) => (
                        <button key={i} className="w-8 h-8 rounded-full border-2 border-white/20 hover:border-purple-500 transition" style={{ backgroundColor: c.trim() }} />
                      ))}
                    </div>
                  </div>
                )}
                {product.size && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Size</p>
                    <div className="flex gap-2">
                      {product.size.split(",").map((s, i) => (
                        <button key={i} className="px-3 py-1 rounded-lg border border-white/20 text-sm hover:border-purple-500 hover:bg-purple-500/10 transition">{s.trim()}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center border border-white/20 rounded-xl overflow-hidden">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 transition">-</button>
                <span className="w-12 text-center font-bold">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 transition">+</button>
              </div>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={addToCart} disabled={!product.stock}
                className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </motion.button>
            </div>
            <div className="grid grid-cols-3 gap-3 p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
              <div className="flex items-center gap-2 text-xs text-gray-300"><ShieldCheck className="w-4 h-4 text-green-400" /> Secure Payment</div>
              <div className="flex items-center gap-2 text-xs text-gray-300"><Truck className="w-4 h-4 text-blue-400" /> Fast Delivery</div>
              <div className="flex items-center gap-2 text-xs text-gray-300"><RotateCcw className="w-4 h-4 text-orange-400" /> Easy Returns</div>
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="mt-12">
          <div className="flex gap-4 border-b border-white/10 pb-2">
            {["description", "reviews"].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${activeTab === tab ? "bg-white/5 text-purple-400 border-b-2 border-purple-500" : "text-gray-400 hover:text-white"}`}>
                {tab === "description" ? "📝 Description" : `⭐ Reviews (${reviews.length})`}
              </button>
            ))}
          </div>
          <div className="py-6">
            {activeTab === "description" ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prose prose-invert max-w-none text-gray-300 leading-relaxed">
                <p>{product.description || "No description available."}</p>
                {product.attributes && (
                  <div className="mt-6">
                    <h3 className="text-lg font-bold text-white mb-3">Specifications</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(product.attributes).map(([key, value]) => (
                        <div key={key} className="flex justify-between p-3 bg-white/5 rounded-lg">
                          <span className="text-gray-400 capitalize">{key.replace(/_/g, " ")}</span>
                          <span className="text-white font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {reviews.length === 0 ? (
                  <p className="text-gray-500">No reviews yet. Be the first to review!</p>
                ) : (
                  reviews.map((review, i) => (
                    <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold">
                          {(review.user_name || "A")[0]}
                        </div>
                        <div>
                          <p className="font-medium text-white">{review.user_name || "Anonymous"}</p>
                          <div className="flex text-amber-400 text-sm">
                            {[...Array(5)].map((_, j) => (
                              <Star key={j} className={`w-3 h-3 ${j < (review.rating || 0) ? "fill-current" : ""}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm">{review.comment || review.review}</p>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </div>
        </motion.div>

        {recommendations.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }} className="mt-12">
            <h2 className="text-2xl font-bold mb-6">✨ You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {recommendations.map((rec) => (
                <Link key={rec.id} href={`/products/${rec.slug || rec.id}`} className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all hover:scale-105">
                  <div className="relative aspect-square bg-white/5">
                    <Image src={rec.image_url || (rec.media && rec.media[0]?.url) || "/placeholder.jpg"} alt={rec.title || rec.name} fill className="object-cover" unoptimized />
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-white truncate">{rec.title || rec.name}</h3>
                    <p className="text-purple-400 font-bold mt-1">${parseFloat(rec.price).toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
