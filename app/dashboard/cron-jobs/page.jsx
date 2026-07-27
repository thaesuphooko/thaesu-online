'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2, RefreshCw, Play, FileText, Activity, CheckCircle2, XCircle,
  Clock, Download, Eye, Zap, AlertTriangle, Calendar, Timer, BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

export default function CronJobsDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, lastRun: null });
  const [confirmRun, setConfirmRun] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cron-reports');
      const data = await res.json();
      const list = data.reports || [];
      setReports(list);
      setStats({
        total: list.length,
        success: list.filter(r => r.success).length,
        failed: list.filter(r => !r.success).length,
        lastRun: list[0]?.timestamp || null,
      });
    } catch (e) {
      toast.error('Failed to load cron reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // Auto‑refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchReports, 30_000);
    return () => clearInterval(interval);
  }, [fetchReports]);

  const triggerCron = async (type) => {
    setRunning(type);
    const toastId = toast.loading(`Running ${type}…`);
    try {
      const res = await fetch(`/api/admin/run-cron?type=${type}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${type} completed successfully`, { id: toastId });
        setSelectedLog({ type, output: data.output, timestamp: new Date().toISOString() });
        fetchReports();
      } else {
        toast.error(data.error || `${type} failed`, { id: toastId });
      }
    } catch (e) {
      toast.error('Network error', { id: toastId });
    } finally {
      setRunning(null);
      setConfirmRun(null);
    }
  };

  const exportCSV = () => {
    const header = 'Type,Timestamp,Status,Filename';
    const rows = reports.map(r => `${r.type},${r.timestamp},${r.success ? 'Success' : 'Failed'},${r.filename}`);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cron-reports-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  // Skeleton loading
  if (loading && reports.length === 0) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <motion.h1 initial={{ x:-20 }} animate={{ x:0 }} className="text-3xl font-bold flex items-center gap-2">
          <Activity className="w-8 h-8 text-purple-400" /> Cron Jobs
        </motion.h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchReports}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> Export CSV</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: BarChart3, label: 'Total Runs', value: stats.total, color: 'text-blue-400', bg: 'from-blue-900/50 to-blue-800/50', border: 'border-blue-500/30' },
          { icon: CheckCircle2, label: 'Success', value: stats.success, color: 'text-green-400', bg: 'from-green-900/50 to-green-800/50', border: 'border-green-500/30' },
          { icon: XCircle, label: 'Failed', value: stats.failed, color: 'text-red-400', bg: 'from-red-900/50 to-red-800/50', border: 'border-red-500/30' },
          { icon: Clock, label: 'Last Run', value: stats.lastRun ? new Date(stats.lastRun).toLocaleTimeString() : 'N/A', color: 'text-amber-400', bg: 'from-amber-900/50 to-amber-800/50', border: 'border-amber-500/30' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.1 }}>
            <Card className={`bg-gradient-to-br ${stat.bg} ${stat.border} backdrop-blur-xl`}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <stat.icon className={`w-10 h-10 ${stat.color}`} />
                  <div>
                    <p className="text-sm text-zinc-400">{stat.label}</p>
                    <p className="text-3xl font-bold text-white">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { type: 'engage', label: 'Auto‑Engage', desc: 'Send reminders to inactive users.', icon: Zap, color: 'text-blue-400', gradient: 'from-blue-600/20 to-purple-600/20' },
          { type: 'order', label: 'Order Cleanup', desc: 'Cancel expired pending orders.', icon: Timer, color: 'text-amber-400', gradient: 'from-amber-600/20 to-orange-600/20' },
        ].map((action, i) => (
          <motion.div key={action.type} initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} transition={{ delay: i*0.15 }}>
            <Card className={`border-white/10 bg-gradient-to-br ${action.gradient} backdrop-blur-xl hover:border-purple-500/50 transition-all duration-300`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <action.icon className={`w-5 h-5 ${action.color}`} />
                  {action.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-400 mb-4">{action.desc}</p>
                <Button
                  disabled={running === action.type}
                  onClick={() => setConfirmRun(action.type)}
                  className="gap-2"
                >
                  {running === action.type ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Run Now
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Reports List */}
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.3 }}>
        <Card className="border-white/10 bg-black/20 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-purple-400" /> Recent Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-500">No reports yet. Run a cron job to generate reports.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {reports.map((r, i) => (
                    <motion.div
                      key={r.filename}
                      layout
                      initial={{ opacity:0, x:-20 }}
                      animate={{ opacity:1, x:0 }}
                      exit={{ opacity:0, x:20 }}
                      transition={{ delay: i*0.05 }}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        {r.success ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                        <div>
                          <p className="font-medium text-white">{r.type === 'engage' ? 'Auto‑Engage' : 'Order Cleanup'}</p>
                          <p className="text-xs text-zinc-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(r.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={r.success ? 'default' : 'destructive'} className="text-xs">
                          {r.success ? 'Success' : 'Failed'}
                        </Badge>
                        <a
                          href={`/cron-reports/${r.filename}`}
                          target="_blank"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Button variant="ghost" size="icon" title="View Report">
                            <Eye className="w-4 h-4 text-blue-400" />
                          </Button>
                        </a>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmRun} onOpenChange={() => setConfirmRun(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Confirm Run</DialogTitle></DialogHeader>
          <p className="text-zinc-400">Are you sure you want to run <strong>{confirmRun === 'engage' ? 'Auto‑Engage' : 'Order Cleanup'}</strong> now?</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmRun(null)}>Cancel</Button>
            <Button onClick={() => triggerCron(confirmRun)}>Run Now</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Viewer Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Run Output – {selectedLog?.type}</DialogTitle></DialogHeader>
          <pre className="bg-black/50 p-4 rounded-xl text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
            {selectedLog?.output || 'No output'}
          </pre>
          <p className="text-xs text-zinc-500 mt-2">{new Date(selectedLog?.timestamp).toLocaleString()}</p>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
