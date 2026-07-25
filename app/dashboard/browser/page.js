'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminFetch } from '@/lib/adminFetch';

export default function BrowserPage() {
  const [url, setUrl] = useState('https://shop.com.mm');
  const [proxyUrl, setProxyUrl] = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const iframeRef = useRef(null);

  // Get admin secret from localStorage (or env)
  const getAdminSecret = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('adminSecret') || process.env.NEXT_PUBLIC_ADMIN_HASH || '';
    }
    return process.env.NEXT_PUBLIC_ADMIN_HASH || '';
  };

  useEffect(() => {
    const handler = async (event) => {
      if (event.data?.type === 'PRODUCT_DATA' && event.data?.data) {
        try {
          await adminFetch('/api/admin/save-browsed-product', {
            method: 'POST',
            body: JSON.stringify(event.data.data),
            headers: { 'Content-Type': 'application/json' },
          });
          setSavedCount(prev => prev + 1);
        } catch (e) {}
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const startBrowsing = () => {
    if (!url.trim()) return;
    const secret = getAdminSecret();
    const encodedUrl = encodeURIComponent(url);
    const encodedSecret = encodeURIComponent(secret);
    setProxyUrl(`/api/admin/browse-proxy?url=${encodedUrl}&secret=${encodedSecret}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex gap-2 mb-4">
        <Input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Enter website URL..."
          className="flex-1"
        />
        <Button onClick={startBrowsing}>Browse</Button>
        <span className="text-sm text-muted-foreground self-center ml-2">
          Saved: {savedCount}
        </span>
      </div>
      {proxyUrl ? (
        <iframe
          ref={iframeRef}
          src={proxyUrl}
          className="flex-1 w-full border rounded-2xl glass-card"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          title="External Browser"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center glass-card">
          <p className="text-muted-foreground">Enter a URL and click Browse to start scraping products as you visit them.</p>
        </div>
      )}
    </div>
  );
}
