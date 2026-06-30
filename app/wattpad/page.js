'use client';
import { useState, useEffect } from 'react';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
export default function WattpadPage() {
  const [stories, setStories] = useState([]);
  const [token, setToken] = useState('');
  useEffect(() => { setToken(localStorage.getItem('adminSecret')||''); fetchStories(); }, []);
  const fetchStories = async () => {
    const res = await fetch('/api/wattpad');
    if (res.ok) setStories(await res.json());
  };
  return (
    <div className="max-w-4xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Wattpad Stories</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stories.map(s => (
          <div key={s.id} className="glass-card p-4">
            {s.cover_image && <img src={s.cover_image} className="w-full h-32 object-cover rounded" />}
            <h3 className="font-semibold mt-2">{s.title}</h3>
            <p className="text-xs text-muted-foreground">{s.category}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
