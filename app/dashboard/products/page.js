'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminFetch } from '@/lib/adminFetch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [bulkPrice, setBulkPrice] = useState('');
  const [editMode, setEditMode] = useState(null);
  const [editValues, setEditValues] = useState({});

  const fetchProducts = async () => {
    const res = await adminFetch(`/api/admin/products?search=${search}&limit=100`);
    if (res.ok) {
      const data = await res.json();
      setProducts(data.data);
    }
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, [search]);

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selected.length === products.length) setSelected([]);
    else setSelected(products.map(p => p.id));
  };

  const deleteSelected = async () => {
    if (!confirm(`Delete ${selected.length} products?`)) return;
    await adminFetch('/api/admin/products/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ ids: selected }),
      headers: { 'Content-Type': 'application/json' },
    });
    toast.success('Deleted');
    setSelected([]);
    fetchProducts();
  };

  const applyBulkPrice = async () => {
    if (!bulkPrice || selected.length === 0) return;
    const factor = 1 + parseFloat(bulkPrice) / 100;
    await adminFetch('/api/admin/products/bulk/price', {
      method: 'PATCH',
      body: JSON.stringify({ ids: selected, factor }),
      headers: { 'Content-Type': 'application/json' },
    });
    toast.success(`Price updated by ${bulkPrice}%`);
    setBulkPrice('');
    setSelected([]);
    fetchProducts();
  };

  const startEdit = (product) => {
    setEditMode(product.id);
    setEditValues({ title: product.title, price: product.price, stock: product.stock });
  };

  const saveEdit = async (id) => {
    await adminFetch(`/api/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(editValues),
      headers: { 'Content-Type': 'application/json' },
    });
    toast.success('Saved');
    setEditMode(null);
    fetchProducts();
  };

  if (loading) return <div className="animate-pulse space-y-4">{Array(5).fill(0).map((_,i)=> <div key={i} className="h-12 bg-gray-200 rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="max-w-xs" />
        <Button onClick={deleteSelected} disabled={selected.length===0} variant="destructive">Delete Selected</Button>
        <Input type="number" value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} placeholder="+5 or -5 (%)" className="w-24" />
        <Button onClick={applyBulkPrice} disabled={selected.length===0 || !bulkPrice} variant="secondary">Apply Bulk Price</Button>
      </div>

      <div className="overflow-x-auto glass-card">
        <table className="w-full">
          <thead>
            <tr>
              <th><Checkbox checked={selected.length===products.length} onCheckedChange={selectAll} /></th>
              <th>Title</th>
              <th>Price (Ks)</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className="border-t border-border">
                <td><Checkbox checked={selected.includes(p.id)} onCheckedChange={() => toggleSelect(p.id)} /></td>
                <td className="p-2">
                  {editMode === p.id ? (
                    <input autoFocus defaultValue={editValues.title} onChange={e => setEditValues({...editValues, title: e.target.value})} className="w-full bg-transparent border-b border-primary outline-none" />
                  ) : (
                    <span onClick={() => startEdit(p)} className="cursor-pointer hover:underline">{p.title}</span>
                  )}
                </td>
                <td className="p-2">
                  {editMode === p.id ? (
                    <input type="number" defaultValue={editValues.price} onChange={e => setEditValues({...editValues, price: parseFloat(e.target.value)})} className="w-20 bg-transparent border-b border-primary outline-none" />
                  ) : (
                    <span>{p.price}</span>
                  )}
                </td>
                <td className="p-2">
                  {editMode === p.id ? (
                    <input type="number" defaultValue={editValues.stock} onChange={e => setEditValues({...editValues, stock: parseInt(e.target.value)})} className="w-16 bg-transparent border-b border-primary outline-none" />
                  ) : (
                    <span>{p.stock}</span>
                  )}
                </td>
                <td className="p-2">
                  {editMode === p.id ? (
                    <Button size="sm" onClick={() => saveEdit(p.id)}>Save</Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => startEdit(p)}>Edit</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
