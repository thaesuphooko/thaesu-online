'use client';
import { useState } from 'react';
export default function ImageZoom({ src, alt }) {
  const [zoom, setZoom] = useState(false);
  return (
    <div className="relative overflow-hidden" onMouseEnter={() => setZoom(true)} onMouseLeave={() => setZoom(false)}>
      <img src={src} alt={alt} className={`transition-transform duration-300 ${zoom ? 'scale-150' : 'scale-100'}`} />
    </div>
  );
}
