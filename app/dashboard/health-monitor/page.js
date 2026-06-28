'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/adminFetch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useState } from 'react';

export default function HealthMonitorPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['healthMonitor'],
    queryFn: () => adminFetch('/api/admin/health-monitor').then(r => r.json()),
    refetchInterval: 30000,
  });

  const [enabled, setEnabled] = useState(true); // toggle UI only

  if (isLoading) return <div className="text-center py-8">Loading health monitor...</div>;
  if (isError) return <div className="text-center py-8 text-red-500">Failed to load health data.</div>;

  const runManualCheck = async () => {
    await adminFetch('/api/admin/run-health-check');
    toast.success('Manual check triggered');
    queryClient.invalidateQueries({ queryKey: ['healthMonitor'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">System Health Monitor</h1>
        <div className="flex gap-2">
          <Button onClick={runManualCheck} variant="outline">Run Now</Button>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={enabled} onChange={() => setEnabled(!enabled)} />
            <span className="text-sm">Enable Monitoring</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle>✅ OK</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-green-600">{data?.ok || 0}</CardContent></Card>
        <Card><CardHeader><CardTitle>⚠️ Warn</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-yellow-600">{data?.warn || 0}</CardContent></Card>
        <Card><CardHeader><CardTitle>❌ Error</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-red-600">{data?.error || 0}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Component Details</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data?.components?.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-2 glass-card">
                <div className="flex items-center gap-2">
                  <span className={`text-lg ${c.status === 'OK' ? 'text-green-500' : c.status === 'WARN' ? 'text-yellow-500' : 'text-red-500'}`}>
                    {c.status === 'OK' ? '✅' : c.status === 'WARN' ? '⚠️' : '❌'}
                  </span>
                  <span className="font-medium">{c.component}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {c.message} {c.response_time_ms > 0 && `(${c.response_time_ms}ms)`}
                </div>
                <div className="text-xs text-muted-foreground">{new Date(c.checked_at).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
