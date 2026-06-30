'use client';
import { useState } from 'react';
import Button from '@/components/ui/button';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ThinkTankPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const runImprovement = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await adminFetch('/api/admin/auto-improve', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        toast.success('AI Think Tank completed!');
      } else {
        toast.error(data.error || 'Failed');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">AI Think Tank</h1>
        <Button onClick={runImprovement} disabled={loading}>
          {loading ? 'Thinking...' : 'Start Auto-Improvement'}
        </Button>
      </div>

      {result && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>🔍 Analysis</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(result.analysis, null, 2)}</pre>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>⚡ Planned Actions</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1">{result.actions?.map((a, i) => (
                <div key={i} className="p-2 glass-card text-sm">{a.type}: {a.target || a.key || ''}</div>
              ))}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>✅ Execution Results</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1">{result.results?.map((r, i) => (
                <div key={i} className="p-2 glass-card text-sm">Executed: {r.action.type}</div>
              ))}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>📝 Report</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm">{result.report}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
