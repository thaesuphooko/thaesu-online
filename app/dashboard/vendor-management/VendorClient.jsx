'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';
import {
  Search, Download, Users, Store, Mail, Phone, Clock, Package,
  ChevronUp, ChevronDown, ArrowUpDown, Edit2, Save, X, Eye, CheckCircle,
  XCircle, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// ---------- Utilities ----------
const vendorSchema = z.object({
  name: z.string().min(2, 'Name too short'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
});

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ---------- Skeleton Loading ----------
const SkeletonRow = () => (
  <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg animate-pulse">
    <div className="w-5 h-5 bg-white/10 rounded" />
    <div className="flex-1 space-y-1.5">
      <div className="h-4 bg-white/10 rounded w-1/3" />
      <div className="h-3 bg-white/10 rounded w-1/2" />
    </div>
    <div className="w-20 h-5 bg-white/10 rounded" />
    <div className="w-24 h-4 bg-white/10 rounded" />
  </div>
);

// ---------- Main Component ----------
export default function VendorClient({ initialVendors }) {
  const [vendors, setVendors] = useState(initialVendors);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [detailVendor, setDetailVendor] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(vendorSchema),
  });

  // ---------- Filtering & Sorting ----------
  const filtered = useMemo(() => {
    let list = vendors;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(v =>
        v.name?.toLowerCase().includes(q) ||
        v.email?.toLowerCase().includes(q) ||
        v.phone?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) list = list.filter(v => v.status === statusFilter);
    return list;
  }, [vendors, debouncedSearch, statusFilter]);

  const sorted = useMemo(() => {
    const data = [...filtered];
    const { key, direction } = sortConfig;
    data.sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];
      if (key === 'created_at') {
        return direction === 'asc'
          ? new Date(aVal) - new Date(bVal)
          : new Date(bVal) - new Date(aVal);
      }
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [filtered, sortConfig]);

  const totalPages = Math.ceil(sorted.length / rowsPerPage);
  const paginated = sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // ---------- Handlers ----------
  const toggleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc',
    }));
    setPage(1);
  };

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const updateStatus = async (id, newStatus) => {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
    try {
      await adminFetch(`/api/admin/vendors/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success(`Vendor ${newStatus}`);
    } catch {
      toast.error('Status update failed');
    }
  };

  const confirmBulkAction = (action) => {
    if (selected.length === 0) return;
    setBulkAction(action);
    setBulkDialogOpen(true);
  };

  const executeBulkAction = async () => {
    if (!bulkAction) return;
    const ids = selected;
    const newStatus = bulkAction === 'approve' ? 'approved' : 'rejected';
    setVendors(prev => prev.map(v => ids.includes(v.id) ? { ...v, status: newStatus } : v));
    try {
      await adminFetch('/api/admin/vendors/bulk-status', {
        method: 'PUT',
        body: JSON.stringify({ ids, status: newStatus }),
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success(`${ids.length} vendors ${newStatus}`);
      setSelected([]);
    } catch {
      toast.error('Bulk update failed');
    } finally {
      setBulkDialogOpen(false);
      setBulkAction(null);
    }
  };

  const startEdit = (vendor) => {
    setEditingId(vendor.id);
    reset({ name: vendor.name || '', email: vendor.email || '', phone: vendor.phone || '' });
  };

  const onEditSave = async (data) => {
    try {
      const res = await adminFetch(`/api/admin/vendors/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const updated = await res.json();
        setVendors(prev => prev.map(v => v.id === editingId ? updated : v));
        toast.success('Vendor updated');
        setEditingId(null);
      } else {
        toast.error('Update failed');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const exportExcel = () => {
    const hash = typeof window !== 'undefined'
      ? window.location.hash.substring(1) || localStorage.getItem('adminSecret') || 'step'
      : '';
    window.open(`/api/admin/vendors/export?admin_hash=${hash}`, '_blank');
  };

  const refreshData = async () => {
    setLoading(true);
    const hash = typeof window !== 'undefined'
      ? window.location.hash.substring(1) || localStorage.getItem('adminSecret') || 'step'
      : '';
    const res = await fetch(`/api/admin/vendor-management?admin_hash=${hash}`);
    const data = await res.json();
    if (data.vendors) setVendors(data.vendors);
    setLoading(false);
  };

  useEffect(() => { refreshData(); }, []);

  // ---------- Render ----------
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center bg-black/20 backdrop-blur p-2 rounded-xl border border-white/10">
        <div className="relative max-w-[200px] flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search vendors..."
            className="pl-8 h-8 text-xs bg-white/5 border-white/10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[110px] h-8 text-xs bg-white/5 border-white/10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <span className="text-xs text-zinc-400">{filtered.length} vendors</span>
        <Button
          onClick={() => confirmBulkAction('approve')}
          disabled={selected.length === 0}
          variant="outline"
          size="sm"
          className="h-8 text-xs border-emerald-500/30 text-emerald-400"
        >
          Approve
        </Button>
        <Button
          onClick={() => confirmBulkAction('reject')}
          disabled={selected.length === 0}
          variant="outline"
          size="sm"
          className="h-8 text-xs border-red-500/30 text-red-400"
        >
          Reject
        </Button>
        <Button onClick={exportExcel} variant="ghost" size="sm" className="h-8 text-xs">
          <Download className="w-3 h-3 mr-1" /> Export
        </Button>
      </div>

      {/* Bulk Confirm Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-sm bg-black/90 backdrop-blur-xl border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Confirm Bulk Action</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {bulkAction === 'approve'
                ? `Approve ${selected.length} vendor(s)?`
                : `Reject ${selected.length} vendor(s)?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={executeBulkAction}
              className={bulkAction === 'approve' ? 'bg-emerald-600' : 'bg-red-600'}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Header with Sort */}
      <div className="flex items-center gap-2 px-2 py-1 text-xs text-zinc-500 bg-white/5 rounded-lg">
        <Checkbox
          checked={selected.length === paginated.length && paginated.length > 0}
          onCheckedChange={() =>
            setSelected(
              selected.length === paginated.length ? [] : paginated.map(v => v.id)
            )
          }
        />
        <div
          className="flex-1 flex items-center gap-1 cursor-pointer select-none"
          onClick={() => toggleSort('name')}
        >
          Vendor
          {sortConfig.key === 'name' ? (
            sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
          ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
        </div>
        <div
          className="w-16 text-center cursor-pointer select-none flex items-center justify-center gap-1"
          onClick={() => toggleSort('product_count')}
        >
          Products
          {sortConfig.key === 'product_count' ? (
            sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
          ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
        </div>
        <div
          className="w-24 text-center cursor-pointer select-none flex items-center justify-center gap-1"
          onClick={() => toggleSort('status')}
        >
          Status
          {sortConfig.key === 'status' ? (
            sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
          ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
        </div>
        <div
          className="w-28 text-right cursor-pointer select-none flex items-center justify-end gap-1"
          onClick={() => toggleSort('created_at')}
        >
          Joined
          {sortConfig.key === 'created_at' ? (
            sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
          ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
        </div>
        <div className="w-20 text-right">Actions</div>
      </div>

      {/* Vendor List */}
      {loading ? (
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : (
        <div className="space-y-1">
          <AnimatePresence>
            {paginated.map(vendor => (
              <motion.div
                key={vendor.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 bg-white/5 p-2 rounded-lg hover:bg-white/10 transition"
              >
                <Checkbox
                  checked={selected.includes(vendor.id)}
                  onCheckedChange={() => toggleSelect(vendor.id)}
                />
                <div className="flex-1 min-w-0">
                  {editingId === vendor.id ? (
                    <form onSubmit={handleSubmit(onEditSave)} className="space-y-1">
                      <Input {...register('name')} className="h-7 text-xs bg-white/10 border-white/20" placeholder="Name" />
                      {errors.name && <span className="text-red-400 text-[10px]">{errors.name.message}</span>}
                      <Input {...register('email')} className="h-7 text-xs bg-white/10 border-white/20" placeholder="Email" />
                      {errors.email && <span className="text-red-400 text-[10px]">{errors.email.message}</span>}
                      <Input {...register('phone')} className="h-7 text-xs bg-white/10 border-white/20" placeholder="Phone" />
                      <div className="flex gap-1 justify-end">
                        <Button type="submit" variant="ghost" size="icon" className="text-emerald-400"><Save className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditingId(null)} className="text-red-400"><X className="w-4 h-4" /></Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="font-medium text-sm">{vendor.name}</div>
                      <div className="text-xs text-zinc-400">{vendor.email} • {vendor.phone || 'No phone'}</div>
                    </>
                  )}
                </div>
                <div className="w-16 text-center text-xs text-zinc-400">
                  {vendor.product_count ?? 0}
                </div>
                <div className="w-24 text-center">
                  <Badge
                    variant={vendor.status === 'approved' ? 'secondary' : vendor.status === 'rejected' ? 'destructive' : 'outline'}
                    className="capitalize text-[10px]"
                  >
                    {vendor.status}
                  </Badge>
                </div>
                <div className="w-28 text-right text-xs text-zinc-500">
                  {new Date(vendor.created_at).toLocaleDateString()}
                </div>
                <div className="w-20 text-right flex gap-1 justify-end">
                  <Button variant="ghost" size="icon" onClick={() => setDetailVendor(vendor)}>
                    <Eye className="w-4 h-4 text-blue-400" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => startEdit(vendor)}>
                    <Edit2 className="w-4 h-4 text-yellow-400" />
                  </Button>
                  {vendor.status !== 'approved' && (
                    <Button variant="ghost" size="icon" onClick={() => updateStatus(vendor.id, 'approved')}>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </Button>
                  )}
                  {vendor.status !== 'rejected' && (
                    <Button variant="ghost" size="icon" onClick={() => updateStatus(vendor.id, 'rejected')}>
                      <XCircle className="w-4 h-4 text-red-400" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {paginated.length === 0 && (
            <div className="text-center py-20 text-zinc-500">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No vendors found</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Rows per page:</span>
            <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[70px] h-7 text-xs bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="h-7 text-xs"
            >
              Prev
            </Button>
            <span className="text-xs text-zinc-400">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="h-7 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!detailVendor} onOpenChange={() => setDetailVendor(null)}>
        <DialogContent className="max-w-md bg-black/90 backdrop-blur-xl border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">{detailVendor?.name}</DialogTitle>
          </DialogHeader>
          {detailVendor && (
            <div className="space-y-3 mt-2">
              <div className="flex items-center gap-2"><Store className="w-4 h-4 text-purple-400" /><span className="text-sm">{detailVendor.store_name || 'No store'}</span></div>
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-blue-400" /><span className="text-sm">{detailVendor.email}</span></div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-green-400" /><span className="text-sm">{detailVendor.phone || '—'}</span></div>
              <div className="flex items-center gap-2"><Package className="w-4 h-4 text-yellow-400" /><span className="text-sm">{detailVendor.product_count ?? 0} products</span></div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-zinc-400" /><span className="text-sm">Joined {new Date(detailVendor.created_at).toLocaleDateString()}</span></div>
              <Badge className="mt-2">{detailVendor.status}</Badge>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
