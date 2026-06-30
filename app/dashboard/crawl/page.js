'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';

function StatusBadge({ status }) {
  const base = 'text-xs px-2.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1';
  switch (status) {
    case 'running':
      return <span className={`${base} bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse`}>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
        Running
      </span>;
    case 'completed':
      return <span className={`${base} bg-green-500/10 text-green-400 border border-green-500/20`}>
        ✓ Completed
      </span>;
    case 'stopped':
      return <span className={`${base} bg-yellow-500/10 text-yellow-400 border border-yellow-500/20`}>
        ⏸️ Stopped
      </span>;
    default:
      return <span className={`${base} bg-gray-500/10 text-gray-400 border border-gray-500/20`}>
        {status}
      </span>;
  }
}

function LogsModal({ jobId, onClose }) {
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);

  const fetchLogs = useCallback(async () => {
    const res = await adminFetch(`/api/admin/crawler/${jobId}?limit=200`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs || []);
    }
  }, [jobId]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100">Crawl Logs</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs text-green-400">
          {logs.length === 0 && <p className="text-gray-500">No logs yet...</p>}
          {logs.map((log, i) => (
            <div key={i} className={`flex gap-2 ${log.level === 'error' ? 'text-red-400' : ''}`}>
              <span className="text-gray-500 shrink-0">{new Date(log.created_at).toLocaleTimeString()}</span>
              <span>{log.message}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}

export default function CrawlPage() {
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState({ name: '', start_url: '', config: '{\n  "useSitemap": true,\n  "maxPages": 500,\n  "concurrency": 2\n}' });
  const [search, setSearch] = useState('');
  const [selectedLogsJob, setSelectedLogsJob] = useState(null);

  const fetchJobs = async () => {
    const res = await adminFetch('/api/admin/crawler');
    if (res.ok) setJobs(await res.json());
  };
  useEffect(() => { fetchJobs(); }, []);

  const createJob = async () => {
    try {
      const config = JSON.parse(form.config);
      await adminFetch('/api/admin/crawler', {
        method: 'POST',
        body: JSON.stringify({ name: form.name, start_url: form.start_url, config }),
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success('Job created');
      setForm({ name: '', start_url: '', config: '{\n  "useSitemap": true,\n  "maxPages": 500,\n  "concurrency": 2\n}' });
      fetchJobs();
    } catch (e) {
      toast.error('Invalid JSON config');
    }
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

  const filteredJobs = jobs.filter(job =>
    job.name?.toLowerCase().includes(search.toLowerCase()) ||
    job.start_url?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">24/7 Web Crawler</h1>

      <div className="glass-card p-6 mb-8 space-y-4">
        <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Job Name (optional)" />
        <Input value={form.start_url} onChange={e => setForm({...form, start_url: e.target.value})} placeholder="Start URL (e.g., https://shop.com.mm)" required />
        <textarea
          value={form.config}
          onChange={e => setForm({...form, config: e.target.value})}
          rows={6}
          className="w-full p-3 border rounded-xl font-mono text-sm bg-gray-900 text-green-400 focus:outline-none focus:ring-2 focus:ring-primary"
          spellCheck="false"
        />
        <Button onClick={createJob} className="w-full">Create Crawl Job</Button>
      </div>

      <div className="mb-4">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs..." className="max-w-sm" />
      </div>

      <div className="space-y-3">
        {filteredJobs.map(job => (
          <div key={job.id} className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm">{job.name || job.domain}</h3>
                <StatusBadge status={job.status} />
              </div>
              <p className="text-xs text-muted-foreground truncate">{job.start_url}</p>
            </div>

            <div className="flex items-center gap-2">
              {job.status === 'running' ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => controlJob(job.id, 'stop')}>Pause</Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedLogsJob(job.id)}>Logs</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => controlJob(job.id, 'start')}>
                    {job.status === 'completed' ? 'Re-run' : 'Start'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedLogsJob(job.id)}>Logs</Button>
                </>
              )}
            </div>
          </div>
        ))}
        {filteredJobs.length === 0 && (
          <p className="text-center text-muted-foreground">No jobs found.</p>
        )}
      </div>

      {selectedLogsJob && (
        <LogsModal jobId={selectedLogsJob} onClose={() => setSelectedLogsJob(null)} />
      )}
    </div>
  );
}
