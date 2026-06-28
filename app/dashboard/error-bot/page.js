'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/adminFetch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ErrorBotPage() {
  const queryClient = useQueryClient();
  const { data: errors, isLoading } = useQuery({
    queryKey: ['errorLogs'],
    queryFn: () => adminFetch('/api/admin/error-logs').then(r => r.json()),
    refetchInterval: 30000,
  });

  const runBotNow = async () => {
    await adminFetch('/api/admin/run-auto-heal');
    toast.success('Auto‑Heal executed');
    queryClient.invalidateQueries({ queryKey: ['errorLogs'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Error Bot</h1>
        <Button onClick={runBotNow}>Run Auto‑Heal Now</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Error Logs</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p>Loading...</p> : (
            <div className="space-y-2">
              {errors?.map((e, i) => (
                <div key={i} className="p-2 glass-card flex justify-between text-sm">
                  <div>
                    <span className="font-bold">{e.error_code}</span> - {e.error_message.slice(0,60)}
                    <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
                  </div>
                  <span className="text-xs">{e.action_taken || 'Pending'}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
