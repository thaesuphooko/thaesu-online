'use client';
import { useState, useEffect } from 'react'; import Button from '@/components/ui/button'; import Input from '@/components/ui/input'; import { adminFetch } from '@/lib/adminFetch'; import { toast } from 'sonner';
export default function ShippingPage() {
  const [zones, setZones] = useState([]); const [region, setRegion] = useState(''); const [price, setPrice] = useState('');
  const fetchZones = async () => { const res = await adminFetch('/api/admin/shipping'); if (res.ok) setZones(await res.json()); };
  useEffect(() => { fetchZones(); }, []);
  const addZone = async () => { await adminFetch('/api/admin/shipping', { method:'POST', body:JSON.stringify({ region_name: region, price: parseFloat(price) }), headers:{'Content-Type':'application/json'} }); toast.success('Zone added'); fetchZones(); };
  const deleteZone = async (id) => { await adminFetch('/api/admin/shipping', { method:'DELETE', body:JSON.stringify({id}), headers:{'Content-Type':'application/json'} }); toast.success('Deleted'); fetchZones(); };
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Shipping Zones</h1>
      <div className="flex gap-2 mb-4"><Input value={region} onChange={e=>setRegion(e.target.value)} placeholder="Region" className="flex-1" /><Input type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Price" className="w-32" /><Button onClick={addZone}>Add</Button></div>
      <div className="space-y-2">{zones.map(z=>(<div key={z.id} className="glass-card p-3 flex justify-between"><span>{z.region_name} - {z.price} Ks</span><Button size="sm" variant="destructive" onClick={()=>deleteZone(z.id)}>Delete</Button></div>))}</div>
    </div>
  );
}
