'use client';
import { memo, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, ShoppingCart, Sparkles } from 'lucide-react';
import ReactPlayer from 'react-player';

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22600%22%3E%3Crect fill=%22%23f3f4f6%22 width=%22400%22 height=%22600%22/%3E%3Ctext fill=%22%239ca3af%22 font-family=%22sans-serif%22 font-size=%2224%22 dy=%2210.5%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22%3ENo Image%3C/text%3E%3C/svg%3E';

const ProductCard = memo(({ product }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isMobileModal, setIsMobileModal] = useState(false);
  const [imgSrc, setImgSrc] = useState(product.media?.[0]?.url || PLACEHOLDER);
  const cardRef = useRef(null);
  const hasVideo = product.media?.some(m => m.video_url) || product.video_url;
  const videoUrl = product.video_url || product.media?.find(m => m.video_url)?.video_url;
  const discount = product.compare_at_price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : null;
  const isOutOfStock = product.stock <= 0;

  // Intersection Observer for lazy video loading
  useEffect(() => {
    if (!videoUrl || !cardRef.current) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setIsHovering(false); // Will preload when hovered
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [videoUrl]);

  const handleMobileClick = (e) => {
    if (hasVideo && window.innerWidth < 768) {
      e.preventDefault();
      setIsMobileModal(true);
    }
  };

  return (
    <>
      <div
        ref={cardRef}
        className="group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
        onMouseEnter={() => { if (hasVideo && window.innerWidth >= 768) setIsHovering(true); }}
        onMouseLeave={() => { if (hasVideo && window.innerWidth >= 768) setIsHovering(false); }}
      >
        <Link href={`/products/${product.slug}`} className="block" onClick={handleMobileClick}>
          {/* Image/Video Container – 3:4 Aspect Ratio */}
          <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 dark:bg-gray-700">
            {/* Normal Image */}
            <Image
              src={imgSrc}
              alt={product.title}
              fill
              className={`object-cover transition-opacity duration-500 ${isHovering ? 'opacity-0' : 'opacity-100'}`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              onError={() => setImgSrc(PLACEHOLDER)}
            />

            {/* Video on Hover (Desktop) */}
            {hasVideo && isHovering && (
              <div className="absolute inset-0">
                <ReactPlayer
                  url={videoUrl}
                  playing={isHovering}
                  muted
                  loop
                  width="100%"
                  height="100%"
                  style={{ objectFit: 'cover' }}
                  playsinline
                />
              </div>
            )}

            {/* Video Play Icon (Mobile) */}
            {hasVideo && !isHovering && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <Play className="w-6 h-6 text-gray-800 ml-0.5" />
                </div>
              </div>
            )}

            {/* Gradient Overlay for Text */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />

            {/* Discount Badge */}
            {discount && discount > 0 && (
              <span className="absolute top-3 left-3 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
                -{discount}%
              </span>
            )}

            {/* Flash Sale Badge */}
            {product.flash_sale_end && (
              <span className="absolute top-3 right-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Flash
              </span>
            )}

            {/* Out of Stock Overlay */}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm flex items-center justify-center">
                <span className="text-sm font-bold text-gray-600 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 px-4 py-2 rounded-full">
                  Out of Stock
                </span>
              </div>
            )}

            {/* Quick Add to Cart (Desktop Hover) */}
            {!isOutOfStock && (
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    // Add to cart logic
                  }}
                  className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <ShoppingCart className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="p-2.5 space-y-1">
            <h3 className="text-[11px] font-medium text-gray-800 dark:text-gray-100 line-clamp-2 leading-4">
              {product.title}
            </h3>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-rose-500">
                {parseFloat(product.price).toLocaleString()} Ks
              </span>
              {product.compare_at_price && (
                <span className="text-[10px] text-gray-400 line-through">
                  {parseFloat(product.compare_at_price).toLocaleString()} Ks
                </span>
              )}
            </div>
          </div>
        </Link>
      </div>

      {/* Mobile Video Modal */}
      {isMobileModal && videoUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={() => setIsMobileModal(false)}>
          <button className="absolute top-4 right-4 text-white text-2xl z-10">×</button>
          <div className="flex-1 flex items-center justify-center p-4">
            <ReactPlayer
              url={videoUrl}
              playing
              controls
              width="100%"
              height="auto"
              style={{ maxHeight: '80vh' }}
              playsinline
            />
          </div>
          <div className="p-4 bg-black/50 backdrop-blur-md">
            <h2 className="text-white font-semibold">{product.title}</h2>
            <p className="text-rose-400 font-bold text-lg">{parseFloat(product.price).toLocaleString()} Ks</p>
            <button
              className="mt-2 w-full py-3 bg-rose-500 text-white rounded-xl font-bold"
              onClick={(e) => { e.stopPropagation(); /* add to cart */ }}
            >
              Add to Cart
            </button>
          </div>
        </div>
      )}
    </>
  );
});

ProductCard.displayName = 'ProductCard';
export default ProductCard;
