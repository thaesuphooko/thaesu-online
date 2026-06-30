'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/adminFetch';
import Button from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { ChevronDown, ChevronRight, Sparkles, Zap, Database, AlertTriangle } from 'lucide-react';

const LEVEL_COLORS = {
  CRITICAL: 'border-red-500 bg-red-50 dark:bg-red-900/20',
  WARNING: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
  API: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
  DATABASE: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
};

const LEVEL_ICONS = {
  CRITICAL: AlertTriangle,
  WARNING: AlertTriangle,
  API: Sparkles,
  DATABASE: Database,
};

export default function ErrorBotPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const logEndRef = useRef(null);

  const { data: errors, isLoading, refetch } = useQuery({
    queryKey: ['errorLogs', filter],
    queryFn: () => adminFetch(`/api/admin/error-logs?filter=${filter}&limit=100`).then(r => r.json()),
    refetchInterval: 10000,
  });

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [errors]);

  const runAutoHeal = async () => {
    await adminFetch('/api/admin/run-auto-heal');
    toast.success('Auto-Heal executed');
    refetch();
  };

  const healSingle = async (errorId) => {
    const res = await adminFetch('/api/admin/error-logs', {
      method: 'PATCH',
      body: JSON.stringify({ errorId, action: 'heal' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json().catch(() => ({}));
    toast.success(data.message || 'Healed');
    refetch();
  };

  const backupDB = async () => {
    await adminFetch('/api/admin/db-backup');
    toast.success('Database backup created');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">24/7 Error Guardian</h1>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Levels" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="CRITICAL">CRITICAL</SelectItem>
              <SelectItem value="WARNING">WARNING</SelectItem>
              <SelectItem value="DATABASE">DATABASE</SelectItem>
              <SelectItem value="API">API</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={runAutoHeal} className="gap-2">
            <Zap className="w-4 h-4" /> Run Auto‑Heal Now
          </Button>
          <Button variant="outline" onClick={backupDB} className="gap-2">
            <Database className="w-4 h-4" /> Backup DB
          </Button>
        </div>
      </div>

      {isLoading ? <div className="text-center py-8">Loading errors...</div> : (
        <div className="space-y-3">
          {errors?.map(err => {
            const isExpanded = expandedId === err.id;
            const diagnosis = err.diagnosis ? JSON.parse(err.diagnosis) : null;
            return (
              <Card key={err.id} className={`border-l-4 ${LEVEL_COLORS[err.error_code] || 'border-gray-300'}`}>
                <CardHeader className="p-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : err.id)}>
                  <div className="flex items-center gap-2">
                    {React.createElement(LEVEL_ICONS[err.error_code] || AlertTriangle, { className: 'w-4 h-4' })}
                    <span className="text-xs font-bold uppercase">{err.error_code}</span>
                    <span className="text-xs text-muted-foreground">{new Date(err.created_at).toLocaleString()}</span>
                    <span className="flex-1 text-sm truncate">{err.error_message?.slice(0, 80)}</span>
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 space-y-3">
                    <p className="text-xs text-muted-foreground">Module: {err.module || 'Unknown'}</p>

                    {diagnosis && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-2 rounded bg-gray-100 dark:bg-gray-800">
                          <p className="text-xs font-semibold">🔍 Why</p>
                          <p className="text-xs">{diagnosis.why}</p>
                        </div>
                        <div className="p-2 rounded bg-gray-100 dark:bg-gray-800">
                          <p className="text-xs font-semibold">💡 Solution</p>
                          <p className="text-xs">{diagnosis.solution}</p>
                        </div>
                        {diagnosis.codeSnippet && (
                          <div className="col-span-full">
                            <p className="text-xs font-semibold mb-1">🛠️ Code Fix</p>
                            <SyntaxHighlighter language="javascript" style={atomOneDark} className="text-xs rounded">
                              {diagnosis.codeSnippet}
                            </SyntaxHighlighter>
                          </div>
                        )}
                        {diagnosis.impact && (
                          <div className="col-span-full p-2 rounded bg-yellow-50 dark:bg-yellow-900/20">
                            <p className="text-xs font-semibold">⚠️ Impact</p>
                            <p className="text-xs">{diagnosis.impact}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {err.stack && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground">Stack Trace</summary>
                        <pre className="mt-1 p-2 bg-gray-900 text-green-400 rounded overflow-x-auto">{err.stack}</pre>
                      </details>
                    )}

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => healSingle(err.id)}>Heal This</Button>
                      {err.action_taken && <span className="text-xs text-green-600 self-center">Action: {err.action_taken}</span>}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
          {errors?.length === 0 && <p className="text-center py-8 text-muted-foreground">No errors found — site is healthy! 🎉</p>}
          <div ref={logEndRef} />
        </div>
      )}
    </div>
  );
}
