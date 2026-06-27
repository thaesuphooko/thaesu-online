'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function MagicLinkCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      router.replace('/dashboard');
      return;
    }

    // Verify token via API
    fetch('/api/admin/magic-link/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          localStorage.setItem('adminSecret', 'magic-link-verified');
          router.replace('/dashboard');
        } else {
          alert('Invalid or expired link');
          router.replace('/dashboard');
        }
      });
  }, []);

  return <div className="p-8 text-center">Verifying magic link...</div>;
}
