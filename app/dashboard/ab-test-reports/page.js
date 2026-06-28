'use client';
import { useState, useEffect } from 'react'; import { Button } from '@/components/ui/button'; import { Input } from '@/components/ui/input'; import { adminFetch } from '@/lib/adminFetch'; import { toast } from 'sonner';
export default function ABTestReportsPage() {
  const [tests, setTests] = useState([]); const [form, setForm] = useState({ name:'', variant_a:'', variant_b:'' });
  const fetchTests = async () => { const res = await adminFetch('/api/admin/ab-tests'); if (res.ok) setTests(await res.json()); };
  useEffect(() => { fetchTests(); }, []);
  const create = async () => { await adminFetch('/api/admin/ab-tests', { method:'POST', body:JSON.stringify(form), headers:{'Content-Type':'application/json'} }); toast.success('Created'); fetchTests(); };
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">AB Test Reports</h1>
      <div className="glass-card p-4 mb-8 space-y-2"><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Test Name" /><Input value={form.variant_a} onChange={e=>setForm({...form,variant_a:e.target.value})} placeholder="Variant A" /><Input value={form.variant_b} onChange={e=>setForm({...form,variant_b:e.target.value})} placeholder="Variant B" /><Button onClick={create}>Create Test</Button></div>
      <div className="space-y-2">{tests.map(t=>(<div key={t.id} className="glass-card p-3 flex justify-between"><span>{t.name}</span><span className="text-sm">{t.variant_a} vs {t.variant_b}</span></div>))}</div>
    </div>
  );
}
