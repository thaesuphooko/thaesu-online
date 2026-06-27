'use client';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/adminFetch';

async function fetchLogs() {
  const res = await adminFetch('/api/admin/activity');
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export default function ActivityPage() {
  const { data: logs, isLoading } = useQuery({ queryKey: ['activityLogs'], queryFn: fetchLogs, staleTime: 10000 });

  if (isLoading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Activity Logs</h1>
      <div className="space-y-2">
        {logs?.map((log, i) => (
          <div key={i} className="glass-card p-3 flex gap-4 text-sm">
            <span className="text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
            <span>{log.action}</span>
            <span className="text-muted-foreground">{log.ip_address}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
