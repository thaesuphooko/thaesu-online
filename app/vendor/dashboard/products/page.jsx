'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, ImageIcon, Edit3 } from 'lucide-react';

export default function VendorProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProduct, setNewProduct] = useState({ title: '', price: '', stock: '', category: '' });
  const [uploading, setUploading] = useState({});
  const fileInputRefs = useRef({});

  const fetchProducts = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/vendor/products', { headers: { Authorization: `Bearer ${token}` } });
    setProducts(await res.json());
    setLoading(false);
  };
  useEffect(() => { fetchProducts(); }, []);

  const addProduct = async () => {
    if (!newProduct.title || !newProduct.price) return toast.error('Title and price required');
    const token = localStorage.getItem('token');
    const res = await fetch('/api/vendor/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(newProduct),
    });
    if (res.ok) {
      toast.success('Product added');
      setNewProduct({ title: '', price: '', stock: '', category: '' });
      fetchProducts();
    }
  };

  const updateField = async (id, field, value) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/vendor/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ [field]: value }),
    });
    toast.success('Updated');
  };

  const deleteProduct = async (id) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/vendor/products/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    toast.success('Deleted');
    fetchProducts();
  };

  const handleImageUpload = async (productId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(prev => ({ ...prev, [productId]: true }));
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('productId', productId);
    const res = await fetch('/api/vendor/products/upload-image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (res.ok) {
      toast.success('Image uploaded');
      fetchProducts();
    } else {
      toast.error('Upload failed');
    }
    setUploading(prev => ({ ...prev, [productId]: false }));
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Products</h1>
      {/* Add Product Form */}
      <div className="flex flex-wrap gap-2 items-end bg-white/5 p-4 rounded-2xl backdrop-blur">
        <Input placeholder="Title" value={newProduct.title} onChange={e => setNewProduct({...newProduct, title: e.target.value})} className="bg-white/10 flex-1 min-w-[150px]" />
        <Input placeholder="Price" type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-24 bg-white/10" />
        <Input placeholder="Stock" type="number" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} className="w-24 bg-white/10" />
        <Input placeholder="Category" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="bg-white/10 flex-1 min-w-[120px]" />
        <Button onClick={addProduct} className="bg-purple-600"><Plus className="w-4 h-4 mr-1"/> Add</Button>
      </div>
      {/* Products List */}
      <div className="space-y-2">
        {products.map(p => (
          <div key={p.id} className="bg-white/5 rounded-xl p-4 flex items-center gap-4 backdrop-blur">
            <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden relative">
              {p.media?.[0]?.url ? (
                <img src={p.media[0].url} alt="" className="object-cover w-full h-full" />
              ) : (
                <ImageIcon className="w-6 h-6 text-zinc-500" />
              )}
              <label className="absolute inset-0 cursor-pointer opacity-0 hover:opacity-100 bg-black/50 flex items-center justify-center transition">
                <Upload className="w-4 h-4 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(p.id, e)} disabled={uploading[p.id]} />
              </label>
            </div>
            <div className="flex-1">
              <input defaultValue={p.title} onBlur={e => updateField(p.id, 'title', e.target.value)} className="bg-transparent border-none outline-none font-medium text-white w-full" />
              <div className="flex gap-2 mt-1 text-xs text-zinc-400">
                <span>{p.category || 'Uncategorized'}</span>
                <span>• Stock: {p.stock}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" defaultValue={p.price} onBlur={e => updateField(p.id, 'price', e.target.value)} className="w-20 bg-white/10 rounded px-2 py-1 text-sm" />
              <span className="text-zinc-400 text-sm">Ks</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => deleteProduct(p.id)} className="text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></Button>
          </div>
        ))}
        {products.length === 0 && <p className="text-zinc-500 text-center py-10">No products yet.</p>}
      </div>
    </div>
  );
}
