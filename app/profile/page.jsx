import { Suspense } from 'react';
import ProfileContent from './ProfileContent';

function ProfileLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <div className="backdrop-blur-xl bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-6 shadow-2xl shadow-purple-500/10">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-28 h-28 rounded-full bg-zinc-800/80 ring-2 ring-zinc-700/50 relative overflow-hidden mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
            </div>
            <div className="h-5 bg-zinc-800/80 rounded-full w-32 mb-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
            </div>
            <div className="h-3 bg-zinc-800/80 rounded-full w-20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-8 mb-8">
            <div className="flex flex-col items-center gap-2">
              <div className="h-7 w-12 bg-zinc-800/80 rounded-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
              </div>
              <div className="h-3 w-10 bg-zinc-800/80 rounded-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-7 w-12 bg-zinc-800/80 rounded-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
              </div>
              <div className="h-3 w-10 bg-zinc-800/80 rounded-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>

          {/* Edit Button */}
          <div className="h-12 bg-zinc-800/80 rounded-xl w-full relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileLoadingSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}
