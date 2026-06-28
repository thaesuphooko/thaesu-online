'use client';
import { useEffect } from 'react';

export default function PreventPullRefresh() {
  useEffect(() => {
    const preventDefault = (e) => {
      if (window.scrollY === 0) {
        e.preventDefault();
      }
    };
    document.addEventListener('touchstart', preventDefault, { passive: false });
    return () => document.removeEventListener('touchstart', preventDefault);
  }, []);
  return null;
}
