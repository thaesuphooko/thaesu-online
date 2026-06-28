'use client';
import { useQuery } from '@tanstack/react-query'; import { adminFetch } from '@/lib/adminFetch';
export default function AdvancedAnalyticsPage() {
  const { data } = useQuery({ queryKey: ['advancedAnalytics'], queryFn: () => adminFetch('/api/admin/analytics/advanced').then(r => r.json()) });
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Advanced Analytics</h1>
      {data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card p-4"><h2 className="font-semibold mb-2">Top CLV Customers</h2>{data.clv?.map((c,i)=><div key={i} className="flex justify-between"><span>{c.email}</span><span>{parseFloat(c.lifetime_value).toLocaleString()} Ks</span></div>)}</div>
          <div className="glass-card p-4"><h2 className="font-semibold mb-2">Churn Risk</h2><p className="text-2xl font-bold">{data.churn} users inactive</p></div>
        </div>
      ) : <p>Loading...</p>}
    </div>
  );
}
