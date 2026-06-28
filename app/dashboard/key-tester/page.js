'use client';
import { useQuery } from '@tanstack/react-query';
import { adminFetch } from '@/lib/adminFetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function KeyTesterPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['keyTester'],
    queryFn: () => adminFetch('/api/admin/key-tester').then(r => r.json()),
    refetchInterval: 0,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">API Key & Token Tester</h1>
      {isLoading ? (
        <p>Testing all keys...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Telegram Bot</CardTitle></CardHeader>
            <CardContent>
              <span className={data?.telegram === 'OK' ? 'text-green-500' : 'text-red-500'}>
                {data?.telegram || 'N/A'}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>DeepSeek AI</CardTitle></CardHeader>
            <CardContent>
              <span className={data?.deepseek === 'OK' ? 'text-green-500' : 'text-red-500'}>
                {data?.deepseek || 'N/A'}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Redis (Upstash)</CardTitle></CardHeader>
            <CardContent>
              <span className={data?.redis === 'OK' ? 'text-green-500' : 'text-red-500'}>
                {data?.redis || 'N/A'}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Database (Neon)</CardTitle></CardHeader>
            <CardContent>
              <span className={data?.database === 'OK' ? 'text-green-500' : 'text-red-500'}>
                {data?.database || 'N/A'}
              </span>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
