'use client';
import { useState, useEffect } from 'react'; import Button from '@/components/ui/button'; import Input from '@/components/ui/input'; import { adminFetch } from '@/lib/adminFetch'; import { toast } from 'sonner';
export default function SegmentsPage() {
  const [segments, setSegments] = useState([]); const [name, setName] = useState(''); const [criteria, setCriteria] = useState('{}');
  const fetchSegments = async () => { const res = await adminFetch('/api/admin/segments'); if (res.ok) setSegments(await res.json()); };
  useEffect(() => { fetchSegments(); }, []);
  const create = async () => { await adminFetch('/api/admin/segments', { method:'POST', body:JSON.stringify({ name, criteria: JSON.parse(criteria||'{}') }), headers:{'Content-Type':'application/json'} }); toast.success('Created'); fetchSegments(); };
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Customer Segments</h1>
      <div className="glass-card p-4 mb-8 space-y-2"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Segment Name" /><Input value={criteria} onChange={e=>setCriteria(e.target.value)} placeholder='Criteria JSON (e.g. {"minOrders":3})' /><Button onClick={create}>Create</Button></div>
      <div className="space-y-2">{segments.map(s=>(<div key={s.id} className="glass-card p-3"><span className="font-semibold">{s.name}</span><p className="text-xs text-muted-foreground">{JSON.stringify(s.criteria)}</p></div>))}</div>
    </div>
  );
}
