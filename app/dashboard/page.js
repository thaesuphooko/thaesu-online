'use client';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/adminFetch';
export default function DashboardHome() {
  const { data } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => adminFetch('/api/admin/sales').then(r => r.json()),
    staleTime: 30000,
  });
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      {data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">Orders: {data.totalOrders}</div>
          <div className="glass-card p-4">Revenue: {data.totalRevenue?.toLocaleString()} Ks</div>
          <div className="glass-card p-4">Low Stock: {data.lowStock?.length}</div>
          <div className="glass-card p-4">Pending: {data.pendingPayouts?.toLocaleString()} Ks</div>
        </div>
      ) : <p>Loading...</p>}
    </div>
  );
}
