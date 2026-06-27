'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function MagicLinkCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      router.replace('/dashboard');
      return;
    }

    fetch('/api/admin/magic-link/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setStatus('success');
          localStorage.setItem('adminSecret', 'magic-link-verified');
          setTimeout(() => router.replace('/dashboard'), 1500);
        } else {
          setStatus('invalid');
        }
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center animate-fadeIn">
      <div className="glass-card p-8 max-w-sm w-full text-center space-y-4">
        {status === 'verifying' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">Verifying secure access...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-4xl">✅</div>
            <h1 className="text-xl font-bold text-green-500">Access Granted</h1>
            <p className="text-muted-foreground">Redirecting to Admin Panel...</p>
          </>
        )}
        {status === 'invalid' && (
          <>
            <div className="text-4xl">❌</div>
            <h1 className="text-xl font-bold text-red-500">Invalid Link</h1>
            <p className="text-muted-foreground">This link has expired or is invalid.</p>
            <button onClick={() => router.push('/dashboard')} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl">Try again</button>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl">⚠️</div>
            <h1 className="text-xl font-bold text-red-500">Connection Error</h1>
            <p className="text-muted-foreground">Please try again later.</p>
          </>
        )}
      </div>
    </div>
  );
}
