import { Suspense } from 'react';
import ProductDetailContent from './ProductDetailContent';

export default function ProductDetailPage({ params }) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductDetailContent params={params} />
    </Suspense>
  );
}

function ProductSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-4 py-8 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-40" />
        </div>
      </div>
    </div>
  );
}
