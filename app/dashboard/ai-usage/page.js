'use client';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/adminFetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AIUsagePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['aiUsage'],
    queryFn: () => adminFetch('/api/admin/ai-usage').then(r => r.json()),
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="text-center py-8">Loading...</div>;
  if (isError) return <div className="text-center py-8 text-red-500">Something went wrong. Try again.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">AI Usage & Cost Tracker</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle>Total Requests</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.total_requests || 0}</CardContent></Card>
        <Card><CardHeader><CardTitle>Total Tokens</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.total_tokens?.toLocaleString() || 0}</CardContent></Card>
        <Card><CardHeader><CardTitle>Est. Cost (USD)</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-green-600">${(data?.total_cost || 0).toFixed(6)}</CardContent></Card>
      </div>
    </div>
  );
}
