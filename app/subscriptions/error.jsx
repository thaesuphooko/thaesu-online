'use client';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Subscriptions page error:', error);
    toast.error('Failed to load subscription plans', { duration: 5000 });
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
        <p className="text-zinc-400 mt-2">We couldn’t load the subscription plans.</p>
        <button
          onClick={reset}
          className="mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl text-white font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
