'use client';
import { useState, useEffect } from 'react'; import { Button } from '@/components/ui/button'; import { Input } from '@/components/ui/input'; import { adminFetch } from '@/lib/adminFetch'; import { toast } from 'sonner';
export default function ApiKeysPage() {
  const [keys, setKeys] = useState([]); const [name, setName] = useState('');
  const fetchKeys = async () => { const res = await adminFetch('/api/admin/api-keys'); if (res.ok) setKeys(await res.json()); };
  useEffect(() => { fetchKeys(); }, []);
  const generate = async () => { await adminFetch('/api/admin/api-keys', { method:'POST', body:JSON.stringify({ name }), headers:{'Content-Type':'application/json'} }); toast.success('Key generated'); fetchKeys(); };
  const revoke = async (id) => { await adminFetch('/api/admin/api-keys', { method:'DELETE', body:JSON.stringify({id}), headers:{'Content-Type':'application/json'} }); toast.success('Revoked'); fetchKeys(); };
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">API Keys</h1>
      <div className="flex gap-2 mb-4"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Key Name" /><Button onClick={generate}>Generate</Button></div>
      <div className="space-y-2">{keys.map(k=>(<div key={k.id} className="glass-card p-3 flex justify-between"><span>{k.name}: {k.api_key?.slice(0,12)}...</span><Button size="sm" variant="destructive" onClick={()=>revoke(k.id)}>Revoke</Button></div>))}</div>
    </div>
  );
}
