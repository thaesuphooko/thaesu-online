'use client';
import { useState, useEffect } from 'react';

export default function AdminProducts() {
  const [token, setToken] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '', slug: '', description: '', price: '', compare_at_price: '', stock: '', category: '', tags: '', is_18_plus: false, is_active: true
  });

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const url = new URL('/api/admin/products', window.location.origin);
    url.searchParams.set('page', page);
    url.searchParams.set('limit', 20);
    if (search) url.searchParams.set('search', search);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setProducts(data.data);
      setTotalPages(data.totalPages);
    }
    setLoading(false);
  };

  useEffect(() => { if (token) fetchProducts(); }, [page, search, token]);

  const handleSave = async () => {
    const payload = {
      ...form,
      price: parseFloat(form.price) || 0,
      compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
      stock: parseInt(form.stock) || 0,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
    };
    if (editing) {
      await fetch(`/api/admin/products/${editing}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
    }
    setEditing(null);
    setForm({ title: '', slug: '', description: '', price: '', compare_at_price: '', stock: '', category: '', tags: '', is_18_plus: false, is_active: true });
    fetchProducts();
  };

  const handleEdit = (product) => {
    setEditing(product.id);
    setForm({
      title: product.title, slug: product.slug, description: product.description || '',
      price: product.price, compare_at_price: product.compare_at_price || '',
      stock: product.stock, category: product.category || '',
      tags: product.tags ? product.tags.join(', ') : '', is_18_plus: product.is_18_plus, is_active: product.is_active
    });
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this product?')) {
      await fetch(`/api/admin/products/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      fetchProducts();
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Product Management</h1>
      <div className="flex items-center gap-2 mb-4">
        <input type="text" value={token} onChange={e => setToken(e.target.value)} placeholder="Admin JWT Token" className="p-2 border rounded w-full max-w-xs" />
        <button onClick={fetchProducts} className="px-4 py-2 bg-blue-600 text-white rounded">Refresh</button>
      </div>

      <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search products..." className="w-full p-2 rounded mb-4 border" />

      {/* Form */}
      <div className="glass-card p-4 mb-6">
        <h2 className="text-xl font-bold mb-2">{editing ? 'Edit Product' : 'Add New Product'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Title" className="p-2 border rounded" />
          <input value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} placeholder="Slug" className="p-2 border rounded" />
          <input value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="Price" type="number" className="p-2 border rounded" />
          <input value={form.compare_at_price} onChange={e => setForm({...form, compare_at_price: e.target.value})} placeholder="Compare at price" type="number" className="p-2 border rounded" />
          <input value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} placeholder="Stock" type="number" className="p-2 border rounded" />
          <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Category" className="p-2 border rounded" />
          <input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="Tags (comma separated)" className="p-2 border rounded" />
        </div>
        <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description" rows={2} className="w-full p-2 border rounded mt-2" />
        <label className="inline-flex items-center mt-2 mr-4"><input type="checkbox" checked={form.is_18_plus} onChange={e => setForm({...form, is_18_plus: e.target.checked})} /> 18+ Content</label>
        <label className="inline-flex items-center mt-2"><input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} /> Active</label>
        <div className="mt-3 flex gap-2">
          <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded">{editing ? 'Update' : 'Create'}</button>
          {editing && <button onClick={() => setEditing(null)} className="px-4 py-2 bg-gray-400 text-white rounded">Cancel</button>}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full glass-card">
          <thead><tr><th>Title</th><th>Price</th><th>Stock</th><th>Category</th><th>Actions</th></tr></thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td>{p.price} Ks</td>
                <td>{p.stock}</td>
                <td>{p.category}</td>
                <td className="flex gap-2">
                  <button onClick={() => handleEdit(p)} className="px-2 py-1 bg-yellow-400 text-white rounded text-sm">Edit</button>
                  <button onClick={() => handleDelete(p.id)} className="px-2 py-1 bg-red-500 text-white rounded text-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex gap-2 justify-center">
        {Array.from({ length: totalPages }, (_, i) => (
          <button key={i} onClick={() => setPage(i+1)} className={`px-3 py-1 rounded ${page === i+1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{i+1}</button>
        ))}
      </div>
    </div>
  );
}
