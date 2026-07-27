'use client'; // Required for the floating particles & skeleton animations
import { Suspense, useEffect, useRef } from 'react';
import ProfileContent from './ProfileContent';

// ======================== PARTICLE BACKGROUND (Infinity Vibe) ========================
function ParticleBackground() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrame;
    let particles = [];
    const maxParticles = 50;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.3 + 0.05,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
        if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(168, 85, 247, ${p.opacity})`;
        ctx.fill();
      });
      animationFrame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
}

// ======================== PREMIUM SKELETON ========================
function ProfileLoadingSkeleton() {
  // Random width helper for realistic text shimmer
  const TextShimmer = ({ width, className = '' }) => (
    <div className={`h-4 bg-zinc-800 rounded-lg relative overflow-hidden ${className}`} style={{ width }}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
    </div>
  );

  const AvatarShimmer = () => (
    <div className="w-32 h-32 rounded-full bg-zinc-800 border-4 border-black relative overflow-hidden flex-shrink-0">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20" />
    </div>
  );

  const StatShimmer = () => (
    <div className="h-16 w-20 bg-zinc-800 rounded-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
    </div>
  );

  const GridItemShimmer = ({ height = 48 }) => (
    <div className={`bg-zinc-800 rounded-2xl relative overflow-hidden`} style={{ height: `${height}px` }}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-zinc-700 rounded w-3/4" />
        <div className="h-3 bg-zinc-700 rounded w-1/2" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Floating particles */}
      <ParticleBackground />
      
      {/* Cover glow */}
      <div className="h-48 md:h-64 bg-zinc-800 relative overflow-hidden animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 via-transparent to-cyan-900/30" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <AvatarShimmer />
          <div className="flex-1 space-y-4 pt-4">
            <TextShimmer width="60%" className="h-8" />
            <TextShimmer width="40%" />
            <div className="flex gap-4">
              <StatShimmer />
              <StatShimmer />
              <StatShimmer />
              <StatShimmer />
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-24 bg-zinc-800 rounded-xl animate-pulse" />
              <div className="h-10 w-10 bg-zinc-800 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-8 border-b border-zinc-800">
          {['Posts', 'Products', 'Media', 'Likes'].map((tab, i) => (
            <div key={i} className="h-10 w-20 bg-zinc-800 rounded-t-lg animate-pulse" />
          ))}
        </div>

        {/* Content grid with varied heights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
          {[180, 220, 160, 240, 200, 170].map((h, i) => (
            <GridItemShimmer key={i} height={h} />
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
}

// ======================== ERROR / NOT FOUND FALLBACK ========================
function ProfileErrorFallback({ error, resetErrorBoundary }) {
  const isNotFound = error?.message?.includes('not found') || error?.message?.includes('404');
  
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative">
      <ParticleBackground />
      <div className="relative z-10 bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl shadow-purple-500/10">
        {isNotFound ? (
          <>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
              <svg className="w-10 h-10 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
            <p className="text-zinc-400 text-sm mb-6">The profile you're looking for doesn't exist or may have been removed.</p>
            <div className="flex gap-3 justify-center">
              <a href="/feed" className="px-5 py-2 bg-purple-600 rounded-xl font-medium hover:bg-purple-700 transition">Go to Feed</a>
              <button onClick={resetErrorBoundary} className="px-5 py-2 border border-zinc-700 rounded-xl font-medium hover:bg-zinc-800 transition">Try Again</button>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-red-400 mb-2">Failed to Load Profile</h2>
            <p className="text-zinc-400 text-sm mb-6">{error?.message || 'Something went wrong.'}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={resetErrorBoundary} className="px-5 py-2 bg-purple-600 rounded-xl font-medium hover:bg-purple-700 transition">Try Again</button>
              <a href="/" className="px-5 py-2 border border-zinc-700 rounded-xl font-medium hover:bg-zinc-800 transition">Home</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ======================== ERROR BOUNDARY ========================
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Profile page error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <this.props.FallbackComponent error={this.state.error} resetErrorBoundary={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

// ======================== MAIN PAGE ========================
export default function ProfilePage() {
  return (
    <ErrorBoundary FallbackComponent={ProfileErrorFallback}>
      <Suspense fallback={<ProfileLoadingSkeleton />}>
        <ProfileContent />
      </Suspense>
    </ErrorBoundary>
  );
}
