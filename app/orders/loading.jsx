import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container max-w-4xl mx-auto py-10 px-4 space-y-4">
      <Skeleton className="h-10 w-48 mb-8" />
      {Array(3).fill(0).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}
