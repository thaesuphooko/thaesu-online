'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  User, MapPin, Phone, Globe, Camera, Save, Loader2, ArrowLeft,
  Shield, AlertTriangle, CheckCircle2, Sparkles, Zap, Info
} from 'lucide-react';

// ---------- Utilities ----------
function getToken() { return localStorage.getItem('token'); }
function getUser() { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } }

// ---------- Initial State ----------
const initialForm = {
  full_name: '', email: '', phone: '', bio: '', website: '',
  avatar_url: '', cover_url: '',
  social: { facebook: '', instagram: '', twitter: '', tiktok: '' },
};

export default function SettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  // Load existing profile data
  useEffect(() => {
    const user = getUser();
    const token = getToken();
    if (!user || !token) {
      router.replace('/auth/login');
      return;
    }

    fetch(`/api/user/uid/${user.uid}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (res.status === 401) {
          localStorage.clear();
          router.replace('/auth/login');
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data?.user) {
          const u = data.user;
          setForm({
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
          });
        }
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [router]);

  // Form change handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('social.')) {
      const key = name.split('.')[1];
      setForm(prev => ({
        ...prev,
        social: { ...prev.social, [key]: value },
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
    // Clear error for the field
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // File upload handlers with preview
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };
  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Validation
  const validate = () => {
    const newErrors = {};
    if (form.full_name.trim().length < 2) newErrors.full_name = 'Name must be at least 2 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Invalid email format';
    if (form.phone && !/^\+?[0-9]{7,15}$/.test(form.phone.replace(/[\s-]/g, '')))
      newErrors.phone = 'Invalid phone number';
    if (form.website && !/^https?:\/\/.+/.test(form.website)) newErrors.website = 'Must be a valid URL';
    // Social link validation
    Object.entries(form.social).forEach(([key, val]) => {
      if (val && !/^https?:\/\/.+/.test(val)) newErrors[`social.${key}`] = 'Must be a valid URL';
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setSuccessMsg('');

    try {
      const token = getToken();
      if (!token) {
        toast.error('Session expired. Please login again.');
        router.replace('/auth/login');
        return;
      }

      // Upload images if changed
      if (avatarFile) {
        const fd = new FormData(); fd.append('file', avatarFile);
        const res = await fetch('/api/upload', { method: 'POST', body: fd, headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const { url } = await res.json();
          if (url) setForm(prev => ({ ...prev, avatar_url: url }));
        }
      }
      if (coverFile) {
        const fd = new FormData(); fd.append('file', coverFile);
        const res = await fetch('/api/upload', { method: 'POST', body: fd, headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const { url } = await res.json();
          if (url) setForm(prev => ({ ...prev, cover_url: url }));
        }
      }

      // Prepare update payload
      const payload = {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        bio: form.bio,
        website: form.website,
        avatar_url: form.avatar_url,
        cover_url: form.cover_url,
        social_links: {
          facebook: form.social.facebook,
          instagram: form.social.instagram,
          twitter: form.social.twitter,
          tiktok: form.social.tiktok,
        },
      };

      // Update profile
      const res = await fetch('/api/user/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Profile updated successfully! 🎉');
        setSuccessMsg('Your changes have been saved.');
        // Update local user data
        const localUser = getUser();
        if (localUser) {
          localUser.full_name = form.full_name;
          localUser.email = form.email;
          localStorage.setItem('user', JSON.stringify(localUser));
        }
        router.refresh();
        setTimeout(() => router.push('/profile'), 1500);
      } else if (res.status === 401) {
        localStorage.clear();
        router.replace('/auth/login');
        toast.error('Session expired. Please login again.');
      } else {
        toast.error(data.error || 'Update failed');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-purple-400 mx-auto" />
          <p className="mt-4 text-zinc-500">Loading profile…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-purple-950/30 text-white">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition backdrop-blur-md border border-white/10">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Edit Profile</h1>
        </motion.div>

        {/* Success Message */}
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-green-400">{successMsg}</span>
          </motion.div>
        )}

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-8"
        >
          {/* Avatar & Cover */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Avatar */}
            <div className="glass-card rounded-2xl p-5 border border-white/10 bg-white/5 backdrop-blur-xl">
              <label className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-400" /> Avatar
              </label>
              <div className="mt-3 flex items-center gap-4">
                <div className="relative">
                  <img
                    src={avatarPreview || form.avatar_url || '/default-avatar.png'}
                    className="w-20 h-20 rounded-full object-cover border-2 border-purple-500/50 shadow-lg shadow-purple-500/20"
                    onError={e => e.target.src = '/default-avatar.png'}
                  />
                  <label className="absolute bottom-0 right-0 bg-purple-600 rounded-full p-1.5 cursor-pointer hover:bg-purple-700 transition shadow-lg">
                    <Camera className="w-3.5 h-3.5 text-white" />
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Profile Photo</p>
                  <p className="text-xs text-zinc-500">PNG, JPG up to 5MB</p>
                </div>
              </div>
            </div>

            {/* Cover */}
            <div className="glass-card rounded-2xl p-5 border border-white/10 bg-white/5 backdrop-blur-xl">
              <label className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-400" /> Cover Image
              </label>
              <div className="mt-3">
                <div className="h-20 rounded-xl overflow-hidden bg-zinc-800 border border-white/10 relative">
                  <img
                    src={coverPreview || form.cover_url || ''}
                    className="w-full h-full object-cover"
                    onError={e => e.target.style.display = 'none'}
                  />
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition cursor-pointer">
                    <Camera className="w-6 h-6 text-white" />
                    <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Basic Info */}
          <section className="glass-card rounded-2xl p-6 border border-white/10 bg-white/5 backdrop-blur-xl space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-purple-400" /> Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-400">Full Name *</label>
                <input type="text" name="full_name" value={form.full_name} onChange={handleChange}
                  className={`mt-1 w-full bg-zinc-900/50 border ${errors.full_name ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-2.5 text-white focus:border-purple-500 outline-none transition`}
                  required />
                {errors.full_name && <p className="text-red-400 text-xs mt-1">{errors.full_name}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400">Email *</label>
                <input type="email" name="email" value={form.email} onChange={handleChange}
                  className={`mt-1 w-full bg-zinc-900/50 border ${errors.email ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-2.5 text-white focus:border-purple-500 outline-none transition`}
                  required />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400">Phone</label>
                <input type="text" name="phone" value={form.phone} onChange={handleChange}
                  className={`mt-1 w-full bg-zinc-900/50 border ${errors.phone ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-2.5 text-white focus:border-purple-500 outline-none transition`} />
                {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400">Website</label>
                <input type="url" name="website" value={form.website} onChange={handleChange}
                  className={`mt-1 w-full bg-zinc-900/50 border ${errors.website ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-2.5 text-white focus:border-purple-500 outline-none transition`} />
                {errors.website && <p className="text-red-400 text-xs mt-1">{errors.website}</p>}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400">Bio</label>
              <textarea name="bio" value={form.bio} onChange={handleChange} rows={3}
                className="mt-1 w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-purple-500 outline-none transition resize-none" />
            </div>
          </section>

          {/* Social Links */}
          <section className="glass-card rounded-2xl p-6 border border-white/10 bg-white/5 backdrop-blur-xl space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-400" /> Social Links
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'facebook', label: 'Facebook', color: 'text-blue-400', border: 'focus:border-blue-500', icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/facebook.svg' },
                { key: 'instagram', label: 'Instagram', color: 'text-pink-400', border: 'focus:border-pink-500', icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/instagram.svg' },
                { key: 'twitter', label: 'Twitter', color: 'text-blue-300', border: 'focus:border-blue-400', icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/x.svg' },
                { key: 'tiktok', label: 'TikTok', color: 'text-gray-300', border: 'focus:border-gray-400', icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/tiktok.svg' },
              ].map(social => (
                <div key={social.key}>
                  <label className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                    <img src={social.icon} className="w-3.5 h-3.5" alt="" />
                    <span className={social.color}>{social.label}</span>
                  </label>
                  <input type="text" name={`social.${social.key}`} value={form.social[social.key]}
                    onChange={handleChange} placeholder={`https://${social.key}.com/...`}
                    className={`mt-1 w-full bg-zinc-900/50 border ${errors[`social.${social.key}`] ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-2.5 text-white ${social.border} outline-none transition`} />
                  {errors[`social.${social.key}`] && <p className="text-red-400 text-xs mt-1">{errors[`social.${social.key}`]}</p>}
                </div>
              ))}
            </div>
          </section>

          {/* Save */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 rounded-xl font-semibold flex items-center gap-2 transition shadow-lg shadow-purple-500/25 text-white"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
