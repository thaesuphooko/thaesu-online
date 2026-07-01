'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';
import { Download, ExternalLink, Sparkles } from 'lucide-react';
import Image from 'next/image';

const limit = 20;

function fetchProducts({ pageParam = 1, queryKey }) {
  const [, search, category, stockFilter, aiFilter] = queryKey;
  const params = new URLSearchParams({ search, page: pageParam, limit });
  if (category) params.set('category', category);
  if (stockFilter === 'out') params.set('stockMax', '0');
  else if (stockFilter === 'low') params.set('stockMax', '5');
  // Note: backend need to support stockMax filter, but we'll skip for brevity; simple implementation.
  if (aiFilter === 'ai') params.set('aiPriced', 'true');
  return adminFetch(`/api/admin/products?${params}`).then(res => res.json());
}

function StockBadge({ stock }) {
  if (stock <= 0) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Out of Stock</span>;
  if (stock <= 5) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Low Stock</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">In Stock</span>;
}

function AIPriceBadge() {
  return <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-700"><Sparkles className="w-3 h-3" />AI</span>;
}

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [aiFilter, setAiFilter] = useState('');
  const [selected, setSelected] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkPrice, setBulkPrice] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const parentRef = useRef(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['adminProducts', search, category, stockFilter, aiFilter],
    queryFn: fetchProducts,
    getNextPageParam: (lastPage) => lastPage.totalPages > lastPage.page ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });

  const allProducts = data?.pages?.flatMap(p => p.data) ?? [];
  const totalCount = data?.pages?.[0]?.total ?? 0;

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectAll) { setSelected([]); setSelectAll(false); }
    else { setSelected(allProducts.map(p => p.id)); setSelectAll(true); }
  };

  const deleteSelected = async () => {
    if (!confirm(`Delete ${selected.length} products?`)) return;
    await adminFetch('/api/admin/products/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ ids: selected }),
      headers: { 'Content-Type': 'application/json' },
    });
    toast.success('Deleted');
    setSelected([]); setSelectAll(false);
    refetch();
  };

  const applyBulkPrice = async () => {
    if (!bulkPrice || selected.length === 0) return;
    const factor = 1 + parseFloat(bulkPrice) / 100;
    await adminFetch('/api/admin/products/bulk/price', {
      method: 'PATCH',
      body: JSON.stringify({ ids: selected, factor }),
      headers: { 'Content-Type': 'application/json' },
    });
    toast.success(`Price ${bulkPrice > 0 ? 'increased' : 'decreased'} by ${Math.abs(parseFloat(bulkPrice))}%`);
    setBulkPrice('');
    setSelected([]); setSelectAll(false);
    refetch();
  };

  const inlineEdit = async (productId, field, value) => {
    await adminFetch(`/api/admin/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({
        [field]: field === 'price' ? parseFloat(value) || 0 : field === 'stock' ? parseInt(value) || 0 : value
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    toast.success('Updated');
    refetch();
  };

  const triggerAIValidate = async (productId) => {
    const res = await adminFetch('/api/admin/ai-price', {
      method: 'POST',
      body: JSON.stringify({ productId, action: 'validate' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json().catch(() => ({}));
    if (data.newPrice) {
      toast.success(`AI price set to ${data.newPrice} Ks`);
      refetch();
    } else {
      toast.error(data.error || 'AI validation failed');
    }
  };

  const exportCSV = () => {
    window.open('/api/admin/products/export', '_blank');
  };

  if (isLoading) return <div className="text-center py-8">Loading products...</div>;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          value={search}
          onChange={e => { setSearch(e.target.value); setSelected([]); setSelectAll(false); }}
          placeholder="Search..."
          className="max-w-xs"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            {['Electronics','Fashion','Home & Living','Books','Sports','Health','Beauty','Food','Other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Stock" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="in">In Stock</SelectItem>
          </SelectContent>
        </Select>
        <Select value={aiFilter} onValueChange={setAiFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="AI Priced" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="ai">AI Optimized</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={deleteSelected} disabled={selected.length === 0} variant="destructive">
          Delete ({selected.length})
        </Button>
        <Input type="number" value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} placeholder="+10 or -10 %" className="w-32" />
        <Button onClick={applyBulkPrice} disabled={selected.length === 0 || !bulkPrice} variant="secondary">Bulk Price</Button>
        <Button onClick={exportCSV} variant="outline" size="sm" className="ml-auto gap-2"><Download className="w-4 h-4" />Export CSV</Button>
      </div>

      {/* Table */}
      <div ref={parentRef} className="overflow-auto h-[calc(100vh-14rem)] glass-card rounded-xl">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="p-2"><Checkbox checked={selectAll} onCheckedChange={handleSelectAll} /></th>
              <th className="p-2 text-left">Product</th>
              <th className="p-2 text-right">Price</th>
              <th className="p-2 text-right">Stock</th>
              <th className="p-2 text-center">AI</th>
              <th className="p-2 text-center">Source</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {allProducts.map(p => (
              <tr key={p.id} className="border-t border-border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="p-2"><Checkbox checked={selected.includes(p.id)} onCheckedChange={() => toggleSelect(p.id)} /></td>
                <td className="p-2 flex items-center gap-2">
                  <div className="w-10 h-10 relative rounded-md overflow-hidden bg-gray-200 shrink-0">
                    <Image
                      src={p.media?.[0]?.url || '/placeholder.jpg'}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="40px"
                      onError={(e) => { e.target.src = '/placeholder.jpg'; }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.category || 'Uncategorized'}</div>
                  </div>
                </td>
                <td className="p-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="number"
                      defaultValue={p.price}
                      onBlur={e => inlineEdit(p.id, 'price', e.target.value)}
                      className="w-20 text-right bg-transparent border-b border-primary outline-none"
                    />
                    {p.ai_priced && <AIPriceBadge />}
                  </div>
                </td>
                <td className="p-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <input
                      type="number"
                      defaultValue={p.stock === -1 ? '∞' : p.stock}
                      onBlur={e => inlineEdit(p.id, 'stock', e.target.value)}
                      className="w-16 text-right bg-transparent border-b border-primary outline-none"
                    />
                    <StockBadge stock={p.stock === -1 ? '∞' : p.stock} />
                  </div>
                </td>
                <td className="p-2 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => triggerAIValidate(p.id)}
                    title="AI validate price"
                    className="gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-purple-500" />
                  </Button>
                </td>
                <td className="p-2 text-center">
                  {p.source_url ? (
                    <a href={p.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-blue-500 hover:underline">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : <span className="text-muted-foreground">-</span>}
                </td>
                <td className="p-2 text-right">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      if (confirm('Delete?')) {
                        await adminFetch(`/api/admin/products/${p.id}`, { method: 'DELETE' });
                        toast.success('Deleted');
                        refetch();
                      }
                    }}
                  >Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Load More */}
      <div className="flex justify-center py-4">
        {isFetchingNextPage && <div className="animate-spin h-8 w-8 border-t-2 border-blue-500 rounded-full" />}
        {hasNextPage && !isFetchingNextPage && (
          <Button onClick={() => fetchNextPage()} variant="outline">Load More</Button>
        )}
        {!hasNextPage && allProducts.length > 0 && (
          <p className="text-muted-foreground text-sm">All products loaded ({totalCount} total)</p>
        )}
      </div>
    </div>
  );
}
