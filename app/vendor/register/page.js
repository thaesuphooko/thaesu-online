'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VendorRegister() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    store_name: '',
    store_slug: '',
    token: '' // လောလောဆယ် Admin Token မရှိရင်
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Register user as vendor role (reuse our register API or custom)
    const res1 = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: 'vendor'
      })
    });
    if (!res1.ok) {
      const err = await res1.json();
      alert('Register failed: ' + err.error);
      setLoading(false);
      return;
    }
    const userData = await res1.json();
    const userToken = userData.token;

    // 2. Create vendor store
    const res2 = await fetch('/api/vendor/create-store', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        store_name: form.store_name,
        store_slug: form.store_slug,
      })
    });
    if (!res2.ok) {
      const err = await res2.json();
      alert('Store creation failed: ' + err.error);
      setLoading(false);
      return;
    }

    alert('Shop registered successfully!');
    router.push('/dashboard'); // or a vendor dashboard
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-card p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">ဆိုင်ဖွင့်မယ်</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Email" required className="w-full p-2 border rounded" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
          <input type="password" placeholder="Password" required className="w-full p-2 border rounded" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} />
          <input type="text" placeholder="Full Name" required className="w-full p-2 border rounded" value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} />
          <input type="text" placeholder="Store Name" required className="w-full p-2 border rounded" value={form.store_name} onChange={(e) => setForm({...form, store_name: e.target.value})} />
          <input type="text" placeholder="Store Slug (e.g., my-shop)" required className="w-full p-2 border rounded" value={form.store_slug} onChange={(e) => setForm({...form, store_slug: e.target.value})} />
          <button type="submit" disabled={loading} className="w-full py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition disabled:opacity-50">
            {loading ? 'Registering...' : 'ဆိုင်ဖွင့်မယ်'}
          </button>
        </form>
      </div>
    </div>
  );
}
