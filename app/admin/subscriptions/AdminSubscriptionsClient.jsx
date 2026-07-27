'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card, CardContent, CardHeader, CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Crown, DollarSign, Users, Edit3, PlusCircle, Power, PowerOff, Trash2, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createPlan, updatePlan, togglePlanActive, deletePlan
} from './actions';

export default function AdminSubscriptionsClient({ plans: initialPlans, totalActive, totalRevenue }) {
  const [plans, setPlans] = useState(initialPlans);
  const [editingPlan, setEditingPlan] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const refreshData = () => window.location.reload(); // Alternatively, use router.refresh()

  const handleSave = async (formData) => {
    setSubmitting(true);
    try {
      if (editingPlan) {
        await updatePlan(formData);
        toast.success('Plan updated');
      } else {
        await createPlan(formData);
        toast.success('Plan created');
      }
      setEditingPlan(null);
      setIsCreating(false);
      refreshData();
    } catch (err) {
      toast.error('Operation failed');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (planId) => {
    try {
      const formData = new FormData();
      formData.append('id', planId);
      await togglePlanActive(formData);
      toast.success('Plan status toggled');
      refreshData();
    } catch (err) {
      toast.error('Failed to toggle');
    }
  };

  const handleDelete = async (planId) => {
    try {
      setIsDeleting(planId);
      const formData = new FormData();
      formData.append('id', planId);
      await deletePlan(formData);
      toast.success('Plan deleted');
      refreshData();
    } catch (err) {
      toast.error('Delete failed');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard icon={<Crown className="w-10 h-10 text-yellow-400" />} label="Total Plans" value={plans.length} gradient="from-purple-900/50 to-pink-900/50" border="border-purple-500/30" />
        <StatsCard icon={<Users className="w-10 h-10 text-cyan-400" />} label="Active Subscribers" value={totalActive} gradient="from-blue-900/50 to-cyan-900/50" border="border-blue-500/30" />
        <StatsCard icon={<DollarSign className="w-10 h-10 text-emerald-400" />} label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} gradient="from-green-900/50 to-emerald-900/50" border="border-green-500/30" />
      </div>

      {/* Create Button */}
      <div className="flex justify-end">
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <PlusCircle className="w-4 h-4" /> Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Plan</DialogTitle>
            </DialogHeader>
            <PlanForm onSubmit={handleSave} submitting={submitting} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="relative overflow-hidden group border-white/10 hover:border-purple-500/40 transition-all duration-300 bg-black/30 backdrop-blur-md">
                {/* Active Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <Badge className={plan.is_active ? 'bg-green-600 hover:bg-green-700' : 'bg-zinc-600'}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {/* Image */}
                {plan.image_url && (
                  <div className="h-40 overflow-hidden rounded-t-xl">
                    <img
                      src={plan.image_url}
                      alt={plan.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Crown className="w-5 h-5 text-purple-400" />
                    {plan.name}
                  </CardTitle>
                  <p className="text-sm text-zinc-400">{plan.description}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold">${parseFloat(plan.price).toLocaleString()}</span>
                    <span className="text-sm text-zinc-500">/{plan.interval}</span>
                  </div>

                  {/* Statistics Mini Cards */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <StatBadge value={plan.active_subscribers} label="Active" color="text-purple-400" />
                    <StatBadge value={plan.canceled_subscribers} label="Canceled" color="text-red-400" />
                    <StatBadge value={`$${parseFloat(plan.total_revenue).toLocaleString()}`} label="Revenue" color="text-green-400" />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setEditingPlan(plan)}
                        >
                          <Edit3 className="w-4 h-4 mr-1" /> Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>Edit Plan</DialogTitle>
                        </DialogHeader>
                        <PlanForm
                          initialData={plan}
                          onSubmit={handleSave}
                          submitting={submitting}
                        />
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggle(plan.id)}
                      title={plan.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {plan.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this plan?'))
                          handleDelete(plan.id);
                      }}
                      disabled={isDeleting === plan.id}
                    >
                      {isDeleting === plan.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Reusable Components ───

function StatsCard({ icon, label, value, gradient, border }) {
  return (
    <Card className={`bg-gradient-to-br ${gradient} ${border}`}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="text-sm text-zinc-400">{label}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatBadge({ value, label, color }) {
  return (
    <div className="bg-zinc-800/60 rounded-lg p-2">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

// ─── Plan Form (used for Create & Edit) ───
function PlanForm({ initialData, onSubmit, submitting }) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [price, setPrice] = useState(initialData?.price ? parseFloat(initialData.price) : '');
  const [interval, setInterval] = useState(initialData?.interval || 'MONTHLY');
  const [trialDays, setTrialDays] = useState(initialData?.trial_days || 0);
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || '');
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    if (initialData?.id) formData.append('id', initialData.id);
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input id="name" name="name" value={name} onChange={e => setName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">Price *</Label>
          <Input id="price" name="price" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="interval">Interval</Label>
          <Select name="interval" defaultValue={interval} onValueChange={setInterval}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="YEARLY">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="trial_days">Trial Days</Label>
          <Input id="trial_days" name="trial_days" type="number" value={trialDays} onChange={e => setTrialDays(e.target.value)} />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="is_active" checked={isActive} onChange={e => setIsActive(e.target.checked)} value="true" className="w-4 h-4" />
            <span className="text-sm">Active</span>
          </label>
        </div>
      </div>
      <div>
        <Label htmlFor="image_url">Image URL</Label>
        <Input id="image_url" name="image_url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        {initialData ? 'Update Plan' : 'Create Plan'}
      </Button>
    </form>
  );
}
