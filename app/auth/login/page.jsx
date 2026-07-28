'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  User, Lock, Eye, EyeOff, LogIn, Loader2, ArrowRight,
  Mail, Phone, Fingerprint, MessageCircle
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('password'); // 'password' or 'otp'
  const formRef = useRef(null);
  const loginInputRef = useRef(null);

  // Load remembered login on mount (corrected)
  useEffect(() => {
    const remembered = localStorage.getItem('remembered_login');
    if (remembered) {
      setLogin(remembered);
      setRememberMe(true);
    }
  }, []);

  // Shake animation for error
  const shakeVariants = {
    hidden: { x: 0 },
    shake: {
      x: [-10, 10, -10, 10, -5, 5, -2, 2, 0],
      transition: { duration: 0.5 }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!login) {
      setError('Please enter your username, email, or phone number.');
      return;
    }
    if (activeTab === 'password' && !password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = activeTab === 'otp' ? '/api/auth/request-otp' : '/api/auth/login';
      const body = activeTab === 'otp' 
        ? { phone: login } 
        : { login, password, remember_me: rememberMe };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Login failed');

      if (activeTab === 'otp') {
        // OTP sent successfully
        toast.success('OTP sent to your phone!');
        // Here you would switch to an OTP input field
        // For now, we just show success
        setActiveTab('otp-verify');
        return;
      }

      // Normal login success
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (rememberMe) {
        localStorage.setItem('remembered_login', login);
      } else {
        localStorage.removeItem('remembered_login');
      }
      toast.success(`Welcome back, ${data.user.name || 'User'}!`);
      router.push('/profile');
    } catch (err) {
      setError(err.message);
      // Trigger shake animation
      if (formRef.current) {
        formRef.current.classList.add('shake');
        setTimeout(() => formRef.current.classList.remove('shake'), 500);
      }
    } finally {
      setLoading(false);
    }
  };

  // Floating label logic
  const [focusedField, setFocusedField] = useState(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.2 }
    }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120 } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-purple-950/30 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <motion.div
        ref={formRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
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
            <LogIn className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-zinc-400 text-sm mt-2">Sign in to continue</p>
        </div>

        {/* Login Method Tabs */}
        <div className="flex mb-6 bg-black/20 rounded-xl p-1 border border-white/5">
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'password' 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Password
          </button>
          <button
            onClick={() => setActiveTab('otp')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'otp' 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            OTP / Phone
          </button>
        </div>

        {/* Error Message with Shake */}
        <AnimatePresence>
          {error && (
            <motion.div
              variants={shakeVariants}
              initial="hidden"
              animate="shake"
              exit="hidden"
              className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <motion.form
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          onSubmit={handleLogin}
          className="space-y-5"
        >
          {/* Login field */}
          <motion.div variants={itemVariants} className="space-y-1">
            <div className="relative">
              <input
                ref={loginInputRef}
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                onFocus={() => setFocusedField('login')}
                onBlur={() => setFocusedField(null)}
                placeholder=" "
                className="w-full px-4 pt-5 pb-2 bg-black/30 border border-white/10 rounded-xl text-white placeholder-transparent focus:border-purple-500 outline-none transition peer"
              />
              <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                login || focusedField === 'login' 
                  ? 'top-2 text-xs text-purple-400' 
                  : 'top-3.5 text-sm text-zinc-500'
              }`}>
                {activeTab === 'otp' ? 'Phone Number' : 'Username, Email, or User ID'}
              </label>
              {activeTab === 'otp' ? (
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              ) : (
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              )}
            </div>
          </motion.div>

          {/* Password field (only in password tab) */}
          <AnimatePresence mode="wait">
            {activeTab === 'password' && (
              <motion.div
                key="password-field"
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="space-y-1"
              >
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder=" "
                    className="w-full px-4 pt-5 pb-2 pr-12 bg-black/30 border border-white/10 rounded-xl text-white placeholder-transparent focus:border-purple-500 outline-none transition peer"
                  />
                  <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                    password || focusedField === 'password' 
                      ? 'top-2 text-xs text-purple-400' 
                      : 'top-3.5 text-sm text-zinc-500'
                  }`}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Biometric placeholder (future) */}
          <motion.div variants={itemVariants} className="flex justify-center">
            <button
              type="button"
              onClick={() => toast('Biometric login coming soon!')}
              className="flex items-center gap-2 text-xs text-zinc-500 hover:text-purple-400 transition"
            >
              <Fingerprint className="w-4 h-4" />
              Use Biometrics
            </button>
          </motion.div>

          {/* Remember Me + Forgot Password */}
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${
                  rememberMe ? 'bg-purple-600 border-purple-600' : 'border-zinc-500'
                }`}
              >
                {rememberMe && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span className="text-xs text-zinc-400">Remember me</span>
            </div>
            <Link href="/auth/forgot-password" className="text-xs text-purple-400 hover:underline">
              Forgot Password?
            </Link>
          </motion.div>

          {/* Submit Button */}
          <motion.div variants={itemVariants}>
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              {loading 
                ? (activeTab === 'otp' ? 'Sending OTP...' : 'Signing In...') 
                : (activeTab === 'otp' ? 'Send OTP' : 'Sign In')
              }
            </motion.button>
          </motion.div>
        </motion.form>

        {/* Social Login (enhanced) */}
        <div className="mt-6">
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-zinc-950/30 text-zinc-500">or continue with</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button className="py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-zinc-400 hover:bg-white/10 hover:scale-105 transition-all flex items-center justify-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
              Google
            </button>
            <button className="py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-zinc-400 hover:bg-white/10 hover:scale-105 transition-all flex items-center justify-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
              Facebook
            </button>
            <button className="py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-zinc-400 hover:bg-white/10 hover:scale-105 transition-all flex items-center justify-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M6.5 2h11A4.5 4.5 0 0122 6.5v11a4.5 4.5 0 01-4.5 4.5h-11A4.5 4.5 0 012 17.5v-11A4.5 4.5 0 016.5 2zM12 7a5 5 0 100 10 5 5 0 000-10zm0 8a3 3 0 110-6 3 3 0 010 6zm5.5-8.5a1 1 0 100-2 1 1 0 000 2z"/></svg>
              Instagram
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-zinc-400 mt-6">
          Don't have an account?{' '}
          <Link href="/auth/register" className="text-purple-400 hover:underline font-semibold">
            Create one
          </Link>
        </p>
        <p className="text-center text-xs text-zinc-500 mt-3">
          📌 Forgot password? Contact admin (1000 Ks fee)
        </p>
      </motion.div>

      {/* Add shake animation to global styles */}
      <style jsx global>{`
        .shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>
    </div>
  );
}
