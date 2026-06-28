'use client';
import { useQuery } from '@tanstack/react-query'; import { adminFetch } from '@/lib/adminFetch';
export default function AnalyticsPage() {
  const { data } = useQuery({ queryKey: ['adminAnalytics'], queryFn: () => adminFetch('/api/admin/analytics').then(r => r.json()) });
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>
      {data ? <div className="grid grid-cols-2 gap-4"><div className="glass-card p-4">Total Users: {data.totalUsers}</div><div className="glass-card p-4">Total Products: {data.totalProducts}</div></div> : <p>Loading...</p>}
    </div>
  );
}
