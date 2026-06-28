'use client';
import { useQuery } from '@tanstack/react-query'; import { adminFetch } from '@/lib/adminFetch';
export default function SalesPage() {
  const { data, isLoading } = useQuery({ queryKey: ['adminSales'], queryFn: () => adminFetch('/api/admin/sales').then(r => r.json()) });
  if (isLoading) return <div className="text-center py-8">Loading sales data...</div>;
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Sales Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4"><p className="text-sm text-muted-foreground">Total Orders</p><p className="text-2xl font-bold">{data?.totalOrders}</p></div>
        <div className="glass-card p-4"><p className="text-sm text-muted-foreground">Total Revenue</p><p className="text-2xl font-bold">{data?.totalRevenue?.toLocaleString()} Ks</p></div>
        <div className="glass-card p-4"><p className="text-sm text-muted-foreground">Low Stock</p><p className="text-2xl font-bold">{data?.lowStock?.length}</p></div>
        <div className="glass-card p-4"><p className="text-sm text-muted-foreground">Pending Payouts</p><p className="text-2xl font-bold">{data?.pendingPayouts?.toLocaleString() || 0} Ks</p></div>
      </div>
    </div>
  );
}
