'use client';
import { useState, useEffect } from 'react';

export default function ReviewsCarousel() {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetch('/api/reviews/public?limit=100')
      .then(res => res.json())
      .then(data => setReviews(data));
  }, []);

  if (reviews.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden">
      <div className="flex gap-4 animate-scroll">
        {reviews.concat(reviews).map((r, i) => (
          <div key={i} className="min-w-[280px] max-w-[280px] glass-card p-4 flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                {r.user_name?.[0] || 'U'}
              </div>
              <span className="font-semibold text-sm">{r.user_name}</span>
            </div>
            <p className="text-muted-foreground text-sm line-clamp-3">{r.comment}</p>
            <div className="text-yellow-500 text-sm mt-1">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
          width: max-content;
        }
      `}</style>
    </div>
  );
}
