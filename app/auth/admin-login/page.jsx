'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import {
  ShieldCheck, Loader2, ArrowRight, Smartphone, Lock, AlertTriangle, CheckCircle2, Eye, EyeOff
} from 'lucide-react';

// ─── Network retry helper with abort ──────────────────────
const fetchWithRetry = async (url, options = {}, retries = 2) => {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { ...options });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed with status ${res.status}`);
      return data;
    } catch (err) {
      lastError = err;
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastError;
};

// ─── XSS sanitizer ────────────────────
const sanitize = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
};

// ─── Fire confetti burst ──────────────────────
const fireConfetti = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#a855f7', '#ec4899', '#f59e0b'],
  });
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fallbackOtp, setFallbackOtp] = useState('');
  const [lockoutMessage, setLockoutMessage] = useState('');
  const passwordRef = useRef(null);
  const otpRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handlePasswordSubmit = useCallback(async (e) => {
    e.preventDefault();
    const cleanedPassword = sanitize(password);
    if (cleanedPassword.length < 4) {
      setError('Password must be at least 4 characters');
      passwordRef.current?.focus();
      return;
    }
    setLoading(true);
    setError('');
    setLockoutMessage('');
    try {
      const data = await fetchWithRetry('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanedPassword }),
        signal: abortControllerRef.current?.signal,
      });

      if (data.master) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        fireConfetti();
        toast.success('Welcome, Master Admin!');
        router.push('/dashboard');
      } else {
        if (data.otpFallback && data.otp) {
          setFallbackOtp(data.otp);
          toast.info('Telegram not reachable. OTP is shown below.');
        }
        setStep(2);
        toast.success('Password verified. Enter the OTP.');
        setTimeout(() => otpRef.current?.focus(), 100);
      }
    } catch (err) {
      setError(err.message);
      passwordRef.current?.focus();
      if (err.message.includes('Too many attempts') || err.message.includes('locked')) {
        setLockoutMessage('Account temporarily locked. Please wait a few minutes.');
      }
    } finally {
      setLoading(false);
    }
  }, [password]);

  const handleOtpSubmit = useCallback(async (e) => {
    e.preventDefault();
    const cleanedOtp = otp.replace(/\D/g, '');
    if (cleanedOtp.length !== 6) {
      setError('OTP must be exactly 6 digits');
      otpRef.current?.focus();
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await fetchWithRetry('/api/auth/admin-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: cleanedOtp }),
        signal: abortControllerRef.current?.signal,
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      fireConfetti();
      toast.success('Admin verified!');
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
      otpRef.current?.focus();
      if (err.message.includes('Invalid OTP') || err.message.includes('expired')) {
        setFallbackOtp(''); // Clear fallback if invalid
      }
    } finally {
      setLoading(false);
    }
  }, [otp]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-purple-950/30 flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-500/30 rounded-full"
            style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }}
            animate={{ y: [0, -20, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3 + Math.random() * 5, repeat: Infinity, delay: Math.random() * 2 }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-500/20 relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30"
          >
            <ShieldCheck className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Admin Access
          </h1>
          <p className="text-zinc-400 text-sm mt-2">
            {step === 1 ? 'Enter your admin password' : 'Enter the 6‑digit OTP'}
          </p>
        </div>

        {/* Lockout banner */}
        <AnimatePresence>
          {lockoutMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2 text-sm text-yellow-400"
              role="alert"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{lockoutMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-sm text-red-400"
              role="alert"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.form
              key="password-step"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              onSubmit={handlePasswordSubmit}
              className="space-y-4"
            >
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full pl-10 pr-12 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                {loading ? 'Verifying...' : 'Continue'}
              </motion.button>
            </motion.form>
          ) : (
            <motion.form
              key="otp-step"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              onSubmit={handleOtpSubmit}
              className="space-y-4"
            >
              {fallbackOtp && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-center">
                  <p className="text-sm text-yellow-400 mb-1">Your OTP (Telegram not reachable):</p>
                  <p className="text-3xl font-mono font-bold text-yellow-300 tracking-widest">{fallbackOtp}</p>
                </div>
              )}
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  ref={otpRef}
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full pl-10 pr-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none transition text-center tracking-widest text-2xl"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>
              <motion.button
                type="submit"
                disabled={loading || otp.length !== 6}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {loading ? 'Verifying...' : 'Verify & Login'}
              </motion.button>
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); }}
                className="w-full text-center text-sm text-zinc-400 hover:text-white transition"
              >
                ← Back to password
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
