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
    <div className="relative w-full overflow-hidden group">
      <div className="flex gap-6 animate-scroll">
        {reviews.concat(reviews).map((r, i) => (
          <div key={i} className="min-w-[300px] max-w-[300px] glass-card p-5 flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                {r.user_name?.[0] || 'U'}
              </div>
              <div>
                <p className="font-semibold text-base">{r.user_name}</p>
                <p className="text-xs text-muted-foreground">{r.relative_date}</p>
              </div>
            </div>
            <div className="text-yellow-500 text-sm mb-2">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
            <p className="text-muted-foreground text-sm leading-relaxed">{r.comment}</p>
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 500s linear infinite;
          width: max-content;
        }
        .group:hover .animate-scroll {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
