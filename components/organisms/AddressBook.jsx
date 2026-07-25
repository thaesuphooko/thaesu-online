'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Plus, Edit3, Trash2, MapPin, Check, Loader2, Home, Briefcase, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function getToken() { return localStorage.getItem('token'); }

export default function AddressBook() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    label: 'နေအိမ်',
    full_name: '',
    phone: '',
    region: '',
    district: '',
    township: '',
    ward: '',
    manual_address: '',
    is_default: false,
    latitude: null,
    longitude: null,
  });

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debounceRef = useRef(null);

  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [townships, setTownships] = useState([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingTownships, setLoadingTownships] = useState(false);

  useEffect(() => { fetchAddresses(); fetchRegions(); }, []);

  const fetchAddresses = async () => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch('/api/user/addresses', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchRegions = async () => {
    try {
      const res = await fetch('/api/locations?level=region');
      if (res.ok) setRegions(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchDistricts = async (region) => {
    setDistricts([]); setTownships([]);
    if (!region) return;
    setLoadingDistricts(true);
    try {
      const res = await fetch(`/api/locations?level=district&region=${encodeURIComponent(region)}`);
      if (res.ok) setDistricts(await res.json());
    } catch (e) { console.error(e); }
    setLoadingDistricts(false);
  };

  const fetchTownships = async (district) => {
    setTownships([]);
    if (!district || !form.region) return;
    setLoadingTownships(true);
    try {
      const res = await fetch(`/api/locations?level=township&region=${encodeURIComponent(form.region)}&district=${encodeURIComponent(district)}`);
      if (res.ok) setTownships(await res.json());
    } catch (e) { console.error(e); }
    setLoadingTownships(false);
  };

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/locationiq/autocomplete?q=${encodeURIComponent(val)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setShowSuggestions(true);
        }
      } catch (e) { console.error(e); }
      setLoadingSuggestions(false);
    }, 400);
  };

  const selectSuggestion = (suggestion) => {
    setForm({
      ...form,
      manual_address: suggestion.display_name,
      latitude: suggestion.lat,
      longitude: suggestion.lon,
    });
    setQuery(suggestion.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const resetForm = () => {
    setForm({
      label: 'နေအိမ်', full_name: '', phone: '', region: '', district: '', township: '',
      ward: '', manual_address: '', is_default: false, latitude: null, longitude: null,
    });
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setDistricts([]); setTownships([]);
  };

  const handleSave = async () => {
    const token = getToken();
    if (!token) { toast.error('ကျေးဇူးပြု၍ Login ဝင်ပါ'); return; }
    if (!form.full_name || !form.phone) {
      toast.error('အမည်နှင့် ဖုန်းနံပါတ် ထည့်သွင်းရန် လိုအပ်ပါသည်');
      return;
    }
    const body = { ...form };
    const url = editingId ? `/api/user/addresses/${editingId}` : '/api/user/addresses';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      toast.success('လိပ်စာ သိမ်းဆည်းပြီးပါပြီ');
      setEditingId(null);
      resetForm();
      fetchAddresses();
    } else {
      const data = await res.json();
      toast.error(data.error || 'သိမ်းဆည်း၍မရပါ');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('ဤလိပ်စာကို ဖျက်မှာသေချာပါသလား')) return;
    const token = getToken();
    if (!token) return;
    await fetch(`/api/user/addresses/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    toast.success('လိပ်စာ ဖျက်ပြီးပါပြီ');
    fetchAddresses();
  };

  if (loading) return (
    <div className="space-y-3 animate-pulse">
      <div className="h-8 bg-zinc-800 rounded-lg w-1/3" />
      <div className="h-20 bg-zinc-800 rounded-xl" />
      <div className="h-20 bg-zinc-800 rounded-xl" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><MapPin className="w-5 h-5 text-purple-400" /> လိပ်စာများ</h2>
        <Button size="sm" onClick={() => { setEditingId(null); resetForm(); }} className="gap-1 bg-purple-600 hover:bg-purple-700"><Plus className="w-4 h-4" /> အသစ်</Button>
      </div>

      <AnimatePresence>
        {(editingId !== null || addresses.length === 0) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700 rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold text-sm text-purple-400">{editingId ? 'လိပ်စာ ပြင်ဆင်ရန်' : 'လိပ်စာ အသစ်ထည့်ရန်'}</h3>

              {/* Label selector */}
              <div className="flex gap-2">
                {[
                  { key: 'နေအိမ်', icon: <Home className="w-4 h-4" /> },
                  { key: 'အလုပ်', icon: <Briefcase className="w-4 h-4" /> },
                  { key: 'အခြား', icon: <MapPin className="w-4 h-4" /> },
                ].map(item => (
                  <button key={item.key} onClick={() => setForm({...form, label: item.key})}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all ${form.label === item.key ? 'bg-purple-600 text-white shadow-lg' : 'bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700'}`}>
                    {item.icon} {item.key}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="အမည်အပြည့်အစုံ *" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="bg-zinc-900/50 border-zinc-700 text-white" />
                <Input placeholder="ဖုန်းနံပါတ် *" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="bg-zinc-900/50 border-zinc-700 text-white" />
              </div>

              {/* Autocomplete Search */}
              <div className="relative">
                <label className="text-xs text-zinc-400 mb-1 block">လိပ်စာ ရှာဖွေရန် (အလိုအလျောက်)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="လိပ်စာကို ရိုက်ထည့်ပါ..."
                    value={query}
                    onChange={handleQueryChange}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 outline-none focus:border-purple-500"
                  />
                  {loadingSuggestions && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400 animate-spin" />}
                </div>
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-zinc-800 border border-zinc-600 rounded-xl overflow-hidden shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => selectSuggestion(s)}
                        className="w-full text-left px-4 py-3 hover:bg-zinc-700 text-sm text-zinc-200 border-b border-zinc-700/50 last:border-0"
                      >
                        <MapPin className="w-3 h-3 inline mr-2 text-purple-400" /> {s.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Manual Address */}
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">လိပ်စာ အသေးစိတ်</label>
                <Input
                  placeholder="လိပ်စာ အလိုအလျောက်ဖြည့်မည်"
                  value={form.manual_address}
                  onChange={e => setForm({...form, manual_address: e.target.value})}
                  className="bg-zinc-900/50 border-zinc-700 text-white"
                  readOnly
                />
              </div>

              {/* Region/District/Township/Ward */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">တိုင်း/ပြည်နယ်</label>
                  <select value={form.region} onChange={e => { setForm({...form, region: e.target.value, district:'', township:''}); fetchDistricts(e.target.value); }} className="w-full p-2.5 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white">
                    <option value="">ရွေးချယ်ပါ</option>
                    {regions.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">ခရိုင်</label>
                  <select value={form.district} onChange={e => { setForm({...form, district: e.target.value, township:''}); fetchTownships(e.target.value); }} disabled={!form.region || loadingDistricts} className="w-full p-2.5 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white disabled:opacity-50">
                    <option value="">{loadingDistricts ? 'ဆွဲယူနေသည်...' : 'ရွေးချယ်ပါ'}</option>
                    {districts.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">မြို့နယ်</label>
                  <select value={form.township} onChange={e => setForm({...form, township: e.target.value})} disabled={!form.district || loadingTownships} className="w-full p-2.5 bg-zinc-900/50 border border-zinc-700 rounded-xl text-white disabled:opacity-50">
                    <option value="">{loadingTownships ? 'ဆွဲယူနေသည်...' : 'ရွေးချယ်ပါ'}</option>
                    {townships.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">ရပ်ကွက် / ကျေးရွာအုပ်စု</label>
                  <Input placeholder="ထည့်လိုပါက" value={form.ward} onChange={e => setForm({...form, ward: e.target.value})} className="bg-zinc-900/50 border-zinc-700 text-white" />
                </div>
              </div>

              {form.latitude && form.longitude && (
                <div className="text-xs text-zinc-500 flex gap-2">
                  <span>📍 Lat: {form.latitude.toFixed(5)}</span>
                  <span>Lng: {form.longitude.toFixed(5)}</span>
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_default} onChange={e => setForm({...form, is_default: e.target.checked})} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 checked:bg-purple-600" />
                <span className="text-sm text-zinc-300">မူလလိပ်စာအဖြစ်သတ်မှတ်မည်</span>
              </label>

              <Button onClick={handleSave} className="w-full gap-2 bg-purple-600 hover:bg-purple-700"><Check className="w-4 h-4" /> {editingId ? 'လိပ်စာ ပြင်ဆင်မည်' : 'လိပ်စာ သိမ်းဆည်းမည်'}</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Address List */}
      <div className="space-y-3">
        <AnimatePresence>
          {addresses.map(addr => (
            <motion.div key={addr.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-purple-500/20 transition-all group">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-bold flex items-center gap-2">
                    {addr.label === 'နေအိမ်' && <Home className="w-4 h-4 text-blue-400" />}
                    {addr.label === 'အလုပ်' && <Briefcase className="w-4 h-4 text-green-400" />}
                    {addr.label === 'အခြား' && <MapPin className="w-4 h-4 text-yellow-400" />}
                    {addr.label}
                    {addr.is_default && <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">မူလ</span>}
                  </p>
                  <p className="text-sm text-zinc-300 mt-1">{addr.full_name} | {addr.phone}</p>
                  <p className="text-sm text-zinc-400 mt-0.5">
                    {addr.manual_address || `${addr.ward || ''}, ${addr.township || ''}, ${addr.district || ''}, ${addr.region || ''}`}
                  </p>
                  {addr.latitude && addr.longitude && (
                    <p className="text-xs text-zinc-600 mt-1">📍 {addr.latitude.toFixed(4)}, {addr.longitude.toFixed(4)}</p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" onClick={() => {
                    setEditingId(addr.id);
                    setForm({
                      label: addr.label, full_name: addr.full_name, phone: addr.phone,
                      region: addr.region || '', district: addr.district || '', township: addr.township || '',
                      ward: addr.ward || '', manual_address: addr.manual_address || '',
                      is_default: addr.is_default,
                      latitude: addr.latitude, longitude: addr.longitude,
                    });
                    setQuery(addr.manual_address || '');
                  }}><Edit3 className="w-4 h-4 text-blue-400" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(addr.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {addresses.length === 0 && !editingId && (
          <div className="text-center py-12 text-zinc-500">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">သိမ်းဆည်းထားသော လိပ်စာမရှိပါ</p>
            <p className="text-xs text-zinc-600 mt-1">ပထမဆုံးလိပ်စာ ထည့်ပါ</p>
          </div>
        )}
      </div>
    </div>
  );
}
