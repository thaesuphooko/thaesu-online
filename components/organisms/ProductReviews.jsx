'use client';
import { useState, useEffect } from 'react';

export default function ProductReviews({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
  }, []);

  const fetchReviews = async () => {
    const res = await fetch(`/api/reviews?product_id=${productId}`);
    if (res.ok) setReviews(await res.json());
  };

  useEffect(() => { fetchReviews(); }, [productId]);

  const submitReview = async () => {
    await fetch('/api/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ product_id: productId, rating, comment }),
    });
    setComment('');
    fetchReviews();
  };

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Customer Reviews</h2>
      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="glass-card p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-yellow-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              <span className="text-sm text-gray-500">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <p>{r.comment}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 glass-card p-4">
        <h3 className="font-semibold mb-2">Write a Review</h3>
        <label className="block mb-1 text-sm">Your JWT Token</label>
        <input type="text" value={token} onChange={e => setToken(e.target.value)} className="w-full p-2 rounded border mb-2" placeholder="Paste token" />
        <select value={rating} onChange={e => setRating(e.target.value)} className="w-full p-2 rounded border mb-2">
          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Star{n>1?'s':''}</option>)}
        </select>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} className="w-full p-2 rounded border mb-2" placeholder="Your comment..."></textarea>
        <button onClick={submitReview} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Submit Review</button>
      </div>
    </div>
  );
}
