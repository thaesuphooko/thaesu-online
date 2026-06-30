'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '' });
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Registration failed');
      return;
    }
    localStorage.setItem('adminToken', data.token);
    router.push('/');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 animate-fadeIn">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 space-y-4">
          <h1 className="text-2xl font-bold text-center">Register</h1>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" type="text" value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required />
            </div>
            <Button type="submit" className="w-full">Register</Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account? <Link href="/auth/login" className="text-primary hover:underline">Login</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
