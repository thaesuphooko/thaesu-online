'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { adminFetch } from '@/lib/adminFetch';

export default function ScrapePage() {
  const [url, setUrl] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleScrape = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await adminFetch('/api/admin/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, vendor_id: vendorId || null, category: category || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Scraping failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 py-8 animate-fadeIn">
      <h1 className="text-3xl font-bold mb-6">Scrape Product</h1>
      <div className="glass-card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Product URL *</label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/product/123"
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Vendor ID (optional)</label>
            <input
              type="text"
              value={vendorId}
              onChange={e => setVendorId(e.target.value)}
              placeholder="Existing vendor UUID"
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="e.g., Electronics"
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        <Button onClick={handleScrape} disabled={loading || !url} className="w-full">
          {loading ? 'Scraping...' : 'Scrape & Save'}
        </Button>

        {error && <div className="text-red-500 text-sm">{error}</div>}
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
