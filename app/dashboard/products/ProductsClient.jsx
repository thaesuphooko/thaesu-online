'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';
import { Download, Sparkles, Upload, X, Tag, Plus, Search, ImageIcon } from 'lucide-react';
import Image from 'next/image';

// ---------- Virtual Scroll Helpers ----------
const ROW_HEIGHT = 64;
const OVERSCAN = 5;
function useVirtualScroll(items, containerRef) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => setContainerHeight(entries[0].contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);
  const handleScroll = useCallback(() => {
    if (containerRef.current) setScrollTop(containerRef.current.scrollTop);
  }, [containerRef]);
  const totalHeight = items.length * ROW_HEIGHT;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIdx = Math.min(items.length - 1, Math.floor((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN);
  const visible = items.slice(startIdx, endIdx + 1);
  return { totalHeight, startIdx, visible, handleScroll };
}

// ---------- Inline Edit Component ----------
function InlineEdit({ value, onSave, type = 'text', className = '' }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const inputRef = useRef(null);
  useEffect(() => { setVal(value); }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const handleSave = () => {
    if (val !== value) onSave(val);
    setEditing(false);
  };

  if (editing) {
    return (
      <input ref={inputRef} type={type} value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setVal(value); setEditing(false); } }}
        className={`bg-white/10 px-2 py-0.5 rounded border border-white/20 outline-none focus:border-purple-400 ${className}`}
      />
    );
  }
  return (
    <div onDoubleClick={() => setEditing(true)} className={`cursor-pointer hover:bg-white/5 rounded px-1 -mx-1 transition ${className}`} title="Double-click to edit">
      {value}
    </div>
  );
}

// ---------- Promotion Modal ----------
function PromotionModal({ product, onClose }) {
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!discountValue || !startDate || !endDate) { toast.error('Please fill all fields'); return; }
    setSaving(true);
    try {
      const res = await adminFetch('/api/admin/promotions', {
        method: 'POST',
        body: JSON.stringify({
          product_id: product.id, discount_type: discountType,
          discount_value: parseFloat(discountValue),
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString()
        }),
      });
      if (res.ok) { toast.success('Promotion created'); onClose(); }
      else { const data = await res.json().catch(() => ({})); toast.error(data.error || 'Failed'); }
    } catch { toast.error('Failed'); }
    setSaving(false);
  };

  return (
    <Dialog open={!!product} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-black/90 backdrop-blur-xl border border-white/10 text-white">
        <DialogHeader><DialogTitle>Promotion for {product?.title}</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-4">
          <Select value={discountType} onValueChange={setDiscountType}>
            <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="flat">Flat Amount (Ks)</SelectItem></SelectContent>
          </Select>
          <Input type="number" placeholder={discountType === 'percentage' ? '20' : '5000'} value={discountValue} onChange={e => setDiscountValue(e.target.value)} className="bg-white/5 border-white/10" />
          <div className="grid grid-cols-2 gap-2">
            <Input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white/5 border-white/10" />
            <Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white/5 border-white/10" />
          </div>
        </div>
        <DialogFooter><Button onClick={handleCreate} disabled={saving} className="w-full bg-purple-600"><Plus className="w-4 h-4 mr-1"/>Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Image Upload Modal ----------
function ImageUploadModal({ product, onClose, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('productId', product.id);
      const res = await adminFetch('/api/admin/products/upload-image', { method: 'POST', body: formData });
      if (res.ok) { toast.success('Image uploaded'); onUploaded(); onClose(); }
      else { const data = await res.json().catch(() => ({})); throw new Error(data.error || 'Upload failed'); }
    } catch (err) { toast.error(err.message || 'Upload failed'); }
    setUploading(false);
  };

  return (
    <Dialog open={!!product} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-black/90 backdrop-blur-xl border border-white/10 text-white">
        <DialogHeader><DialogTitle>Upload Image for {product?.title}</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30" disabled={uploading} />
          {preview && <div className="relative w-full h-40 rounded-lg overflow-hidden bg-white/5"><Image src={preview} fill className="object-contain" alt="preview" /></div>}
          {uploading && <div className="text-sm text-zinc-400 text-center">Uploading...</div>}
          <Button onClick={handleUpload} disabled={uploading || !preview} className="w-full bg-purple-600"><Upload className="w-4 h-4 mr-1"/>Upload</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Main Client Component ----------
export default function ProductsClient({ initialProducts }) {
  const [products, setProducts] = useState(Array.isArray(initialProducts) ? initialProducts : []);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [aiFilter, setAiFilter] = useState('');
  const [selected, setSelected] = useState([]);
  const [bulkPrice, setBulkPrice] = useState('');
  const [detailProduct, setDetailProduct] = useState(null);
  const [promoProduct, setPromoProduct] = useState(null);
  const [imageUploadProduct, setImageUploadProduct] = useState(null);
  const containerRef = useRef(null);

  // Refresh products from API
  const refreshProducts = async () => {
    try {
      const res = await adminFetch('/api/admin/products?limit=5000');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setProducts(data);
      }
    } catch (err) {
      console.error('Refresh failed:', err);
      toast.error('Failed to refresh products');
    }
  };

  // Client-side filtering
  const filtered = useMemo(() => {
    let list = products;
    if (search) list = list.filter(p => p.title?.toLowerCase().includes(search.toLowerCase()));
    if (category) list = list.filter(p => p.category === category);
    if (stockFilter === 'out') list = list.filter(p => p.stock <= 0);
    else if (stockFilter === 'low') list = list.filter(p => p.stock > 0 && p.stock <= 5);
    else if (stockFilter === 'in') list = list.filter(p => p.stock > 5);
    if (aiFilter === 'ai') list = list.filter(p => p.ai_priced);
    return list;
  }, [products, search, category, stockFilter, aiFilter]);

  const { totalHeight, startIdx, visible, handleScroll } = useVirtualScroll(filtered, containerRef);

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleSelectAll = () => {
    if (selected.length === filtered.length && filtered.length > 0) setSelected([]);
    else setSelected(filtered.map(p => p.id));
  };

  // Bulk actions
  const deleteSelected = async () => {
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} products?`)) return;
    try {
      await adminFetch('/api/admin/products/bulk', { method: 'DELETE', body: JSON.stringify({ ids: selected }) });
      toast.success(`Deleted ${selected.length} products`);
      setSelected([]);
      refreshProducts();
    } catch { toast.error('Bulk delete failed'); }
  };

  const applyBulkPrice = async () => {
    if (!bulkPrice || selected.length === 0) return;
    const factor = 1 + parseFloat(bulkPrice) / 100;
    try {
      await adminFetch('/api/admin/products/bulk/price', { method: 'PATCH', body: JSON.stringify({ ids: selected, factor }) });
      toast.success(`Price adjusted by ${bulkPrice}%`);
      setBulkPrice('');
      setSelected([]);
      refreshProducts();
    } catch { toast.error('Price adjustment failed'); }
  };

  const toggleActive = async (active) => {
    if (selected.length === 0) return;
    try {
      await adminFetch('/api/admin/products/bulk/activate', { method: 'PATCH', body: JSON.stringify({ ids: selected, is_active: active }) });
      toast.success(`Products ${active ? 'activated' : 'deactivated'}`);
      setSelected([]);
      refreshProducts();
    } catch { toast.error('Activation toggle failed'); }
  };

  // Inline save
  const inlineSave = async (productId, field, value) => {
    const numericFields = ['price', 'stock'];
    const cleaned = numericFields.includes(field) ? (parseFloat(value) || 0) : value;
    try {
      await adminFetch(`/api/admin/products/${productId}`, { method: 'PUT', body: JSON.stringify({ [field]: cleaned }) });
      toast.success('Updated');
      refreshProducts();
    } catch { toast.error('Update failed'); }
  };

  // AI Validate
  const triggerAIValidate = async (productId) => {
    try {
      const res = await adminFetch('/api/admin/ai-price', { method: 'POST', body: JSON.stringify({ productId }) });
      const data = await res.json().catch(() => ({}));
      if (data.newPrice) { toast.success(`AI price set to ${data.newPrice} Ks`); refreshProducts(); }
      else toast.error(data.error || 'AI failed');
    } catch { toast.error('AI validation failed'); }
  };

  // Delete single
  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await adminFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      toast.success('Deleted');
      refreshProducts();
    } catch { toast.error('Delete failed'); }
  };

  const exportCSV = async () => {
    try {
      const res = await adminFetch('/api/admin/products/export');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch { toast.error('CSV export failed'); }
  };

  const categories = ['Electronics', 'Fashion', 'Home & Living', 'Books', 'Sports', 'Health', 'Beauty', 'Food', 'Other'];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center bg-black/20 backdrop-blur p-2 rounded-xl border border-white/10">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="max-w-[140px] h-8 text-xs bg-white/5 border-white/10" />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[110px] h-8 text-xs bg-white/5 border-white/10"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent><SelectItem value="">All</SelectItem>{categories.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-[90px] h-8 text-xs bg-white/5 border-white/10"><SelectValue placeholder="Stock" /></SelectTrigger>
          <SelectContent><SelectItem value="">All</SelectItem><SelectItem value="out">Out</SelectItem><SelectItem value="low">Low</SelectItem><SelectItem value="in">In</SelectItem></SelectContent>
        </Select>
        <Select value={aiFilter} onValueChange={setAiFilter}>
          <SelectTrigger className="w-[80px] h-8 text-xs bg-white/5 border-white/10"><SelectValue placeholder="AI" /></SelectTrigger>
          <SelectContent><SelectItem value="">All</SelectItem><SelectItem value="ai">AI</SelectItem></SelectContent>
        </Select>
        <div className="flex-1" />
        <span className="text-xs text-zinc-400">{filtered.length} items</span>
        <Button onClick={deleteSelected} disabled={selected.length===0} variant="destructive" size="sm" className="h-8 text-xs"><X className="w-3 h-3 mr-1"/>Del ({selected.length})</Button>
        <Input type="number" value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} placeholder="+/-%" className="w-[70px] h-8 text-xs bg-white/5 border-white/10" />
        <Button onClick={applyBulkPrice} disabled={selected.length===0 || !bulkPrice} variant="secondary" size="sm" className="h-8 text-xs">Apply %</Button>
        <Button onClick={() => toggleActive(true)} disabled={selected.length===0} variant="outline" size="sm" className="h-8 text-xs border-emerald-500/30 text-emerald-400">On</Button>
        <Button onClick={() => toggleActive(false)} disabled={selected.length===0} variant="outline" size="sm" className="h-8 text-xs border-red-500/30 text-red-400">Off</Button>
        <Button onClick={exportCSV} variant="ghost" size="sm" className="h-8 text-xs"><Download className="w-3 h-3 mr-1"/>CSV</Button>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-500 bg-white/5 rounded-lg">
        <Checkbox checked={selected.length === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} className="border-zinc-500" />
        <div className="w-10 shrink-0" />
        <div className="flex-1">Product</div>
        <div className="w-20 text-right">Price</div>
        <div className="w-20 text-right">Stock</div>
        <div className="w-12 text-center">AI</div>
        <div className="w-28 text-right">Actions</div>
      </div>

      {/* Virtualized List */}
      <div ref={containerRef} onScroll={handleScroll} className="overflow-auto relative rounded-xl border border-white/10 bg-black/20 backdrop-blur" style={{height:'calc(100vh - 220px)'}}>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-500">
            <div className="text-center">
              <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No products found</p>
            </div>
          </div>
        ) : (
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ position: 'absolute', top: startIdx * ROW_HEIGHT, left:0, right:0 }}>
              {visible.map(p => (
                <div key={p.id} style={{ height: ROW_HEIGHT }} className="flex items-center gap-2 px-2 border-b border-white/5 hover:bg-white/5 transition">
                  <Checkbox checked={selected.includes(p.id)} onCheckedChange={() => toggleSelect(p.id)} className="border-zinc-500" />
                  <div className="w-10 h-10 relative rounded-lg overflow-hidden bg-white/5 shrink-0 cursor-pointer" onClick={() => setDetailProduct(p)}>
                    <Image src={p.media?.[0]?.url || '/placeholder.jpg'} alt={p.title||'Product'} fill className="object-cover" sizes="40px" onError={(e)=>{e.target.src='/placeholder.jpg'}} />
                  </div>
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setDetailProduct(p)}>
                    <InlineEdit value={p.title || 'Untitled'} onSave={(v) => inlineSave(p.id, 'title', v)} className="font-medium truncate text-sm" />
                    <div className="text-xs text-zinc-400">{p.category || 'Uncategorized'}</div>
                  </div>
                  <div className="text-right font-mono w-20 shrink-0 text-sm">
                    <InlineEdit value={parseFloat(p.price||0).toString()} onSave={(v) => inlineSave(p.id, 'price', v)} type="number" className="text-purple-300" />
                    <span className="text-xs text-zinc-500">Ks</span>
                  </div>
                  <div className="text-right w-20 shrink-0 flex items-center gap-1 justify-end">
                    <InlineEdit value={(p.stock||0).toString()} onSave={(v) => inlineSave(p.id, 'stock', v)} type="number" className="text-sm" />
                    {p.stock <= 0 ? <Badge variant="destructive" className="text-[10px] px-1">Out</Badge> : p.stock <=5 ? <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px] px-1">Low</Badge> : <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1">In</Badge>}
                  </div>
                  <div className="w-12 text-center shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => triggerAIValidate(p.id)} title="AI validate price" className="text-purple-400 hover:bg-purple-500/10"><Sparkles className="w-4 h-4" /></Button>
                  </div>
                  <div className="flex gap-1 shrink-0 w-28 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => setImageUploadProduct(p)} title="Upload Image"><ImageIcon className="w-4 h-4 text-blue-400" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setPromoProduct(p)} title="Promotions"><Tag className="w-4 h-4 text-yellow-400" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteProduct(p.id)} className="text-red-400 hover:bg-red-500/10"><X className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailProduct} onOpenChange={() => setDetailProduct(null)}>
        <DialogContent className="max-w-2xl bg-black/90 backdrop-blur-xl border border-white/10 text-white max-h-[90vh] overflow-y-auto">
          {detailProduct && (
            <>
              <DialogHeader><DialogTitle className="text-xl">{detailProduct.title}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="aspect-square relative rounded-lg overflow-hidden bg-white/5">
                  <Image src={detailProduct.media?.[0]?.url || '/placeholder.jpg'} fill className="object-cover" alt="" onError={(e)=>{e.target.src='/placeholder.jpg'}} />
                </div>
                <div className="space-y-3">
                  <div className="pb-2 border-b border-white/10"><span className="text-zinc-400 text-sm">Price</span><p className="font-mono text-lg text-purple-300">{parseFloat(detailProduct.price||0).toLocaleString()} Ks</p></div>
                  <div className="pb-2 border-b border-white/10"><span className="text-zinc-400 text-sm">Stock</span><p className="text-lg">{detailProduct.stock||0}</p></div>
                  <div className="pb-2 border-b border-white/10"><span className="text-zinc-400 text-sm">Category</span><p className="text-lg">{detailProduct.category || 'None'}</p></div>
                  <div className="pb-2 border-b border-white/10"><span className="text-zinc-400 text-sm">AI Priced</span><Badge className={detailProduct.ai_priced ? 'bg-purple-500/20 text-purple-300' : 'bg-zinc-500/20 text-zinc-400'}>{detailProduct.ai_priced ? 'Yes' : 'No'}</Badge></div>
                  <div className="pb-2 border-b border-white/10"><span className="text-zinc-400 text-sm">Status</span><Badge className={detailProduct.is_active !== false ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}>{detailProduct.is_active !== false ? 'Active' : 'Inactive'}</Badge></div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button onClick={() => { toggleActive(true); setDetailProduct(null); }} variant="outline" className="border-emerald-500/30 text-emerald-400">Activate</Button>
                    <Button onClick={() => { toggleActive(false); setDetailProduct(null); }} variant="outline" className="border-red-500/30 text-red-400">Deactivate</Button>
                    <Button onClick={() => { triggerAIValidate(detailProduct.id); setDetailProduct(null); }} variant="secondary" className="bg-purple-600/20 text-purple-300"><Sparkles className="w-4 h-4 mr-1"/>AI Price</Button>
                  </div>
                  {detailProduct.media?.length > 0 && (
                    <div className="mt-4">
                      <span className="text-zinc-400 text-sm block mb-2">Images ({detailProduct.media.length})</span>
                      <div className="flex gap-2 flex-wrap">
                        {detailProduct.media.map((m,i) => (
                          <div key={i} className="w-16 h-16 relative rounded-lg overflow-hidden bg-white/5">
                            <Image src={m.url} fill className="object-cover" alt="" sizes="64px" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Promotion Modal */}
      <PromotionModal product={promoProduct} onClose={() => setPromoProduct(null)} />

      {/* Image Upload Modal */}
      <ImageUploadModal product={imageUploadProduct} onClose={() => setImageUploadProduct(null)} onUploaded={refreshProducts} />
    </div>
  );
}
