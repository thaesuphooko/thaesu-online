'use client';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center animate-fadeIn">
      <div className="glass-card p-8 text-center max-w-md mx-auto">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">Page not found</p>
        <Link href="/" className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 transition-all">
          Go Home
        </Link>
      </div>
    </div>
  );
}
