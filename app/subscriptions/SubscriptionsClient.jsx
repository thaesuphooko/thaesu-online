'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Sparkles, Star, Users, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function SubscriptionsClient({ plans }) {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState(null);

  const handleSubscribe = async (planId) => {
    setLoadingPlan(planId);
    try {
      const res = await fetch('/api/subscription/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Successfully subscribed! 🎉', { duration: 3000 });
        router.push('/account/subscriptions');
      } else {
        toast.error(data.error || 'Subscription failed', { duration: 4000 });
      }
    } catch (e) {
      toast.error('Network error. Please try again.', { duration: 4000 });
    } finally {
      setLoadingPlan(null);
    }
  };

  // Empty state
  if (plans.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <AlertTriangle className="w-20 h-20 text-zinc-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white">No Subscription Plans Available</h2>
          <p className="text-zinc-400 mt-2">We’re working on exciting new boxes. Check back soon!</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-16 px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-amber-400 to-rose-500 bg-clip-text text-transparent mb-4">
          Monthly Subscription Boxes
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
          Discover hand‑picked products curated just for you. Delivered every month with joy.
        </p>
        <div className="flex justify-center gap-4 mt-6">
          <Badge variant="outline" className="px-4 py-2 text-sm gap-2 border-white/20">
            <Users className="w-4 h-4" /> {plans.length} plans available
          </Badge>
          <Badge variant="outline" className="px-4 py-2 text-sm gap-2 border-white/20">
            <Sparkles className="w-4 h-4" /> Free trials available
          </Badge>
        </div>
      </motion.div>

      {/* Plans Grid */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              layout
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-xl hover:border-purple-500/50 transition-all duration-500 group shadow-2xl shadow-purple-900/20">
                {/* Trial badge */}
                {plan.trial_days > 0 && (
                  <div className="absolute top-4 right-4 z-10">
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-lg">
                      {plan.trial_days}‑day free trial
                    </Badge>
                  </div>
                )}

                {/* Plan image */}
                {plan.image_url && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={plan.image_url}
                      alt={plan.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                    {plan.name}
                  </CardTitle>
                  <p className="text-sm text-zinc-400">{plan.description}</p>
                </CardHeader>

                <CardContent className="space-y-5">
                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">
                      ${Number(plan.price).toLocaleString()}
                    </span>
                    <span className="text-lg text-zinc-500">/{plan.interval.toLowerCase()}</span>
                  </div>

                  {/* Features list */}
                  <ul className="space-y-2">
                    {plan.box_products.map((bp) => (
                      <li key={bp.id} className="flex items-start gap-2 text-sm text-zinc-300">
                        <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                        <span>{bp.product.title} ×{bp.quantity}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Action */}
                  <Button
                    className="w-full h-12 text-lg gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/25 disabled:opacity-60"
                    disabled={loadingPlan === plan.id}
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    {loadingPlan === plan.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                    {plan.trial_days > 0 ? 'Start Free Trial' : 'Subscribe Now'}
                  </Button>

                  <p className="text-xs text-zinc-500 text-center">
                    {plan.trial_days > 0
                      ? 'No payment required for the trial period.'
                      : 'Cancel anytime. No long‑term commitment.'}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
