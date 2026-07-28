'use client';
import {
  useState, useEffect, useCallback, useMemo, useRef, useReducer
} from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import {
  User, Camera, Globe, Save, Loader2, ArrowLeft,
  ShieldCheck, Sparkles, Trash2, CheckCircle2,
  CloudUpload, AlertTriangle, Wifi, WifiOff, RefreshCw
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════
//  GOD MODE – INFINITY PREMIUM ULTRA MAX PROFILE SETTINGS
//  · Optimistic updates, real‑time sync, auto‑save drafts,
//  · Image upload with progress, glassmorphism, accessibility
// ═══════════════════════════════════════════════════════════

// ---------- Reducer for complex form state ----------
const formReducer = (state, action) => {
  switch (action.type) {
    case 'SET_FIELD': {
      const { name, value } = action.payload;
      if (name.startsWith('social.')) {
        const key = name.split('.')[1];
        return {
          ...state,
          social: { ...state.social, [key]: value },
        };
      }
      return { ...state, [name]: value };
    }
    case 'SET_FIELDS':
      return { ...state, ...action.payload };
    case 'CLEAR_FIELD_ERROR':
      return { ...state, errors: { ...state.errors, [action.payload]: undefined } };
    default:
      return state;
  }
};

const initialState = {
  full_name: '', email: '', phone: '', bio: '', website: '',
  avatar_url: '', cover_url: '',
  social: { facebook: '', instagram: '', twitter: '', tiktok: '' },
  errors: {},
};

// ---------- Utility functions ----------
const validateField = (name, value, social) => {
  if (social) {
    if (value && !/^https:\/\/.+/.test(value)) return 'Invalid URL';
    return null;
  }
  switch (name) {
    case 'full_name': return value.trim().length < 2 ? 'Must be at least 2 characters' : null;
    case 'email': {
      if (!value) return null;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Invalid email format';
    }
    case 'phone': return null; // can be anything
    case 'website': {
      if (!value) return null;
      try { new URL(value); return value.startsWith('https://') ? null : 'Must start with https://'; }
      catch { return 'Invalid URL'; }
    }
    default: return null;
  }
};

// ---------- Main Component ----------
export default function SettingsPage() {
  const router = useRouter();
  const [state, dispatch] = useReducer(formReducer, initialState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [uploading, setUploading] = useState({ avatar: false, cover: false });
  const [connectionStatus, setConnectionStatus] = useState('online'); // 'online' | 'offline'
  const [lastSaved, setLastSaved] = useState(null);
  const abortControllerRef = useRef(null);
  const draftTimerRef = useRef(null);
  const fileInputRefs = useRef({});
  const prefersReducedMotion = useReducedMotion();

  // ---------- Load profile ----------
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!token || !user.uid) {
      router.replace('/auth/login');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetch(`/api/user/uid/${user.uid}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        const u = data.user || {};
        dispatch({
          type: 'SET_FIELDS',
          payload: {
            full_name: u.full_name || '',
            email: u.email || '',
            phone: u.phone || '',
            bio: u.bio || '',
            website: u.website || '',
            avatar_url: u.avatar_url || '',
            cover_url: u.cover_url || '',
            social: {
              facebook: u.social_links?.facebook || '',
              instagram: u.social_links?.instagram || '',
              twitter: u.social_links?.twitter || '',
              tiktok: u.social_links?.tiktok || '',
            },
          },
        });
        setLastSaved(new Date());
      })
      .catch(err => {
        if (err.name !== 'AbortError') toast.error('Failed to load profile');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [router]);

  // ---------- Real‑time socket listener (if available) ----------
  useEffect(() => {
    const socket = global.io; // custom global socket.io instance
    if (!socket) return;

    const handleProfileUpdate = (data) => {
      if (data?.user) {
        dispatch({ type: 'SET_FIELDS', payload: { ...data.user, social: data.user.social_links || {} } });
        toast.info('Profile updated from another device');
      }
    };
    socket.on('profile:updated', handleProfileUpdate);
    return () => socket.off('profile:updated', handleProfileUpdate);
  }, []);

  // ---------- Connection status ----------
  useEffect(() => {
    const check = () => {
      setConnectionStatus(navigator.onLine ? 'online' : 'offline');
    };
    window.addEventListener('online', check);
    window.addEventListener('offline', check);
    return () => {
      window.removeEventListener('online', check);
      window.removeEventListener('offline', check);
    };
  }, []);

  // ---------- Auto‑save draft every 5 seconds ----------
  useEffect(() => {
    draftTimerRef.current = setInterval(() => {
      const draft = {
        full_name: state.full_name,
        email: state.email,
        phone: state.phone,
        bio: state.bio,
        website: state.website,
        social: state.social,
      };
      localStorage.setItem('profile_draft', JSON.stringify(draft));
    }, 5000);
    return () => clearInterval(draftTimerRef.current);
  }, [state]);

  // Restore draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('profile_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        dispatch({ type: 'SET_FIELDS', payload: parsed });
        toast('Draft restored');
      } catch {}
    }
  }, []);

  // ---------- Input change handler ----------
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    dispatch({ type: 'SET_FIELD', payload: { name, value } });
    // Live validation & clear error
    const socialKey = name.startsWith('social.') ? name.split('.')[1] : null;
    const err = validateField(name, value, socialKey);
    if (!err) {
      dispatch({ type: 'CLEAR_FIELD_ERROR', payload: name });
    }
  }, []);

  // ---------- File upload to Cloudinary ----------
  const uploadFile = async (file, type) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token');
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data.url;
  };

  const handleFileChange = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = () => {
      if (type === 'avatar') setAvatarPreview(reader.result);
      else setCoverPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(prev => ({ ...prev, [type]: true }));
    try {
      const url = await uploadFile(file, type);
      if (type === 'avatar') {
        dispatch({ type: 'SET_FIELD', payload: { name: 'avatar_url', value: url } });
      } else {
        dispatch({ type: 'SET_FIELD', payload: { name: 'cover_url', value: url } });
      }
      toast.success(`${type === 'avatar' ? 'Avatar' : 'Cover'} uploaded!`);
    } catch (err) {
      toast.error(`Failed to upload ${type}`);
      // Reset preview
      if (type === 'avatar') setAvatarPreview(null);
      else setCoverPreview(null);
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  // ---------- Form submission (optimistic) ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    // Full validation
    const errors = {};
    if (!state.full_name.trim()) errors.full_name = 'Full name is required';
    else if (state.full_name.trim().length < 2) errors.full_name = 'Too short';
    if (state.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) errors.email = 'Invalid email';
    if (state.website) {
      try { new URL(state.website); if (!state.website.startsWith('https://')) errors.website = 'Must start with https://'; }
      catch { errors.website = 'Invalid URL'; }
    }
    Object.entries(state.social).forEach(([key, val]) => {
      if (val && !/^https:\/\/.+/.test(val)) errors[`social.${key}`] = 'Invalid URL';
    });
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'SET_FIELDS', payload: { errors } });
      toast.error('Please fix validation errors');
      return;
    }

    setSaving(true);
    // Optimistic: clear errors and mark as saving
    dispatch({ type: 'SET_FIELDS', payload: { errors: {} } });

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Session expired');
      router.replace('/auth/login');
      setSaving(false);
      return;
    }

    const payload = {
      full_name: state.full_name,
      email: state.email || null,
      phone: state.phone,
      bio: state.bio,
      website: state.website,
      avatar_url: state.avatar_url,
      cover_url: state.cover_url,
      social_links: {
        facebook: state.social.facebook,
        instagram: state.social.instagram,
        twitter: state.social.twitter,
        tiktok: state.social.tiktok,
      },
    };

    try {
      const res = await fetch('/api/user/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Update failed');
      }

      // Update localStorage user
      const localUser = JSON.parse(localStorage.getItem('user'));
      if (localUser) {
        localUser.full_name = data.user.full_name;
        if (data.user.email) localUser.email = data.user.email;
        localStorage.setItem('user', JSON.stringify(localUser));
      }
      localStorage.removeItem('profile_draft');
      toast.success('Profile updated successfully! 🎉');
      setLastSaved(new Date());
      router.refresh();
      setTimeout(() => router.push('/profile'), 1000);
    } catch (err) {
      toast.error(err.message);
      // Rollback optimistic changes? Not needed because we only cleared errors.
    } finally {
      setSaving(false);
    }
  };

  // ---------- Animation variants ----------
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  // ---------- Loading skeleton ----------
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto" />
          <p className="mt-4 text-zinc-400">Loading profile…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-purple-950/30 text-white selection:bg-purple-500/30">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header with connection status */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition focus-visible:outline-2 focus-visible:outline-purple-500"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Edit Profile
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {connectionStatus === 'online' ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <span className="text-xs text-zinc-500">{lastSaved ? `Last saved ${lastSaved.toLocaleTimeString()}` : ''}</span>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit}>
          {/* Avatar & Cover Section */}
          <motion.section variants={fadeUp} layout className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Avatar */}
            <div className="glass-card rounded-2xl p-5 border border-white/10 bg-white/5 backdrop-blur-xl hover:shadow-purple-500/10 transition-shadow">
              <label className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-400" /> Avatar
              </label>
              <div className="mt-3 flex items-center gap-4">
                <div className="relative">
                  <img
                    src={avatarPreview || state.avatar_url || '/default-avatar.png'}
                    alt="Avatar preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-purple-500/50 shadow-lg shadow-purple-500/20"
                    onError={e => e.target.src = '/default-avatar.png'}
                  />
                  <label className="absolute bottom-0 right-0 bg-purple-600 rounded-full p-1.5 cursor-pointer hover:bg-purple-700 transition shadow-lg focus-within:ring-2 ring-purple-300"
                    aria-label="Upload avatar"
                  >
                    {uploading.avatar ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <Camera className="w-3.5 h-3.5 text-white" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleFileChange(e, 'avatar')}
                      className="hidden"
                      ref={el => fileInputRefs.current.avatar = el}
                    />
                  </label>
                </div>
                <div className="text-xs text-zinc-500">
                  <p>Click to upload</p>
                  <p>PNG, JPG up to 5MB</p>
                </div>
              </div>
            </div>

            {/* Cover */}
            <div className="glass-card rounded-2xl p-5 border border-white/10 bg-white/5 backdrop-blur-xl hover:shadow-purple-500/10 transition-shadow">
              <label className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-400" /> Cover Image
              </label>
              <div className="mt-3">
                <div className="h-20 rounded-xl overflow-hidden bg-zinc-800 border border-white/10 relative">
                  <img
                    src={coverPreview || state.cover_url || ''}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                    onError={e => e.target.style.display = 'none'}
                  />
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition cursor-pointer group">
                    {uploading.cover ? (
                      <Loader2 className="w-6 h-6 animate-spin text-white" />
                    ) : (
                      <CloudUpload className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleFileChange(e, 'cover')}
                      className="hidden"
                      ref={el => fileInputRefs.current.cover = el}
                    />
                  </label>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Basic Information */}
          <motion.section layout variants={fadeUp} className="glass-card rounded-2xl p-6 border border-white/10 bg-white/5 backdrop-blur-xl mb-8 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-purple-400" /> Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="full_name" className="text-xs font-medium text-zinc-400">Full Name *</label>
                <input
                  id="full_name"
                  name="full_name"
                  value={state.full_name}
                  onChange={handleChange}
                  className={`mt-1 w-full bg-zinc-900/50 border rounded-xl px-4 py-2.5 text-white focus:border-purple-500 outline-none transition-colors ${
                    state.errors.full_name ? 'border-red-500' : 'border-white/10'
                  }`}
                  aria-describedby="full_name-error"
                  aria-required="true"
                />
                {state.errors.full_name && (
                  <p id="full_name-error" className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {state.errors.full_name}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="email" className="text-xs font-medium text-zinc-400">Email <span className="text-zinc-500">(optional)</span></label>
                <input
                  id="email"
                  name="email"
                  value={state.email}
                  onChange={handleChange}
                  type="email"
                  className={`mt-1 w-full bg-zinc-900/50 border rounded-xl px-4 py-2.5 text-white focus:border-purple-500 outline-none ${
                    state.errors.email ? 'border-red-500' : 'border-white/10'
                  }`}
                  aria-describedby="email-error"
                />
                {state.errors.email && (
                  <p id="email-error" className="text-red-400 text-xs mt-1">{state.errors.email}</p>
                )}
              </div>
              <div>
                <label htmlFor="phone" className="text-xs font-medium text-zinc-400">Phone</label>
                <input
                  id="phone"
                  name="phone"
                  value={state.phone}
                  onChange={handleChange}
                  className="mt-1 w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-purple-500 outline-none"
                />
              </div>
              <div>
                <label htmlFor="website" className="text-xs font-medium text-zinc-400">Website</label>
                <input
                  id="website"
                                    name="website"
                  value={state.website}
                  onChange={handleChange}
                  type="url"
                  className={`mt-1 w-full bg-zinc-900/50 border rounded-xl px-4 py-2.5 text-white focus:border-purple-500 outline-none ${
                    state.errors.website ? 'border-red-500' : 'border-white/10'
                  }`}
                  aria-describedby="website-error"
                />
                {state.errors.website && (
                  <p id="website-error" className="text-red-400 text-xs mt-1">{state.errors.website}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label htmlFor="bio" className="text-xs font-medium text-zinc-400">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  value={state.bio}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-purple-500 outline-none resize-none"
                />
              </div>
            </div>
          </motion.section>

          {/* Social Links */}
          <motion.section layout variants={fadeUp} className="glass-card rounded-2xl p-6 border border-white/10 bg-white/5 backdrop-blur-xl mb-8 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-400" /> Social Links
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['facebook', 'instagram', 'twitter', 'tiktok'].map(social => (
                <div key={social}>
                  <label htmlFor={`social_${social}`} className="text-xs font-medium text-zinc-400 capitalize">
                    {social}
                  </label>
                  <input
                    id={`social_${social}`}
                    name={`social.${social}`}
                    value={state.social[social]}
                    onChange={handleChange}
                    placeholder={`https://${social}.com/...`}
                    className={`mt-1 w-full bg-zinc-900/50 border rounded-xl px-4 py-2.5 text-white focus:border-purple-500 outline-none ${
                      state.errors[`social.${social}`] ? 'border-red-500' : 'border-white/10'
                    }`}
                    aria-describedby={`social_${social}-error`}
                  />
                  {state.errors[`social.${social}`] && (
                    <p id={`social_${social}-error`} className="text-red-400 text-xs mt-1">
                      {state.errors[`social.${social}`]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.section>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-medium hover:bg-white/10 transition"
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              disabled={saving || connectionStatus !== 'online'}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-purple-500/25 transition ${
                saving || connectionStatus !== 'online' ? 'opacity-50 cursor-not-allowed' : 'hover:from-purple-700 hover:to-pink-700'
              }`}
              aria-busy={saving}
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {saving ? 'Saving…' : 'Save Changes'}
            </motion.button>
          </div>
        </form>
      </div>
    </div>
  );
}
