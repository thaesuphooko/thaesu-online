'use client';
import { useState, useEffect } from 'react';

export default function ProductReviews({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('adminSecret') || '';
    }
    return '';
  };

  const fetchReviews = async () => {
    const res = await fetch(`/api/reviews?product_id=${productId}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) setReviews(data);
      else setReviews([]);
    }
  };

  useEffect(() => { fetchReviews(); }, [productId]);

  const submitReview = async () => {
    const token = getToken();
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
        {Array.isArray(reviews) && reviews.map((r) => (
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
        <select value={rating} onChange={e => setRating(e.target.value)} className="w-full p-2 rounded border mb-2">
          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Star{n>1?'s':''}</option>)}
        </select>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} className="w-full p-2 rounded border mb-2" placeholder="Your comment..."></textarea>
        <button onClick={submitReview} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Submit Review</button>
      </div>
    </div>
  );
}
