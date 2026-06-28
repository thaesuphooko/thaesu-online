'use client';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/adminFetch';
export default function SystemLogsPage() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['systemLogs'],
    queryFn: () => adminFetch('/api/admin/system-logs').then(r => r.json()),
    staleTime: 10000,
  });
  if (isLoading) return <div>Loading...</div>;
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">System Logs</h1>
      <div className="space-y-1 text-sm">
        {logs?.map((l, i) => (
          <div key={i} className="flex gap-2"><span className="text-muted-foreground">{new Date(l.created_at).toLocaleTimeString()}</span><span className={l.level==='error'?'text-red-500':''}>{l.message}</span></div>
        ))}
      </div>
    </div>
  );
}
