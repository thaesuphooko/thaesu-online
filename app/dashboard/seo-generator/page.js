'use client';
import { useState } from 'react'; import { Button } from '@/components/ui/button'; import { Input } from '@/components/ui/input'; import { adminFetch } from '@/lib/adminFetch'; import { toast } from 'sonner';
export default function SEOGeneratorPage() {
  const [productId, setProductId] = useState(''); const [meta, setMeta] = useState(null);
  const generate = async () => { const res = await adminFetch('/api/admin/seo', { method:'POST', body:JSON.stringify({ productId }), headers:{'Content-Type':'application/json'} }); if (res.ok) { const data = await res.json(); setMeta(data); toast.success('Generated'); } };
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">SEO Generator</h1>
      <div className="glass-card p-4 space-y-4"><Input value={productId} onChange={e=>setProductId(e.target.value)} placeholder="Product UUID" /><Button onClick={generate}>Generate Meta Tags</Button></div>
      {meta && <div className="glass-card p-4 mt-4"><p className="font-semibold">Title: {meta.metaTitle}</p><p className="text-sm text-muted-foreground">Description: {meta.metaDesc}</p></div>}
    </div>
  );
}
