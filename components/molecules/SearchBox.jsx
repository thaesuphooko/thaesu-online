'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchBox() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const router = useRouter();
  const timerRef = useRef(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`);
      if (res.ok) setSuggestions(await res.json());
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/products?search=${encodeURIComponent(query)}`);
      setSuggestions([]);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <form onSubmit={handleSubmit} className="flex">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products (AI‑powered)..."
          className="w-full p-2 border rounded-l"
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-r">Search</button>
      </form>
      {suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 bg-white border rounded-b shadow-lg z-10">
          {suggestions.map((s, i) => (
            <li key={i} className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => router.push(`/products/${s.slug}`)}>
              {s.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
