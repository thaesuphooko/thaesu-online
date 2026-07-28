'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  User, Mail, Lock, Phone, Eye, EyeOff, Check, AlertTriangle, Loader2, ArrowRight,
  Sparkles, ShieldCheck, Gift, ChevronLeft
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const nameRef = useRef(null);

  // Staggered animation for form children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.07, delayChildren: 0.2 },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120 } },
  };

  // Real-time validation
  const validateField = (field, value) => {
    switch (field) {
      case 'name': return !value.trim() ? 'Name is required' : value.trim().length < 2 ? 'Too short' : '';
      case 'email': return value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Invalid email' : '';
      case 'password': return value.length < 6 ? 'Min 6 characters' : '';
      case 'confirmPassword': return value !== password ? 'Passwords do not match' : '';
      case 'referralCode': return value && !/^[A-Za-z0-9]{4,10}$/.test(value) ? 'Invalid code' : '';
      case 'agreeTerms': return !agreeTerms ? 'You must agree to the terms' : '';
      default: return '';
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Revalidate fields on change
  useEffect(() => {
    const errors = {};
    if (touched.name) errors.name = validateField('name', name);
    if (touched.email) errors.email = validateField('email', email);
    if (touched.password) errors.password = validateField('password', password);
    if (touched.confirmPassword) errors.confirmPassword = validateField('confirmPassword', confirmPassword);
    if (touched.referralCode) errors.referralCode = validateField('referralCode', referralCode);
    if (touched.agreeTerms) errors.agreeTerms = validateField('agreeTerms', agreeTerms);
    setFormErrors(errors);
  }, [name, email, password, confirmPassword, referralCode, agreeTerms, touched]);

  const handleRegister = async (e) => {
    e.preventDefault();
    // Mark all fields touched
    const allTouched = { name: true, email: true, password: true, confirmPassword: true, agreeTerms: true, referralCode: true };
    setTouched(allTouched);
    // Revalidate
    const errors = {
      name: validateField('name', name),
      email: validateField('email', email),
      password: validateField('password', password),
      confirmPassword: validateField('confirmPassword', confirmPassword),
      referralCode: validateField('referralCode', referralCode),
      agreeTerms: validateField('agreeTerms', agreeTerms),
    };
    setFormErrors(errors);
    if (Object.values(errors).some(e => e)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          password,
          email: email || null,
          phone: phone || null,
          referral_code: referralCode || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setSuccess(true);
      toast.success('Account created! Welcome 🎉');
      setTimeout(() => router.push('/profile'), 2000);
    } catch (err) {
      toast.error(err.message);
      setLoading(false);
    }
  };

  // Password strength calculation
  const strength = password.length >= 8 ? 3 : password.length >= 6 ? 2 : password.length > 0 ? 1 : 0;
  const strengthColors = ['bg-zinc-700', 'bg-red-500', 'bg-yellow-500', 'bg-green-500'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Strong'];

  // If success, show minimal animation
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-purple-950/30 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
            className="mx-auto mb-4 w-16 h-16 bg-green-500 rounded-full flex items-center justify-center"
          >
            <Check className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-xl font-bold text-white">Account Created!</h2>
          <p className="text-zinc-400 mt-2">Redirecting to your profile…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-purple-950/30 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background subtle particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-500/30 rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ duration: 3 + Math.random() * 5, repeat: Infinity, delay: Math.random() * 2 }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-500/20 relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Create Account
          </h1>
          <p className="text-zinc-400 text-sm mt-2">Join Thaesu Online community</p>
        </div>

        {/* Form */}
        <motion.form
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          onSubmit={handleRegister}
          className="space-y-4"
        >
          {/* Name */}
          <motion.div variants={itemVariants} className="space-y-1">
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1">
              <User className="w-3 h-3" /> Full Name *
            </label>
            <div className="relative">
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => handleBlur('name')}
                placeholder="Enter your name"
                className={`w-full pl-3 pr-4 py-3 bg-black/30 border rounded-xl text-white placeholder-zinc-500 focus:border-purple-500 outline-none transition ${
                  formErrors.name && touched.name ? 'border-red-500' : 'border-white/10'
                }`}
              />
            </div>
            {formErrors.name && touched.name && (
              <p className="text-red-400 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {formErrors.name}</p>
            )}
          </motion.div>

          {/* Email */}
          <motion.div variants={itemVariants} className="space-y-1">
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email <span className="text-zinc-500">(optional)</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
                placeholder="you@example.com"
                className={`w-full pl-3 pr-4 py-3 bg-black/30 border rounded-xl text-white placeholder-zinc-500 focus:border-purple-500 outline-none transition ${
                  formErrors.email && touched.email ? 'border-red-500' : 'border-white/10'
                }`}
              />
            </div>
            {formErrors.email && touched.email && (
              <p className="text-red-400 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {formErrors.email}</p>
            )}
          </motion.div>

          {/* Phone */}
          <motion.div variants={itemVariants} className="space-y-1">
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1">
              <Phone className="w-3 h-3" /> Phone <span className="text-zinc-500">(optional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+959..."
                className="w-full pl-3 pr-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:border-purple-500 outline-none transition"
              />
            </div>
          </motion.div>

          {/* Referral Code */}
          <motion.div variants={itemVariants} className="space-y-1">
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1">
              <Gift className="w-3 h-3" /> Referral Code <span className="text-zinc-500">(optional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                onBlur={() => handleBlur('referralCode')}
                placeholder="Friend's code"
                className={`w-full pl-3 pr-4 py-3 bg-black/30 border rounded-xl text-white placeholder-zinc-500 focus:border-purple-500 outline-none transition ${
                  formErrors.referralCode && touched.referralCode ? 'border-red-500' : 'border-white/10'
                }`}
              />
            </div>
            {formErrors.referralCode && touched.referralCode && (
              <p className="text-red-400 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {formErrors.referralCode}</p>
            )}
          </motion.div>

          {/* Password */}
          <motion.div variants={itemVariants} className="space-y-1">
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur('password')}
                placeholder="Min 6 characters"
                className={`w-full pl-3 pr-12 py-3 bg-black/30 border rounded-xl text-white placeholder-zinc-500 focus:border-purple-500 outline-none transition ${
                  formErrors.password && touched.password ? 'border-red-500' : 'border-white/10'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && touched.password && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${strengthColors[strength]}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(strength / 3) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-400">{strengthLabels[strength]}</span>
              </div>
            )}
            {formErrors.password && touched.password && (
              <p className="text-red-400 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {formErrors.password}</p>
            )}
          </motion.div>

          {/* Confirm Password */}
          <motion.div variants={itemVariants} className="space-y-1">
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Confirm Password *
            </label>
            <div className="relative">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => handleBlur('confirmPassword')}
                placeholder="Re-enter password"
                className={`w-full pl-3 pr-4 py-3 bg-black/30 border rounded-xl text-white placeholder-zinc-500 focus:border-purple-500 outline-none transition ${
                  formErrors.confirmPassword && touched.confirmPassword ? 'border-red-500' : 'border-white/10'
                }`}
              />
            </div>
            {formErrors.confirmPassword && touched.confirmPassword && (
              <p className="text-red-400 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {formErrors.confirmPassword}</p>
            )}
          </motion.div>

          {/* Terms */}
          <motion.div variants={itemVariants} className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => setAgreeTerms(!agreeTerms)}
              onBlur={() => handleBlur('agreeTerms')}
              className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                agreeTerms ? 'bg-purple-600 border-purple-600' : 'border-zinc-500'
              }`}
            >
              {agreeTerms && <Check className="w-3 h-3 text-white" />}
            </button>
            <span className="text-xs text-zinc-400 pt-0.5">
              I agree to the <Link href="/terms" className="text-purple-400 hover:underline">Terms</Link> & <Link href="/privacy" className="text-purple-400 hover:underline">Privacy Policy</Link>
            </span>
          </motion.div>
          {formErrors.agreeTerms && touched.agreeTerms && (
            <p className="text-red-400 text-xs">{formErrors.agreeTerms}</p>
          )}

          {/* Submit */}
          <motion.div variants={itemVariants}>
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              {loading ? 'Creating Account...' : 'Create Account'}
            </motion.button>
          </motion.div>
        </motion.form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-zinc-400">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-purple-400 hover:underline font-semibold">
            Sign In
          </Link>
        </div>
        <p className="text-center text-xs text-zinc-500 mt-3">
          📌 Forgot password? Contact admin (1000 Ks fee)
        </p>
      </motion.div>
    </div>
  );
}
