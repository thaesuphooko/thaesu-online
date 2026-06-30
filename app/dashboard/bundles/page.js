'use client';
import { useState, useEffect } from 'react'; import Button from '@/components/ui/button'; import Input from '@/components/ui/input'; import { adminFetch } from '@/lib/adminFetch'; import { toast } from 'sonner';
export default function BundlesPage() {
  const [bundles, setBundles] = useState([]); const [name, setName] = useState(''); const [discount, setDiscount] = useState('');
  const fetchBundles = async () => { /* placeholder until full bundle API */ };
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Bundles</h1>
      <div className="glass-card p-4 space-y-4"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Bundle Name" /><Input type="number" value={discount} onChange={e=>setDiscount(e.target.value)} placeholder="Discount %" /><Button>Create Bundle</Button></div>
      <p className="text-muted-foreground mt-4">Bundle management coming soon.</p>
    </div>
  );
}
