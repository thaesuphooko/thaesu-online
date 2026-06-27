'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { adminFetch } from '@/lib/adminFetch';

export default function CrawlPage() {
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState({ name: '', start_url: '', config: '{}' });
  const [selectedJob, setSelectedJob] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    const res = await adminFetch('/api/admin/crawler');
    if (res.ok) setJobs(await res.json());
  };

  const createJob = async () => {
    await adminFetch('/api/admin/crawler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, config: JSON.parse(form.config || '{}') }),
    });
    setForm({ name: '', start_url: '', config: '{}' });
    fetchJobs();
  };

  const toggleJob = async (jobId, action) => {
    await adminFetch(`/api/admin/crawler/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    fetchJobs();
  };

  const viewLogs = async (jobId) => {
    setSelectedJob(jobId);
    const res = await adminFetch(`/api/admin/crawler/${jobId}?limit=100`);
    if (res.ok) setLogs(await res.json());
  };

  return (
    <div className="max-w-6xl mx-auto p-4 py-8 animate-fadeIn">
      <h1 className="text-3xl font-bold mb-6">24/7 Web Crawler</h1>

      <div className="glass-card p-6 mb-8 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Job Name (optional)</label>
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g., Shop.com.mm" className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Start URL *</label>
          <input value={form.start_url} onChange={e => setForm({...form, start_url: e.target.value})} placeholder="https://shop.com.mm" className="w-full p-2 border rounded" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Config JSON <span className="text-muted-foreground">(optional, default works for most sites)</span>
          </label>
          <textarea
            value={form.config}
            onChange={e => setForm({...form, config: e.target.value})}
            placeholder='{"delay":{"min":3000,"max":8000},"maxDepth":3,"maxPages":500}'
            className="w-full p-2 border rounded h-24 font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground mt-1">
            <b>productUrlPatterns</b>: ["/product/", "/item/"] &nbsp;|&nbsp;
            <b>categoryUrlPatterns</b>: ["/category/", "/collections/"] &nbsp;|&nbsp;
            <b>maxPages</b>: 500
          </p>
        </div>
        <Button onClick={createJob} className="w-full">Create Crawl Job</Button>
      </div>

      <div className="space-y-4 mb-8">
        {jobs.map(job => (
          <div key={job.id} className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">{job.name || job.domain}</p>
              <p className="text-sm text-muted-foreground">{job.start_url}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${job.status === 'running' ? 'bg-green-100 text-green-800' : job.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{job.status}</span>
            </div>
            <div className="flex gap-2">
              {job.status === 'running' ? (
                <Button variant="outline" size="sm" onClick={() => toggleJob(job.id, 'stop')}>Stop</Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => toggleJob(job.id, 'start')}>Start</Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => viewLogs(job.id)}>Logs</Button>
            </div>
          </div>
        ))}
      </div>

      {selectedJob && (
        <div className="glass-card p-4">
          <h2 className="font-bold mb-2">Crawl Logs (Job: {selectedJob})</h2>
          <div className="max-h-64 overflow-y-auto space-y-1 text-sm">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-muted-foreground">{new Date(log.created_at).toLocaleTimeString()}</span>
                <span className={log.level === 'error' ? 'text-red-500' : ''}>{log.message}</span>
              </div>
            ))}
            {logs.length === 0 && <p className="text-muted-foreground">No logs yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
