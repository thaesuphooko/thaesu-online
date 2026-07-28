'use client';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const AdminLoginPage = dynamic(() => import('@/app/auth/admin-login/page'), {
  loading: () => (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
        <p className="text-zinc-400 text-sm">Loading secure access…</p>
      </div>
    </div>
  ),
  ssr: false,
});

export default AdminLoginPage;
