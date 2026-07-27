'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy, Share2, Users, Gift, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ReferralBox({ user }) {
  const [copied, setCopied] = useState(false);
  const referralLink = `${window.location.origin}/auth/register?ref=${user.referral_code}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Thaesu',
          text: 'Sign up with my referral link and get rewards!',
          url: referralLink,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-zinc-900/60 to-zinc-800/60 backdrop-blur-md border border-purple-500/20 rounded-2xl p-5 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 bg-purple-500/20 rounded-xl">
          <Gift className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="font-bold text-sm">Referral Program</h3>
          <p className="text-xs text-zinc-400">Earn 500 Ks per friend</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <code className="flex-1 bg-black/30 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-purple-300 font-mono overflow-x-auto">
          {user.referral_code}
        </code>
        <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0">
          {copied ? 'Copied!' : <Copy className="w-4 h-4" />}
        </Button>
        <Button variant="outline" size="sm" onClick={shareLink} className="shrink-0">
          <Share2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-zinc-400">
          <Wallet className="w-3.5 h-3.5 text-green-400" />
          Wallet: <span className="text-white font-medium">{parseFloat(user.wallet_balance || 0).toLocaleString()} Ks</span>
        </span>
        <span className="flex items-center gap-1 text-zinc-500">
          <Users className="w-3.5 h-3.5" />
          {/* You can add referral count here */}
        </span>
      </div>
    </motion.div>
  );
}
