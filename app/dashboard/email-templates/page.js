'use client';
import { useState, useEffect } from 'react'; import { Button } from '@/components/ui/button'; import { Input } from '@/components/ui/input'; import { adminFetch } from '@/lib/adminFetch'; import { toast } from 'sonner';
export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState([]); const [editName, setEditName] = useState(null); const [subject, setSubject] = useState(''); const [body, setBody] = useState('');
  const fetchTemplates = async () => { const res = await adminFetch('/api/admin/email-templates'); if (res.ok) setTemplates(await res.json()); };
  useEffect(() => { fetchTemplates(); }, []);
  const save = async () => { await adminFetch('/api/admin/email-templates', { method:'PATCH', body:JSON.stringify({ name:editName, subject, body }), headers:{'Content-Type':'application/json'} }); toast.success('Saved'); setEditName(null); fetchTemplates(); };
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Email Templates</h1>
      <div className="space-y-2">{templates.map(t=>(<div key={t.name} className="glass-card p-3 flex justify-between"><span className="font-semibold">{t.name}</span><Button size="sm" variant="outline" onClick={()=>{ setEditName(t.name); setSubject(t.subject); setBody(t.body); }}>Edit</Button></div>))}</div>
      {editName && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-card p-6 rounded-xl w-full max-w-2xl"><h2 className="text-lg font-bold mb-4">Edit {editName}</h2><Input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject" className="mb-2" /><textarea value={body} onChange={e=>setBody(e.target.value)} rows={10} className="w-full p-2 border rounded mb-2" /><div className="flex gap-2 justify-end"><Button variant="outline" onClick={()=>setEditName(null)}>Cancel</Button><Button onClick={save}>Save</Button></div></div></div>
      )}
    </div>
  );
}
