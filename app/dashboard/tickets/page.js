'use client';
import { useState, useEffect } from 'react'; import { Button } from '@/components/ui/button'; import { adminFetch } from '@/lib/adminFetch'; import { toast } from 'sonner';
export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const fetchTickets = async () => { const res = await adminFetch('/api/admin/tickets'); if (res.ok) setTickets(await res.json()); };
  useEffect(() => { fetchTickets(); }, []);
  const updateStatus = async (ticketId, status) => { await adminFetch('/api/admin/tickets', { method:'PATCH', body:JSON.stringify({ ticketId, status }), headers:{'Content-Type':'application/json'} }); toast.success('Updated'); fetchTickets(); };
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Support Tickets</h1>
      <div className="space-y-2">{tickets.map(t=>(<div key={t.id} className="glass-card p-3 flex justify-between"><div><p className="font-semibold">{t.subject}</p><p className="text-xs text-muted-foreground">{t.email}</p></div><select value={t.status} onChange={e=>updateStatus(t.id,e.target.value)} className="border rounded p-1"><option>open</option><option>closed</option><option>pending</option></select></div>))}</div>
    </div>
  );
}
