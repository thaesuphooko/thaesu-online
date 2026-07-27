'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2, Play, Square, Trash2, Globe, RefreshCw, Terminal, BarChart3,
  List, AlertCircle, ArrowUp, Webhook, Zap, Settings, Activity, Clock,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, ExternalLink,
  Package, BookOpen, Filter, Download, Layers, Eye
} from 'lucide-react';
import { toast } from 'sonner';

const JOB_TABS = ['products', 'wattpad'];
const STATUS_FILTERS = ['all', 'pending', 'running', 'completed', 'stopped'];

export default function AdminCrawlPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeJobTab, setActiveJobTab] = useState('products');
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState({ name: '', start_url: '', config: '{}', schedule: '' });
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetail, setJobDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('jobs');
  const [queueItems, setQueueItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [queueLoading, setQueueLoading] = useState(false);
  const [wattpadStories, setWattpadStories] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const logEndRef = useRef(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/crawler');
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const fetchJobDetail = useCallback(async (jobId) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/crawler/${jobId}?limit=200`);
      if (res.ok) {
        const data = await res.json();
        setJobDetail(data);
      }
    } catch (e) {
      toast.error('Failed to load job detail');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const fetchQueue = useCallback(async (jobId) => {
    setQueueLoading(true);
    try {
      const res = await fetch(`/api/admin/crawler/queue?job_id=${jobId}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setQueueItems(data.items || []);
      }
    } catch (e) {
      toast.error('Failed to load queue');
    } finally {
      setQueueLoading(false);
    }
  }, []);

  const fetchWattpadStories = useCallback(async () => {
    setStoriesLoading(true);
    try {
      const res = await fetch('/api/admin/wattpad/stories?limit=50');
      if (res.ok) {
        const data = await res.json();
        setWattpadStories(data.stories || []);
      }
    } catch (e) {
      toast.error('Failed to load Wattpad stories');
    } finally {
      setStoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedJob) return;
    fetchJobDetail(selectedJob);
    fetchQueue(selectedJob);
    const interval = setInterval(() => {
      fetchJobDetail(selectedJob);
      fetchQueue(selectedJob);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedJob, fetchJobDetail, fetchQueue]);

  useEffect(() => {
    if (activeJobTab === 'wattpad') {
      fetchWattpadStories();
    }
  }, [activeJobTab, fetchWattpadStories]);

  const createJob = async () => {
    if (!form.start_url) { toast.error('Start URL is required'); return; }
    try {
      let configObj = {};
      try { configObj = JSON.parse(form.config); } catch (e) { toast.error('Invalid config JSON'); return; }
      if (form.schedule) configObj.schedule = form.schedule;
      const payload = { name: form.name, start_url: form.start_url, config: configObj, type: activeJobTab };
      const res = await fetch('/api/admin/crawler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success('Job created');
        setForm({ name: '', start_url: '', config: '{}', schedule: '' });
        fetchJobs();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create job');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  const controlJob = async (jobId, action) => {
    try {
      const res = await fetch(`/api/admin/crawler/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success(`Job ${action}ed`);
        fetchJobs();
        if (selectedJob === jobId) fetchJobDetail(jobId);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Action failed');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  const deleteJob = async (jobId) => {
    if (!confirm('Delete this job?')) return;
    try {
      const res = await fetch(`/api/admin/crawler/${jobId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Job deleted');
        setSelectedJob(null);
        fetchJobs();
      } else {
        toast.error('Delete failed');
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  const bulkQueueAction = async (action) => {
    if (selectedItems.size === 0) { toast.error('Select items first'); return; }
    try {
      const res = await fetch('/api/admin/crawler/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedItems), action }),
      });
      if (res.ok) {
        toast.success(`Queue ${action} done`);
        setSelectedItems(new Set());
        if (selectedJob) fetchQueue(selectedJob);
      }
    } catch (e) {
      toast.error('Network error');
    }
  };

  const toggleSelectItem = (id) => {
    const next = new Set(selectedItems);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedItems(next);
  };

  const filteredJobs = jobs.filter(job => {
    const typeMatch = job.type === activeJobTab || (!job.type && activeJobTab === 'products');
    const statusMatch = statusFilter === 'all' || job.status === statusFilter;
    return typeMatch && statusMatch;
  });

  const stats = {
    total: filteredJobs.length,
    running: filteredJobs.filter(j => j.status === 'running').length,
    completed: filteredJobs.filter(j => j.status === 'completed').length,
    pending: filteredJobs.filter(j => j.status === 'pending').length,
  };

  const progress = jobDetail?.progress;
  const percent = progress?.total ? Math.round((progress.done / progress.total) * 100) : 0;

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [jobDetail?.logs]);

  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Globe className="w-8 h-8 text-purple-400" /> Infinity Crawler
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchJobs}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
          <Button variant="outline" size="sm" onClick={() => window.open('/dashboard/crawl-analytics', '_blank')}>
            <BarChart3 className="w-4 h-4 mr-1" /> Analytics
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Layers, color: 'text-blue-400', bg: 'from-blue-900/50 to-blue-800/50' },
          { label: 'Running', value: stats.running, icon: Activity, color: 'text-green-400', bg: 'from-green-900/50 to-green-800/50' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-purple-400', bg: 'from-purple-900/50 to-purple-800/50' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-400', bg: 'from-amber-900/50 to-amber-800/50' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.1 }}>
            <Card className={`bg-gradient-to-br ${s.bg} border-white/10 backdrop-blur-xl`}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <s.icon className={`w-8 h-8 ${s.color}`} />
                  <div>
                    <p className="text-sm text-zinc-400">{s.label}</p>
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="jobs"><List className="w-4 h-4 mr-1" /> Jobs</TabsTrigger>
          <TabsTrigger value="queue"><Layers className="w-4 h-4 mr-1" /> Queue</TabsTrigger>
          <TabsTrigger value="wattpad-results"><BookOpen className="w-4 h-4 mr-1" /> Wattpad Results</TabsTrigger>
          <TabsTrigger value="webhooks"><Webhook className="w-4 h-4 mr-1" /> Webhooks</TabsTrigger>
        </TabsList>

        {/* ─── Jobs Tab ─── */}
        <TabsContent value="jobs" className="space-y-6 mt-4">
          <Card className="glass-card border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader><CardTitle className="flex items-center gap-2"><Play className="w-5 h-5 text-green-400" /> New Crawl Job</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                {JOB_TABS.map(tab => (
                  <Button
                    key={tab}
                    variant={activeJobTab === tab ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveJobTab(tab)}
                  >
                    {tab === 'wattpad' ? <BookOpen className="w-4 h-4 mr-1" /> : <Package className="w-4 h-4 mr-1" />}
                    {tab === 'wattpad' ? 'Wattpad' : 'Products'}
                  </Button>
                ))}
              </div>
              <div>
                <Label>Job Name</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder={`Job Name (e.g., ${activeJobTab === 'wattpad' ? 'Myanmar Stories' : 'Shop Products'})`} />
              </div>
              <div>
                <Label>Start URL *</Label>
                <Input value={form.start_url} onChange={e => setForm({...form, start_url: e.target.value})}
                  placeholder={activeJobTab === 'wattpad' ? 'https://www.wattpad.com/stories/myanmar' : 'https://example.com/products'} required />
              </div>
              <div>
                <Label>Config (JSON)</Label>
                <Textarea value={form.config} onChange={e => setForm({...form, config: e.target.value})} rows={3} className="font-mono text-sm"
                  placeholder='{"maxPages":500,"concurrency":2}' />
              </div>
              <div>
                <Label>Schedule (cron expression, optional)</Label>
                <Input value={form.schedule} onChange={e => setForm({...form, schedule: e.target.value})}
                  placeholder="0 */6 * * * (every 6 hours)" />
                <p className="text-xs text-zinc-500 mt-1">Leave empty for one‑time manual run.</p>
              </div>
              <Button onClick={createJob} className="w-full" disabled={!form.start_url}>Create Job</Button>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><List className="w-5 h-5 text-blue-400" /> Jobs ({filteredJobs.length})</CardTitle>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-zinc-800 text-white px-3 py-1 rounded-lg text-sm border border-zinc-700">
                {STATUS_FILTERS.map(s => <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
              ) : filteredJobs.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">No crawl jobs found.</p>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {filteredJobs.map(job => (
                      <motion.div
                        key={job.id}
                        layout
                        initial={{ opacity:0, x:-20 }}
                        animate={{ opacity:1, x:0 }}
                        exit={{ opacity:0, x:20 }}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition cursor-pointer group"
                        onClick={() => setSelectedJob(job.id === selectedJob ? null : job.id)}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white">{job.name || job.domain || 'Untitled'}</p>
                            <Badge variant="outline" className="text-xs">
                              {job.type === 'wattpad' ? '📖 Wattpad' : '📦 Products'}
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-500 truncate max-w-md">{job.start_url}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={job.status === 'running' ? 'bg-green-600' : job.status === 'completed' ? 'bg-blue-600' : 'bg-zinc-600'}>
                              {job.status}
                            </Badge>
                            {job.config?.schedule && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" /> Scheduled
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {job.status === 'running' ? (
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); e.preventDefault(); controlJob(job.id, 'stop'); }}>
                              <Square className="w-4 h-4 mr-1" /> Stop
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); e.preventDefault(); controlJob(job.id, 'start'); }}>
                              <Play className="w-4 h-4 mr-1" /> Start
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); e.preventDefault(); deleteJob(job.id); }}>
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Queue Tab ─── */}
        <TabsContent value="queue" className="space-y-4 mt-4">
          {!selectedJob ? (
            <Card className="glass-card border-white/10 bg-white/5 backdrop-blur-xl">
              <CardContent className="py-12 text-center text-zinc-500">Select a job from the Jobs tab to view its queue.</CardContent>
            </Card>
          ) : (
            <>
              <Card className="glass-card border-white/10 bg-white/5 backdrop-blur-xl">
                <CardContent className="p-4 flex flex-wrap gap-2 items-center">
                  <Button variant="outline" size="sm" onClick={() => setSelectedItems(new Set(queueItems.map(i => i.id)))}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => bulkQueueAction('retry')} disabled={selectedItems.size === 0}>
                    <RefreshCw className="w-4 h-4 mr-1" /> Retry
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => bulkQueueAction('skip')} disabled={selectedItems.size === 0}>
                    Skip
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => bulkQueueAction('remove')} disabled={selectedItems.size === 0} className="text-red-400">
                    <Trash2 className="w-4 h-4 mr-1" /> Remove
                  </Button>
                  <span className="text-xs text-zinc-500 ml-auto">{selectedItems.size} selected</span>
                </CardContent>
              </Card>

              <Card className="glass-card border-white/10 bg-white/5 backdrop-blur-xl">
                <CardHeader><CardTitle className="text-sm">Queue Items ({queueItems.length})</CardTitle></CardHeader>
                <CardContent className="max-h-96 overflow-y-auto space-y-1">
                  {queueLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                  ) : queueItems.length === 0 ? (
                    <p className="text-center text-zinc-500 py-4">No items in queue.</p>
                  ) : (
                    queueItems.map(item => (
                      <div key={item.id}
                        className={`flex items-center gap-3 p-2 rounded-lg text-xs cursor-pointer ${selectedItems.has(item.id) ? 'bg-purple-500/20' : 'hover:bg-white/5'}`}
                        onClick={() => toggleSelectItem(item.id)}
                      >
                        <input type="checkbox" checked={selectedItems.has(item.id)} readOnly className="w-3.5 h-3.5" />
                        <span className={`w-2 h-2 rounded-full ${
                          item.status === 'done' ? 'bg-green-400' : item.status === 'processing' ? 'bg-blue-400' : item.status === 'failed' ? 'bg-red-400' : 'bg-zinc-500'
                        }`} />
                        <span className="truncate flex-1">{item.url}</span>
                        <Badge variant="outline" className="text-xs">{item.status}</Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

                {/* ─── Wattpad Results Tab ─── */}
        <TabsContent value="wattpad-results" className="space-y-4 mt-4">
          <Card className="glass-card border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-purple-400" /> Wattpad Stories ({wattpadStories.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={fetchWattpadStories}>
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {storiesLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
              ) : wattpadStories.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">No Wattpad stories scraped yet. Create and run a Wattpad crawl job.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {wattpadStories.map(story => (
                    <Card key={story.story_id} className="bg-white/5 border-white/10 hover:border-purple-500/30 transition">
                      <CardHeader className="p-4">
                        <CardTitle className="text-sm line-clamp-2">{story.title}</CardTitle>
                        <p className="text-xs text-zinc-500">by {story.author || 'Unknown'}</p>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="flex gap-2">
                          {story.cover_url && story.cover_url !== '/placeholder.jpg' && (
                            <img src={story.cover_url} alt={story.title} className="w-16 h-20 object-cover rounded-lg" />
                          )}
                          <p className="text-xs text-zinc-400 line-clamp-3">{story.description}</p>
                        </div>
                        <a href={story.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs mt-2 inline-block hover:underline">
                          Read on Wattpad <ExternalLink className="w-3 h-3 inline" />
                        </a>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Webhooks Tab ─── */}
        <TabsContent value="webhooks" className="space-y-4 mt-4">
          <Card className="glass-card border-white/10 bg-white/5 backdrop-blur-xl">
            <CardHeader><CardTitle className="flex items-center gap-2"><Webhook className="w-5 h-5 text-purple-400" /> Webhook Configurations</CardTitle></CardHeader>
            <CardContent>
              <p className="text-center text-zinc-500 py-8">Manage webhooks via API at <code>/api/admin/webhooks</code>.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Job Detail Modal */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => { if (!open) setSelectedJob(null); }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Terminal className="w-5 h-5 text-purple-400" /> Job Detail</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : jobDetail ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{jobDetail.job?.name || 'Untitled'}</p>
                  <p className="text-sm text-zinc-500">{jobDetail.job?.start_url}</p>
                </div>
                <Badge className={jobDetail.job?.status === 'running' ? 'bg-green-600' : 'bg-zinc-600'}>{jobDetail.job?.status}</Badge>
              </div>
              {progress && (
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Progress: {percent}%</span>
                    <span>{progress.done}/{progress.total} (failed: {progress.failed})</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mt-1">
                    <motion.div className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      initial={{width:0}} animate={{width:`${percent}%`}} transition={{duration:0.5}} />
                  </div>
                </div>
              )}
              <div className="bg-black/50 rounded-xl p-4 max-h-96 overflow-y-auto">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Terminal className="w-4 h-4" /> Logs</h4>
                <div className="space-y-1 text-xs font-mono">
                  {jobDetail.logs?.length === 0 ? <p className="text-zinc-500">No logs yet.</p> :
                    jobDetail.logs.map((log, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-zinc-600 shrink-0">{new Date(log.created_at).toLocaleTimeString()}</span>
                        <span className={log.level==='error'?'text-red-400':log.level==='warn'?'text-amber-400':'text-green-300'}>{log.message}</span>
                      </div>
                    ))
                  }
                  <div ref={logEndRef} />
                </div>
              </div>
              <div className="flex gap-2">
                {jobDetail.job?.status === 'running' ? (
                  <Button onClick={() => controlJob(selectedJob, 'stop')}><Square className="w-4 h-4 mr-1" /> Stop</Button>
                ) : (
                  <Button onClick={() => controlJob(selectedJob, 'start')}><Play className="w-4 h-4 mr-1" /> Start</Button>
                )}
                <Button variant="outline" onClick={() => deleteJob(selectedJob)} className="text-red-400">
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-center text-zinc-500 py-8">Failed to load job details.</p>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
