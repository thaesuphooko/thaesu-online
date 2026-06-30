'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/adminFetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import Chart from 'react-apexcharts';
import { Trash2, TrendingUp, RotateCcw, Zap } from 'lucide-react';

// Audio SFX
function playSound(type) {
  try {
    const audio = new Audio(`/audio/${type}.mp3`); // we'll create silent placeholders
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch {}
}

export default function CatalogSanitizerPage() {
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [report, setReport] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const pollRef = useRef(null);

  const startScan = async () => {
    setScanning(true);
    playSound('click');
    const res = await adminFetch('/api/admin/catalog-sanitizer', {
      method: 'POST',
      body: JSON.stringify({ action: 'start' }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      toast.success('Scan started');
      // Poll progress
      pollRef.current = setInterval(async () => {
        const statusRes = await adminFetch('/api/admin/catalog-sanitizer');
        if (statusRes.ok) {
          const status = await statusRes.json();
          setProgress(status.progress || 0);
          setCurrent(status.current || 0);
          setTotal(status.total || 0);
          if (!status.running) {
            clearInterval(pollRef.current);
            setScanning(false);
            // Fetch final report
            fetchReport();
            playSound('success');
          }
        }
      }, 500);
    } else {
      setScanning(false);
      toast.error('Failed to start scan');
    }
  };

  const fetchReport = async () => {
    const res = await adminFetch('/api/admin/catalog-sanitizer/report');
    if (res.ok) setReport(await res.json());
  };

  const rollback = async () => {
    await adminFetch('/api/admin/catalog-sanitizer', {
      method: 'POST',
      body: JSON.stringify({ action: 'rollback' }),
      headers: { 'Content-Type': 'application/json' },
    });
    toast.success('Rollback complete');
    setReport(null);
  };

  // Live graph data
  const graphData = useQuery({
    queryKey: ['sanitizerProgress'],
    queryFn: () => adminFetch('/api/admin/catalog-sanitizer').then(r => r.json()),
    refetchInterval: scanning ? 500 : false,
  });

  const livePoints = Array.from({ length: 20 }, (_, i) => graphData.data?.current || 0);

  return (
    <div className="max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">AI Catalog Sanitizer</h1>

      {/* Control Button */}
      <Card className="glass-card mb-8">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" /> AI-Powered Cleanup</h2>
            <p className="text-sm text-muted-foreground">Remove broken products and optimize pricing automatically</p>
          </div>
          <Button onClick={startScan} disabled={scanning} size="lg" className="gap-2">
            {scanning ? 'Scanning...' : 'Start AI Sanitize & Optimize'}
          </Button>
        </CardContent>
      </Card>

      {/* Matrix Scan Overlay */}
      <AnimatePresence>
        {scanning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center text-white">
            <motion.div
              className="w-full h-1 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600"
              animate={{ y: [0, window.innerHeight, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
            <div className="mt-8 text-center space-y-4">
              <motion.div
                className="text-5xl font-mono font-bold"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                {current.toLocaleString()} / {total.toLocaleString()}
              </motion.div>
              <p className="text-lg text-gray-300">Products scanned...</p>
              <div className="w-80 h-3 bg-gray-700 rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-green-400 to-blue-500" style={{ width: `${progress}%` }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
              </div>
              {/* Live graph */}
              <div className="w-80 h-40">
                <Chart
                  options={{ chart: { type: 'line', toolbar: { show: false }, sparkline: { enabled: true } }, stroke: { curve: 'smooth', width: 2 }, colors: ['#22d3ee'] }}
                  series={[{ name: 'Activity', data: livePoints }]} type="line" height={160}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report */}
      {report && (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">📊 Overview</TabsTrigger>
              <TabsTrigger value="purged">🗑️ Purged ({report.purged?.length || 0})</TabsTrigger>
              <TabsTrigger value="adjusted">✏️ Adjusted ({report.adjusted?.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card className="glass-card">
                <CardContent className="p-6 grid grid-cols-3 gap-4">
                  <div className="text-center"><div className="text-3xl font-bold">{report.total}</div><div className="text-sm text-muted-foreground">Scanned</div></div>
                  <div className="text-center"><div className="text-3xl font-bold text-red-500">{report.purged?.length || 0}</div><div className="text-sm text-muted-foreground">Purged</div></div>
                  <div className="text-center"><div className="text-3xl font-bold text-green-500">{report.adjusted?.length || 0}</div><div className="text-sm text-muted-foreground">Adjusted</div></div>
                </CardContent>
              </Card>
              <Button onClick={rollback} variant="destructive" className="mt-4 gap-2"><RotateCcw className="w-4 h-4" /> Rollback All Changes</Button>
            </TabsContent>

            <TabsContent value="purged">
              <Card className="glass-card max-h-96 overflow-y-auto">
                <CardContent className="p-4">
                  {report.purged?.map(p => (
                    <div key={p.id} className="flex justify-between py-2 border-b border-border">
                      <span>{p.title}</span><span className="text-red-500">{p.reason}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="adjusted">
              <Card className="glass-card max-h-96 overflow-y-auto">
                <CardContent className="p-4">
                  {report.adjusted?.map(a => (
                    <div key={a.id} className="flex justify-between py-2 border-b border-border">
                      <span>{a.title}</span>
                      <span>{parseFloat(a.oldPrice).toLocaleString()} Ks → <b className="text-green-500">{parseFloat(a.newPrice).toLocaleString()} Ks</b></span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      )}
    </div>
  );
}
