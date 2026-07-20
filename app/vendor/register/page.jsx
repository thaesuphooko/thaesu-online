"use client";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Store, Mail, Lock, User, Globe, ArrowRight, Sparkles } from "lucide-react";

export default function VendorRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", full_name: "", store_name: "", store_slug: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const slugRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === "store_name") {
      const slug = value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      setForm(prev => ({ ...prev, store_slug: slug }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password, full_name: form.full_name, role: "vendor", store_name: form.store_name, store_slug: form.store_slug })
      });
      const data = await res.json();
      if (res.ok) { router.push("/vendor/dashboard"); } else { setError(data.error || "Registration failed"); }
    } catch (err) { setError("Network error"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl shadow-purple-500/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30 mb-4"><Store className="w-8 h-8 text-white" /></div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">ဆိုင်ဖွင့်မယ်</h1>
            <p className="text-gray-400 text-sm mt-2">Open your own store and start selling</p>
          </div>
          {error && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">{error}</motion.div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" /><input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition" /></div>
            <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" /><input type="password" name="password" placeholder="Password (min 8 characters)" value={form.password} onChange={handleChange} required minLength={8} className="w-full pl-10 pr-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition" /></div>
            <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" /><input type="text" name="full_name" placeholder="Full Name" value={form.full_name} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition" /></div>
            <div className="relative"><Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" /><input type="text" name="store_name" placeholder="Store Name" value={form.store_name} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition" /></div>
            <div className="relative"><Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" /><input type="text" name="store_slug" ref={slugRef} placeholder="Store Slug (e.g., my-shop)" value={form.store_slug} onChange={handleChange} required className="w-full pl-10 pr-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition" /></div>
            <p className="text-xs text-gray-500 mt-1 ml-1">This will be your store URL: /vendor/{form.store_slug || "my-shop"}</p>
            <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Sparkles className="w-5 h-5" /> ဆိုင်ဖွင့်မယ် <ArrowRight className="w-5 h-5" /></>}
            </motion.button>
          </form>
          <p className="text-center text-sm text-gray-400 mt-6">Already have a store? <Link href="/vendor/login" className="text-purple-400 hover:underline">Sign in</Link></p>
        </div>
      </motion.div>
    </div>
  );
}
