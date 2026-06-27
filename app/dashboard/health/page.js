'use client';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/adminFetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Chart from 'react-apexcharts';

async function fetchHealth() {
  const res = await adminFetch('/api/admin/system-health');
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export default function HealthPage() {
  const { data } = useQuery({ queryKey: ['health'], queryFn: fetchHealth, staleTime: 10000 });

  if (!data) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">System Health</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle>Total Products</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{data.totalProducts}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Last Sync</CardTitle></CardHeader><CardContent><div className="text-sm">{data.lastSyncTime ? new Date(data.lastSyncTime).toLocaleString() : 'Never'}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Crawl Jobs</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{data.jobs.length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Crawl Jobs Status</CardTitle></CardHeader>
        <CardContent>
          {data.jobs.map(job => (
            <div key={job.id} className="flex justify-between py-2 border-b last:border-0">
              <div>
                <p className="font-semibold">{job.name || job.domain}</p>
                <p className="text-sm text-muted-foreground">{job.start_url}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                job.status === 'running' ? 'bg-green-100 text-green-800' : job.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}>{job.status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
