'use client';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/adminFetch';
export default function AdminProducts() {
  const { data: products } = useQuery({
    queryKey: ['adminProducts'],
    queryFn: () => adminFetch('/api/admin/products?limit=20').then(r => r.json()).then(d => d.data),
    staleTime: 10000,
  });
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Products</h1>
      <div className="space-y-2">
        {products?.map(p => (
          <div key={p.id} className="glass-card p-3">{p.title} – {p.price} Ks</div>
        ))}
      </div>
    </div>
  );
}
