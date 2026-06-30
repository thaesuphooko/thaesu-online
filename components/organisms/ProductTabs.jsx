'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductReviews from '@/components/organisms/ProductReviews';

export default function ProductTabs({ product }) {
  const [tab, setTab] = useState('overview');
  const [expanded, setExpanded] = useState(false);
  const tabs = ['overview', 'description', 'reviews'];

  return (
    <div className="mt-4">
      {/* Sticky Tab Headers */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-border px-4">
        <div className="flex gap-0">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition relative ${
                tab === t ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
              {tab === t && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content with Animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="px-4 py-4"
        >
          {tab === 'overview' && (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed">{product.description?.slice(0, 200) || 'No overview yet.'}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800"><span className="text-muted-foreground">Category</span><p className="font-medium">{product.category || 'General'}</p></div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800"><span className="text-muted-foreground">Stock</span><p className={`font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>{product.stock > 0 ? 'In Stock' : 'Out of Stock'}</p></div>
              </div>
            </div>
          )}
          {tab === 'description' && (
            <div className="relative">
              <div className={`text-sm leading-relaxed overflow-hidden ${!expanded && 'max-h-48'}`}>
                <p>{product.description || 'No description available.'}</p>
              </div>
              {!expanded && product.description?.length > 300 && (
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-gray-900 to-transparent flex items-end justify-center pb-2">
                  <button onClick={() => setExpanded(true)} className="text-primary text-sm font-medium underline">See More ▾</button>
                </div>
              )}
            </div>
          )}
          {tab === 'reviews' && <ProductReviews productId={product.id} />}
        </motion.div>
      </AnimatePresence>

      {/* Recommendations at the bottom */}
      <div className="mt-6">
        <Recommendations productId={product.id} />
      </div>

      {/* Sticky Bottom Bar with Mini Checkout */}
      <StickyBottomBar product={product} />
    </div>
  );
}
