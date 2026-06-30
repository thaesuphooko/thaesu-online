'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';
import { Link as LinkIcon, Video, Zap, Play, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function ScrapePage() {
  // Single Scrape state
  const [singleUrl, setSingleUrl] = useState('');
  const [singleVendorId, setSingleVendorId] = useState('');
  const [singleCategory, setSingleCategory] = useState('');
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleResult, setSingleResult] = useState(null);

  // Social Autopilot state
  const [platform, setPlatform] = useState('tiktok');
  const [accountUrl, setAccountUrl] = useState('');
  const [priceMode, setPriceMode] = useState('manual');
  const [globalPrice, setGlobalPrice] = useState('');
  const [descMode, setDescMode] = useState('ai');
  const [descTemplate, setDescTemplate] = useState('');
  const [syncJobId, setSyncJobId] = useState(null);
  const [videoProducts, setVideoProducts] = useState([]);
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [syncStatus, setSyncStatus] = useState('');

  // Handlers
  const handleSingleScrape = async () => {
    if (!singleUrl.trim()) return;
    setSingleLoading(true);
    setSingleResult(null);
    try {
      const res = await adminFetch('/api/admin/scrape', {
        method: 'POST',
        body: JSON.stringify({ url: singleUrl, vendor_id: singleVendorId || null, category: singleCategory || null }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        setSingleResult(data);
        toast.success('Product saved!');
      } else {
        toast.error(data.error || 'Failed');
      }
    } catch (e) { toast.error('Network error'); }
    finally { setSingleLoading(false); }
  };

  const handleCreateSyncJob = async () => {
    if (!accountUrl.trim()) return;
    const config = {
      price_mode: priceMode,
      global_price: globalPrice,
      desc_mode: descMode,
      desc_template: descTemplate,
    };
    const res = await adminFetch('/api/admin/video-sync', {
      method: 'POST',
      body: JSON.stringify({ platform, account_url: accountUrl, config }),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (res.ok) {
      setSyncJobId(data.job.id);
      toast.success('Sync job created');
      fetchVideoProducts(data.job.id);
    } else {
      toast.error(data.error || 'Failed');
    }
  };

  const fetchVideoProducts = async (jobId) => {
    const res = await adminFetch(`/api/admin/video-sync/${jobId}`);
    if (res.ok) {
      const data = await res.json();
      setVideoProducts(data.products || []);
      setSyncStatus(data.job?.status || '');
    }
  };

  const triggerSync = async () => {
    if (!syncJobId) return;
    setSyncStatus('syncing');
    const res = await adminFetch(`/api/admin/video-sync/${syncJobId}`, { method: 'PATCH', body: JSON.stringify({ action: 'sync' }), headers: { 'Content-Type': 'application/json' } });
    if (res.ok) {
      toast.success('Sync completed');
      fetchVideoProducts(syncJobId);
    } else {
      toast.error('Sync failed');
      setSyncStatus('error');
    }
  };

  const toggleSelect = (id) => {
    setSelectedVideos(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const bulkPublish = async () => {
    if (selectedVideos.length === 0) return;
    const res = await adminFetch('/api/admin/video-sync/bulk-publish', {
      method: 'PATCH',
      body: JSON.stringify({ ids: selectedVideos }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      toast.success(`${selectedVideos.length} products published`);
      fetchVideoProducts(syncJobId);
      setSelectedVideos([]);
    } else {
      toast.error('Publish failed');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Scrape & Sync</h1>

      <Tabs defaultValue="single">
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="single" className="gap-2"><LinkIcon className="w-4 h-4" /> Single Scrape</TabsTrigger>
          <TabsTrigger value="social" className="gap-2"><Video className="w-4 h-4" /> Social Autopilot</TabsTrigger>
        </TabsList>

        <TabsContent value="single">
          <div className="glass-card p-6 space-y-4">
            <Input value={singleUrl} onChange={e => setSingleUrl(e.target.value)} placeholder="Product URL" required />
            <div className="grid grid-cols-2 gap-4">
              <Input value={singleVendorId} onChange={e => setSingleVendorId(e.target.value)} placeholder="Vendor ID (optional)" />
              <Input value={singleCategory} onChange={e => setSingleCategory(e.target.value)} placeholder="Category" />
            </div>
            <Button onClick={handleSingleScrape} disabled={singleLoading || !singleUrl} className="w-full">
              {singleLoading ? 'Scraping...' : 'Scrape & Save'}
            </Button>
            {singleResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-green-50 dark:bg-green-900/30 p-4 rounded-xl">
                <p className="font-semibold text-green-700 dark:text-green-300">Product saved!</p>
                <p className="text-sm">Title: {singleResult.product.title}</p>
                <p className="text-sm">Price: {singleResult.product.price}</p>
              </motion.div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="social">
          <div className="glass-card p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue placeholder="Platform" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                </SelectContent>
              </Select>
              <Input value={accountUrl} onChange={e => setAccountUrl(e.target.value)} placeholder="Account/Channel URL" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Pricing Mode</label>
                <Select value={priceMode} onValueChange={setPriceMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual per Video</SelectItem>
                    <SelectItem value="global">Fixed Global Price</SelectItem>
                  </SelectContent>
                </Select>
                {priceMode === 'global' && (
                  <Input type="number" value={globalPrice} onChange={e => setGlobalPrice(e.target.value)} placeholder="Global Price (Ks)" className="mt-2" />
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description Mode</label>
                <Select value={descMode} onValueChange={setDescMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ai">AI Extract from Video</SelectItem>
                    <SelectItem value="template">Global Template</SelectItem>
                  </SelectContent>
                </Select>
                {descMode === 'template' && (
                  <textarea value={descTemplate} onChange={e => setDescTemplate(e.target.value)} placeholder="Global description template..." rows={2} className="w-full p-2 border rounded mt-2" />
                )}
              </div>
            </div>

            <Button onClick={handleCreateSyncJob} disabled={!accountUrl.trim()} className="w-full">Create Sync Job</Button>
          </div>

          {/* Video Products List */}
          {syncJobId && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Video Products ({videoProducts.length})</h2>
                <div className="flex gap-2">
                  <Button onClick={triggerSync} variant="outline" className="gap-2" disabled={syncStatus === 'syncing'}>
                    {syncStatus === 'syncing' ? <RefreshCw className="animate-spin" /> : <RefreshCw />} Sync Now
                  </Button>
                  <Button onClick={bulkPublish} disabled={selectedVideos.length === 0} className="gap-2">
                    <Zap className="w-4 h-4" /> Publish Selected ({selectedVideos.length})
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {videoProducts.map(vp => (
                    <motion.div key={vp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={`glass-card p-4 flex gap-4 cursor-pointer ${selectedVideos.includes(vp.id) ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => toggleSelect(vp.id)}>
                      <div className="w-32 h-20 relative rounded overflow-hidden shrink-0 bg-gray-200">
                        {vp.thumbnail ? (
                          <img src={vp.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Play className="w-6 h-6 text-gray-400" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{vp.title}</h3>
                        <p className="text-xs text-muted-foreground">Price: {vp.price ? `${vp.price} Ks` : 'Not set'}</p>
                        <p className="text-xs text-muted-foreground">Category: {vp.category || 'Pending AI'}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${vp.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {vp.status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
