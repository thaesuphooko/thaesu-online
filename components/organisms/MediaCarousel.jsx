'use client';
import { useState, useRef, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import Image from 'next/image';

export default function MediaCarousel({ media = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showPIP, setShowPIP] = useState(false);
  const videoRef = useRef(null);

  const totalSlides = media.length || 1;
  const hasVideo = media.some(m => m.video_url || m.type === 'video');

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowPIP(!entry.isIntersecting && hasVideo && activeIndex === media.findIndex(m => m.video_url || m.type === 'video'));
      },
      { threshold: 0.1 }
    );
    const el = document.getElementById('media-carousel');
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [hasVideo, activeIndex, media]);

  if (!media.length) {
    return (
      <div className="aspect-[3/4] bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <Image src="/placeholder.jpg" alt="No image" fill className="object-cover" />
      </div>
    );
  }

  return (
    <>
      <div id="media-carousel" className="relative aspect-[3/4] bg-black">
        <Swiper
          modules={[Pagination]}
          pagination={{ type: 'fraction', el: '.swiper-pagination-custom' }}
          onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
          className="h-full w-full"
        >
          {media.map((item, i) => (
            <SwiperSlide key={i}>
              {item.video_url || item.type === 'video' ? (
                <iframe
                  ref={i === activeIndex ? videoRef : null}
                  src={`${item.video_url}?autoplay=1&mute=1&loop=1&controls=0`}
                  className="w-full h-full object-cover"
                  allow="autoplay; encrypted-media"
                />
              ) : (
                <Image src={item.url || '/placeholder.jpg'} alt={`Product media ${i+1}`} fill className="object-cover" />
              )}
            </SwiperSlide>
          ))}
        </Swiper>
        <div className="swiper-pagination-custom absolute bottom-3 right-3 z-10 bg-black/40 backdrop-blur-md text-white text-xs px-2 py-1 rounded-full" />
      </div>

      {/* PIP Video */}
      {showPIP && (
        <div className="fixed bottom-20 right-4 z-50 w-32 h-44 rounded-xl overflow-hidden shadow-2xl border-2 border-white dark:border-gray-700 animate-in slide-in-from-bottom">
          <iframe
            src={`${media[activeIndex]?.video_url}?autoplay=1&mute=1&loop=1&controls=0`}
            className="w-full h-full object-cover"
          />
          <button onClick={() => setShowPIP(false)} className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full text-white text-[10px] flex items-center justify-center">✕</button>
        </div>
      )}
    </>
  );
}
