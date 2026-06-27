'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Store, Settings, LogOut, LogIn } from 'lucide-react';

export default function ProfilePage() {
  const [token, setToken] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
    if (savedToken) fetchProfile(savedToken);
    else setLoading(false);
  }, []);

  const fetchProfile = async (tok) => {
    try {
      const res = await fetch('/api/user/profile', { headers: { Authorization: `Bearer ${tok}` } });
      if (res.ok) setProfile(await res.json());
    } catch (e) {}
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div></div>;

  // Not logged in
  if (!token || !profile) {
    return (
      <div className="max-w-md mx-auto p-4 py-8 animate-fadeIn text-center space-y-6">
        <h1 className="text-3xl font-bold">Profile</h1>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-muted-foreground">You are not logged in.</p>
            <div className="flex gap-4 justify-center">
              <Link href="/auth/login">
                <Button variant="default" className="gap-2"><LogIn className="w-4 h-4" /> Login</Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="outline">Register</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Logged in profile view (existing)
  const isVendorOrAdmin = profile.role === 'vendor' || profile.role === 'admin';
  return (
    <div className="max-w-2xl mx-auto p-4 py-8 animate-fadeIn space-y-6">
      <Card className="text-center">
        <CardContent className="pt-6">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary mx-auto mb-4">{profile.full_name?.[0] || profile.email[0].toUpperCase()}</div>
          <h2 className="text-2xl font-bold">{profile.full_name || profile.email}</h2>
          <p className="text-muted-foreground text-sm">{profile.email}</p>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:shadow-glass-hover transition-all"><CardContent className="p-4 flex items-center gap-4"><Heart className="w-8 h-8 text-rose-500" /><div className="flex-1"><h3 className="font-semibold">Wishlist</h3></div><Button variant="glass" size="sm" onClick={() => router.push('/wishlist')}>View</Button></CardContent></Card>
        {isVendorOrAdmin && <Card className="hover:shadow-glass-hover transition-all"><CardContent className="p-4 flex items-center gap-4"><Store className="w-8 h-8 text-emerald-500" /><div className="flex-1"><h3 className="font-semibold">Vendor Dashboard</h3></div><Button variant="glass" size="sm" onClick={() => router.push('/vendor/dashboard')}>Open</Button></CardContent></Card>}
        {profile.role === 'admin' && <Card className="hover:shadow-glass-hover transition-all"><CardContent className="p-4 flex items-center gap-4"><Settings className="w-8 h-8 text-indigo-500" /><div className="flex-1"><h3 className="font-semibold">Admin Panel</h3></div><Button variant="glass" size="sm" onClick={() => router.push('/dashboard')}>Open</Button></CardContent></Card>}
      </div>
      <Button variant="outline" className="w-full gap-2" onClick={() => { localStorage.clear(); window.location.href = '/'; }}><LogOut className="w-5 h-5" /> Logout</Button>
    </div>
  );
}
