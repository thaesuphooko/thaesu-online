'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';

export default function ScrapePage() {
  const [url, setUrl] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleScrape = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/scrape', {
        method: 'POST',
        body: JSON.stringify({ url, vendor_id: vendorId || null, category: category || null }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        toast.success('Product saved');
      } else {
        toast.error(data.error || 'Failed');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Scrape Product</h1>
      <div className="glass-card p-6 space-y-4">
        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="Product URL (e.g., https://shop.com.mm/product/123)" required />
        <div className="grid grid-cols-2 gap-4">
          <Input value={vendorId} onChange={e => setVendorId(e.target.value)} placeholder="Vendor ID (optional)" />
          <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Category" />
        </div>
        <Button onClick={handleScrape} disabled={loading || !url} className="w-full">
          {loading ? 'Scraping...' : 'Scrape & Save'}
        </Button>
        {result && (
          <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-xl">
            <p className="font-semibold text-green-700 dark:text-green-300">Product saved!</p>
            <p className="text-sm">Title: {result.product.title}</p>
            <p className="text-sm">Price: {result.product.price}</p>
          </div>
        )}
      </div>
    </div>
  );
}
