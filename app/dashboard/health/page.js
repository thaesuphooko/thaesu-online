'use client';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/adminFetch';
export default function HealthPage() {
  const { data: stats } = useQuery({
    queryKey: ['systemStats'],
    queryFn: () => adminFetch('/api/admin/system-stats').then(r => r.json()),
    refetchInterval: 5000,
  });
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">System Health</h1>
      {stats ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card p-4">CPU: {stats.cpu}%</div>
          <div className="glass-card p-4">RAM: {stats.ram.percent}%</div>
          <div className="glass-card p-4">Disk: {stats.disk.percent}%</div>
        </div>
      ) : <p>Loading...</p>}
    </div>
  );
}
