'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';
import { Play, Square, Terminal, Loader2, Globe, Package, Search, Zap, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

function LiveTerminal({ jobId, onClose }) {
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await adminFetch(`/api/admin/crawler/${jobId}?limit=200`);
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : (data.logs || []));
      }
    } catch (e) { console.error(e); }
  }, [jobId]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 1500);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl shadow-purple-500/20"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <div className="flex items-center gap-2 text-green-400">
            <Terminal className="w-5 h-5" />
            <h2 className="font-mono text-sm">Live Crawl Terminal</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs bg-black/30">
          {logs.length === 0 && <p className="text-gray-500 animate-pulse">Waiting for output...</p>}
          {logs.map((log, i) => (
            <div key={i} className={`flex gap-2 ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-green-400/80'}`}>
              <span className="text-gray-500 shrink-0 w-20">{new Date(log.created_at).toLocaleTimeString()}</span>
              <span className="break-all">{log.message}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </motion.div>
    </div>
  );
}

export default function CrawlDashboard() {
  const [jobs, setJobs] = useState([]);
  const [activeTab, setActiveTab] = useState('products');
  const [search, setSearch] = useState('');
  const [selectedLogsJob, setSelectedLogsJob] = useState(null);
  const [form, setForm] = useState({
    name: '',
    start_url: '',
    config: '{\n  "useSitemap": true,\n  "maxPages": 500,\n  "delay": { "min": 2000, "max": 5000 }\n}',
    type: 'products'
  });

  const fetchJobs = async () => {
    try {
      const res = await adminFetch(`/api/admin/crawler?type=${activeTab}`);
      if (res.ok) setJobs(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchJobs(); }, [activeTab]);
  useEffect(() => { setForm(prev => ({ ...prev, type: activeTab })); }, [activeTab]);

  const createJob = async () => {
    try {
      const config = JSON.parse(form.config);
      await adminFetch('/api/admin/crawler', {
        method: 'POST',
        body: JSON.stringify({ ...form, config }),
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success(`${activeTab} job created`);
      fetchJobs();
    } catch (e) { toast.error('Invalid JSON config'); }
  };

  const controlJob = async (jobId, action) => {
    await adminFetch(`/api/admin/crawler/${jobId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
      headers: { 'Content-Type': 'application/json' },
    });
    toast.success(`Job ${action}ed`);
    fetchJobs();
  };

  const deleteJob = async (jobId) => {
    if (!confirm('Delete this job?')) return;
    await adminFetch(`/api/admin/crawler/${jobId}`, { method: 'DELETE' });
    toast.success('Job deleted');
    fetchJobs();
  };

  const filteredJobs = jobs.filter(job =>
    job.name?.toLowerCase().includes(search.toLowerCase()) ||
    job.start_url?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
        God Crawler Engine
      </h1>

      {/* Tab Switcher */}
      <div className="flex gap-2 bg-black/20 backdrop-blur p-1 rounded-xl border border-white/10 w-fit">
        {['products', 'wattpad'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              activeTab === tab ? 'bg-purple-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {tab === 'wattpad' ? <Globe className="w-4 h-4 inline mr-1" /> : <Package className="w-4 h-4 inline mr-1" />}
            {tab}
          </button>
        ))}
      </div>

      {/* Create Job Form */}
      <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder={`Job Name (e.g., ${activeTab === 'wattpad' ? 'Myanmar Stories' : 'Shop Products'})`} />
          <Input value={form.start_url} onChange={e => setForm({...form, start_url: e.target.value})} placeholder={activeTab === 'wattpad' ? 'https://www.wattpad.com/stories/myanmar' : 'https://example.com/products'} required />
        </div>
        <textarea
          value={form.config}
          onChange={e => setForm({...form, config: e.target.value})}
          rows={4}
          className="w-full p-3 bg-black/20 border border-white/10 rounded-xl font-mono text-sm text-green-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          spellCheck="false"
        />
        <Button onClick={createJob} className="w-full bg-purple-600 hover:bg-purple-700">
          <Zap className="w-4 h-4 mr-1" /> Create {activeTab} Crawl Job
        </Button>
      </div>

      {/* Search and Jobs List */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs..." className="pl-10" />
        </div>
        <span className="text-sm text-zinc-400">{filteredJobs.length} jobs</span>
      </div>

      <div className="space-y-3">
        {filteredJobs.map(job => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-purple-500/30 transition-all"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-semibold">{job.name || job.domain}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  job.status === 'running' ? 'bg-blue-500/20 text-blue-400 animate-pulse' :
                  job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  job.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-500/20 text-zinc-400'
                }`}>
                  {job.status}
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate">{job.start_url}</p>
            </div>
            <div className="flex items-center gap-2">
              {job.status === 'running' ? (
                <Button variant="outline" size="sm" onClick={() => controlJob(job.id, 'stop')} className="border-red-500/30 text-red-400">
                  <Square className="w-4 h-4 mr-1" /> Stop
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => controlJob(job.id, 'start')} className="border-emerald-500/30 text-emerald-400">
                  <Play className="w-4 h-4 mr-1" /> {job.status === 'completed' ? 'Re-run' : 'Start'}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setSelectedLogsJob(job.id)}>
                <Terminal className="w-4 h-4 mr-1" /> Live
              </Button>
              <Button variant="ghost" size="sm" onClick={() => deleteJob(job.id)} className="text-red-400">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}
        {filteredJobs.length === 0 && (
          <p className="text-center text-zinc-500 py-10">No jobs found. Create your first crawl!</p>
        )}
      </div>

      {selectedLogsJob && (
        <LiveTerminal jobId={selectedLogsJob} onClose={() => setSelectedLogsJob(null)} />
      )}
    </div>
  );
}
