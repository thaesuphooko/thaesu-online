'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import Button from '@/components/ui/button';
import { Heart, Store, Settings, LogOut, MapPin } from 'lucide-react';

export default function ProfilePage() {
  const [token, setToken] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedToken = localStorage.getItem('adminSecret') || '';
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

  if (!token || !profile) {
    return (
      <div className="max-w-md mx-auto p-4 py-8 animate-fadeIn text-center space-y-6">
        <h1 className="text-3xl font-bold">Profile</h1>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-muted-foreground">You are not logged in.</p>
            <div className="flex gap-4 justify-center">
              <Link href="/auth/login"><Button>Login</Button></Link>
              <Link href="/auth/register"><Button variant="outline">Register</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isVendorOrAdmin = profile.role === 'vendor' || profile.role === 'admin';

  const trackOrder = () => {
    const orderId = prompt('Enter your Order ID:');
    if (orderId) router.push(`/order-tracking?id=${orderId}`);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 py-8 animate-fadeIn space-y-6">
      <Card className="text-center">
        <CardContent className="pt-6">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary mx-auto mb-4">
            {profile.full_name?.[0] || profile.email[0].toUpperCase()}
          </div>
          <h2 className="text-2xl font-bold">{profile.full_name || profile.email}</h2>
          <p className="text-muted-foreground text-sm">{profile.email}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="hover:shadow-glass-hover transition-all cursor-pointer" onClick={trackOrder}>
          <CardContent className="p-4 flex items-center gap-4">
            <MapPin className="w-8 h-8 text-blue-500" />
            <div className="flex-1">
              <h3 className="font-semibold">Track Order</h3>
              <p className="text-sm text-muted-foreground">Enter your order ID</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-glass-hover transition-all cursor-pointer" onClick={() => router.push('/wishlist')}>
          <CardContent className="p-4 flex items-center gap-4">
            <Heart className="w-8 h-8 text-rose-500" />
            <div className="flex-1">
              <h3 className="font-semibold">Wishlist</h3>
              <p className="text-sm text-muted-foreground">Saved items</p>
            </div>
          </CardContent>
        </Card>

        {isVendorOrAdmin && (
          <Card className="hover:shadow-glass-hover transition-all cursor-pointer" onClick={() => router.push('/vendor/dashboard')}>
            <CardContent className="p-4 flex items-center gap-4">
              <Store className="w-8 h-8 text-emerald-500" />
              <div className="flex-1">
                <h3 className="font-semibold">Vendor Dashboard</h3>
                <p className="text-sm text-muted-foreground">Manage your store</p>
              </div>
            </CardContent>
          </Card>
        )}

        {profile.role === 'admin' && (
          <Card className="hover:shadow-glass-hover transition-all cursor-pointer" onClick={() => router.push('/dashboard')}>
            <CardContent className="p-4 flex items-center gap-4">
              <Settings className="w-8 h-8 text-indigo-500" />
              <div className="flex-1">
                <h3 className="font-semibold">Admin Panel</h3>
                <p className="text-sm text-muted-foreground">Site settings</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Button variant="outline" className="w-full gap-2" onClick={() => { localStorage.clear(); window.location.href = '/'; }}>
        <LogOut className="w-5 h-5" /> Logout
      </Button>
    </div>
  );
}
