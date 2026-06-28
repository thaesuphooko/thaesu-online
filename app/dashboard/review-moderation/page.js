'use client';
import { useState, useEffect } from 'react'; import { Button } from '@/components/ui/button'; import { adminFetch } from '@/lib/adminFetch'; import { toast } from 'sonner';
export default function ReviewModerationPage() {
  const [reviews, setReviews] = useState([]);
  const fetchReviews = async () => { const res = await adminFetch('/api/admin/reviews-moderate'); if (res.ok) setReviews(await res.json()); };
  useEffect(() => { fetchReviews(); }, []);
  const moderate = async (reviewId, status) => { await adminFetch('/api/admin/reviews-moderate', { method:'PATCH', body:JSON.stringify({ reviewId, status }), headers:{'Content-Type':'application/json'} }); toast.success('Moderated'); fetchReviews(); };
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Review Moderation</h1>
      <div className="space-y-2">{reviews.map(r=>(<div key={r.id} className="glass-card p-3 flex justify-between"><div><p className="text-sm">{r.comment}</p><p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>moderate(r.id,'approved')}>Approve</Button><Button size="sm" variant="destructive" onClick={()=>moderate(r.id,'rejected')}>Reject</Button></div></div>))}</div>
    </div>
  );
}
