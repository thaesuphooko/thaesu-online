'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SubscribeButton({ plan }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/subscription/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: plan.id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Welcome to the family! 🎉');
        router.push('/account/subscriptions');
      } else {
        toast.error(data.error || 'Something went wrong');
      }
    } catch (e) {
      toast.error('Network error, please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      className="w-full group relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-6 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25"
      size="lg"
      onClick={handleSubscribe}
      disabled={loading}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            {plan.trial_days > 0 ? 'Start Free Trial' : 'Subscribe Now'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </span>
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Button>
  );
}
