'use client';
import Script from 'next/script';

export default function ErudaLoader() {
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <Script
      src="https://cdn.jsdelivr.net/npm/eruda"
      strategy="afterInteractive"
      onLoad={() => {
        if (typeof window !== 'undefined' && window.eruda) {
          window.eruda.init();
        }
      }}
    />
  );
}
