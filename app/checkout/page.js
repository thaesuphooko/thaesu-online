'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import useCartStore from '@/store/cartStore';
import dynamic from 'next/dynamic';
import {
  Package, Truck, Home, CreditCard, CheckCircle, Clock, Upload, Gift, MapPin, Phone, User,
  ChevronRight, ChevronLeft, Download, Sparkles, Loader2, ShieldCheck, FileText, ExternalLink,
  ShoppingBag, LogIn
} from 'lucide-react';

// ---------- Dynamic PDF Renderer (Client‑side only) ----------
const PDFDownloadLink = dynamic(() => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink), { ssr: false });

// ---------- Constants ----------
const STORAGE_KEY = 'thaesu_checkout_form';
const WAVE_PAY_NUMBER = '09779799337';

// ---------- Utility functions ----------
const formatPhone = (val) => {
  const digits = val.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0,3)}-${digits.slice(3)}`;
  return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6,10)}`;
};

const getSLA = (address) => {
  if (!address) return '2-3 days';
  const city = address.city || address.township || '';
  const nearby = ['ရန်ကုန်','မန္တလေး','နေပြည်တော်','ပုသိမ်'];
  const isNear = nearby.some(c => city.includes(c));
  return isNear ? '1-2 days' : '3-5 days';
};

// ========== PREMIUM ULTRA INVOICE TEMPLATE ==========
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2', fontWeight: 'normal' },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2', fontWeight: 'bold' },
  ],
});

const invoiceStyles = StyleSheet.create({
  page: { padding: 40, backgroundColor: '#0a0a0f', fontFamily: 'Inter' },
  glassCard: { backgroundColor: '#1a1a2e', borderRadius: 20, padding: 30, border: '1px solid #2a2a4a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, borderBottom: '1px solid #2a2a4a', paddingBottom: 20 },
  logo: { fontSize: 32, fontWeight: 'bold', color: '#a855f7' },
  logoAccent: { fontSize: 32, fontWeight: 'bold', color: '#ffffff' },
  invoiceTag: { backgroundColor: '#a855f7', color: '#ffffff', padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 'bold' },
  orderId: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#e5e7eb', marginBottom: 16 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1f2937', paddingVertical: 14, alignItems: 'center' },
  cellProduct: { flex: 4, fontSize: 14, color: '#e5e7eb' },
  cellQty: { flex: 1, fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  cellPrice: { flex: 2, fontSize: 14, color: '#e5e7eb', textAlign: 'right' },
  totalSection: { marginTop: 24, borderTopWidth: 1, borderTopColor: '#2a2a4a', paddingTop: 20, flexDirection: 'row', justifyContent: 'flex-end' },
  totalLabel: { fontSize: 20, fontWeight: 'bold', color: '#e5e7eb', marginRight: 12 },
  totalAmount: { fontSize: 20, fontWeight: 'bold', color: '#a855f7' },
  footer: { marginTop: 30, borderTopWidth: 1, borderTopColor: '#2a2a4a', paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 10, color: '#6b7280' },
  hashText: { fontSize: 8, color: '#4b5563', textAlign: 'center', marginTop: 20 },
  contactInfo: { fontSize: 10, color: '#6b7280', textAlign: 'right' },
  qrPlaceholder: { width: 60, height: 60, backgroundColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  qrText: { fontSize: 8, color: '#9ca3af', textAlign: 'center' },
});

const PremiumUltraInvoice = ({ order, items }) => (
  <Document>
    <Page size="A4" style={invoiceStyles.page}>
      <View style={invoiceStyles.glassCard}>
        <View style={invoiceStyles.header}>
          <View>
            <Text>
              <Text style={invoiceStyles.logo}>THAESU</Text>
              <Text style={invoiceStyles.logoAccent}> PREMIUM</Text>
            </Text>
            <Text style={invoiceStyles.orderId}>Transaction #{order.order_id?.slice(0,8) || 'N/A'}</Text>
          </View>
          <View><Text style={invoiceStyles.invoiceTag}>INVOICE</Text></View>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 24, gap: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>BILLED TO</Text>
            <Text style={{ fontSize: 14, color: '#e5e7eb' }}>{order.full_name || 'Customer'}</Text>
            <Text style={{ fontSize: 12, color: '#9ca3af' }}>{order.phone || ''}</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>ORDER DATE</Text>
            <Text style={{ fontSize: 14, color: '#e5e7eb' }}>{new Date(order.created_at).toLocaleDateString()}</Text>
            <Text style={{ fontSize: 12, color: '#9ca3af' }}>PAYMENT: WAVE PAY</Text>
          </View>
        </View>
        <Text style={invoiceStyles.sectionTitle}>ORDER SUMMARY</Text>
        <View style={{ marginBottom: 12 }}>
          <View style={[invoiceStyles.row, { borderBottomWidth: 2, borderBottomColor: '#a855f7' }]}>
            <Text style={[invoiceStyles.cellProduct, { fontSize: 11, color: '#9ca3af', fontWeight: 'bold' }]}>ITEM</Text>
            <Text style={[invoiceStyles.cellQty, { fontSize: 11, color: '#9ca3af', fontWeight: 'bold' }]}>QTY</Text>
            <Text style={[invoiceStyles.cellPrice, { fontSize: 11, color: '#9ca3af', fontWeight: 'bold' }]}>PRICE</Text>
          </View>
          {items.map((item, idx) => (
            <View key={idx} style={invoiceStyles.row}>
              <Text style={invoiceStyles.cellProduct}>{item.title}</Text>
              <Text style={invoiceStyles.cellQty}>{item.quantity}</Text>
              <Text style={invoiceStyles.cellPrice}>{(item.price * item.quantity).toLocaleString()} Ks</Text>
            </View>
          ))}
        </View>
        <View style={invoiceStyles.totalSection}>
          <Text style={invoiceStyles.totalLabel}>TOTAL</Text>
          <Text style={invoiceStyles.totalAmount}>{(order.total_amount || 0).toLocaleString()} Ks</Text>
        </View>
        <View style={invoiceStyles.footer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={invoiceStyles.qrPlaceholder}><Text style={invoiceStyles.qrText}>QR</Text></View>
            <Text style={invoiceStyles.footerText}>Scan to verify authenticity</Text>
          </View>
          <View>
            <Text style={invoiceStyles.contactInfo}>THAESU ONLINE</Text>
            <Text style={invoiceStyles.contactInfo}>support@thaesu.online</Text>
            <Text style={invoiceStyles.contactInfo}>09 779 799 337</Text>
          </View>
        </View>
        <Text style={invoiceStyles.hashText}>THS-SECURE-{order.order_id?.slice(0,12) || 'XXXX'}</Text>
      </View>
    </Page>
  </Document>
);

// ---------- Main Checkout Page ----------
export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalAmount, clearCart } = useCartStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orderResult, setOrderResult] = useState(null);

  // Auth state
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Form state
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    address_id: null,
    new_address: null,
    gift_wrap: false,
    screenshot: null,
  });

  // Saved addresses
  const [addresses, setAddresses] = useState([]);
  const [showAddressBook, setShowAddressBook] = useState(false);

  // Check login status & auto-fill profile
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        setIsLoggedIn(true);
        setForm(prev => ({
          ...prev,
          full_name: userData.name || userData.full_name || prev.full_name,
          phone: userData.phone || prev.phone,
        }));
      } catch(e) {}
    }
  }, []);

  // Fetch saved addresses if logged in
  useEffect(() => {
    if (!isLoggedIn) return;
    const token = localStorage.getItem('token');
    fetch('/api/user/addresses', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setAddresses(data.addresses || []))
      .catch(() => {});
  }, [isLoggedIn]);

  // Persist form to localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setForm(prev => ({ ...prev, ...JSON.parse(saved) })); } catch(e) {}
    }
  }, []);

  const updateForm = useCallback((key, value) => {
    setForm(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ full_name: updated.full_name, phone: updated.phone }));
      return updated;
    });
  }, []);

  // Real‑time validation
  const phoneValid = form.phone.length >= 7;
  const nameValid = form.full_name.trim().length > 0;
  const canProceed = nameValid && phoneValid && (form.address_id || form.new_address);

  // Compute total from items (robust)
  const computedTotal = items.reduce((sum, i) => sum + (parseFloat(i.price) || 0) * i.quantity, 0);
  const finalTotal = computedTotal + (form.gift_wrap ? 1000 : 0);

  const handlePlaceOrder = async () => {
    if (!canProceed) {
      toast.error('အမည်၊ ဖုန်းနံပါတ်နှင့် လိပ်စာ ဖြည့်သွင်းပါ');
      return;
    }
    setLoading(true);
    try {
      const body = {
        items: items.map(i => ({
          product_id: i.product_id,   // FIXED: was i.id
          title: i.title,
          quantity: i.quantity,
          price: parseFloat(i.price) || 0,
        })),
        total_amount: finalTotal,
        phone: form.phone,
        shipping_address: form.address_id ? { id: form.address_id } : form.new_address,
        user_id: user?.id || null,
      };
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.order_id) {
        setOrderResult({ ...data, items: body.items });
        setStep(3);
        clearCart();
        localStorage.removeItem(STORAGE_KEY);
        try { new Audio('/success.mp3').play(); } catch(e) {}
      } else {
        toast.error(data.error || 'Order failed');
      }
    } catch (e) { toast.error('Network error'); }
    setLoading(false);
  };

  const selectedAddress = addresses.find(a => a.id === form.address_id);

  return (
    <div className="min-h-screen bg-black text-white p-4 pt-24 pb-24">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Login prompt for guest users */}
        {!isLoggedIn && (
          <div className="glass-card p-4 flex items-center justify-between">
            <p className="text-sm text-zinc-400">
              <LogIn className="w-4 h-4 inline mr-1" />
              အကောင့်ဖွင့်ထားလျှင် လိပ်စာများ သိမ်းဆည်းနိုင်ပြီး ပိုမိုမြန်ဆန်စွာ ဝယ်ယူနိုင်ပါသည်
            </p>
            <Button variant="outline" size="sm" onClick={() => router.push('/auth/login')}>Login</Button>
          </div>
        )}

        {/* Step Tracker */}
        <div className="flex items-center gap-2 relative">
          {['Shipping', 'Payment', 'Confirmation'].map((label, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center relative z-10">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                step > idx+1 ? 'bg-purple-600' : step === idx+1 ? 'bg-purple-500 ring-4 ring-purple-500/30 scale-110' : 'bg-zinc-700 text-zinc-500'
              }`}>
                {step > idx+1 ? <CheckCircle className="w-5 h-5" /> : idx === 0 ? <Home className="w-5 h-5" /> : idx === 1 ? <CreditCard className="w-5 h-5" /> : <Package className="w-5 h-5" />}
              </div>
              <p className="text-xs mt-2 text-zinc-400">{label}</p>
            </div>
          ))}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-zinc-700 z-0">
            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${((step-1)/2)*100}%` }} />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ========== Step 1: Shipping ========== */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:20 }} className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2"><MapPin className="w-6 h-6 text-purple-400" /> Shipping Details</h2>
              <div className="glass-card p-6 space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="အမည်အပြည့်အစုံ"
                    value={form.full_name}
                    onChange={e => updateForm('full_name', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 bg-black/30 border rounded-xl text-white outline-none transition ${
                      nameValid ? 'border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'border-white/10 focus:border-purple-500'
                    }`}
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input
                    type="tel"
                    placeholder="ဖုန်းနံပါတ်"
                    value={form.phone}
                    onChange={e => updateForm('phone', formatPhone(e.target.value))}
                    className={`w-full pl-10 pr-4 py-3 bg-black/30 border rounded-xl text-white outline-none transition ${
                      phoneValid ? 'border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'border-white/10 focus:border-purple-500'
                    }`}
                  />
                </div>

                {/* Address Section */}
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">လိပ်စာ ရွေးချယ်ပါ</label>
                  {isLoggedIn && addresses.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {addresses.slice(0,3).map(addr => (
                        <button
                          key={addr.id}
                          onClick={() => { updateForm('address_id', addr.id); updateForm('new_address', null); }}
                          className={`w-full text-left p-3 rounded-xl border transition ${
                            form.address_id === addr.id ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-700 hover:border-zinc-600'
                          }`}
                        >
                          <p className="font-medium text-sm">{addr.full_name} | {addr.phone}</p>
                          <p className="text-xs text-zinc-400">{addr.manual_address || addr.street}</p>
                        </button>
                      ))}
                      <button onClick={() => setShowAddressBook(!showAddressBook)} className="text-purple-400 text-sm hover:underline">
                        {showAddressBook ? 'Hide' : 'See all addresses'}
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => { updateForm('address_id', null); updateForm('new_address', { full_name: form.full_name, phone: form.phone }); }}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      form.new_address ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <p className="text-sm text-zinc-400">+ အသစ်လိပ်စာထည့်မည်</p>
                    {form.new_address && <p className="text-xs text-purple-300 mt-1">Using: {form.new_address.full_name} / {form.new_address.phone}</p>}
                  </button>
                </div>

                {/* SLA */}
                {selectedAddress && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-blue-300">Estimated delivery: {getSLA(selectedAddress)}</span>
                  </div>
                )}

                <Button onClick={() => setStep(2)} disabled={!canProceed} className="w-full gap-2 bg-purple-600 hover:bg-purple-700">
                  Continue to Payment <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ========== Step 2: Payment ========== */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:20 }} className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2"><CreditCard className="w-6 h-6 text-purple-400" /> Payment</h2>
              <div className="glass-card p-6 space-y-4">
                {/* Order Summary */}
                <div className="space-y-2">
                  <h3 className="font-bold text-sm flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-purple-400" /> Order Summary</h3>
                  {items.map(item => (
                    <div key={item.product_id} className="flex justify-between items-center text-sm">
                      <span className="truncate flex-1">{item.title} x{item.quantity}</span>
                      <span className="text-purple-300 ml-4">{(parseFloat(item.price || 0) * item.quantity).toLocaleString()} Ks</span>
                    </div>
                  ))}
                  {form.gift_wrap && <div className="flex justify-between text-sm text-zinc-400"><span>Gift Wrap</span><span>1,000 Ks</span></div>}
                  <div className="flex justify-between font-bold text-lg border-t border-zinc-700 pt-2">
                    <span>Total</span>
                    <span className="text-purple-300">{finalTotal.toLocaleString()} Ks</span>
                  </div>
                </div>

                {/* WavePay */}
                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl space-y-2">
                  <p className="font-bold">WavePay ဖြင့် ငွေလွှဲရန်</p>
                  <p className="text-sm text-zinc-400">အောက်ပါ ဖုန်းနံပါတ်သို့ ငွေလွှဲပြီး Screenshot တင်ပါ</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-purple-300 border-purple-500/30">09 779 799 337 (Nandar)</Badge>
                    <a href={`wavepay://send?phone=${WAVE_PAY_NUMBER}&amount=${finalTotal}`} className="text-purple-400 hover:underline flex items-center gap-1">
                      <ExternalLink className="w-4 h-4" /> Open WavePay
                           </a>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => updateForm('screenshot', e.target.files[0])}
                    className="w-full p-2 bg-black/30 border border-white/10 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-500/20 file:text-purple-300"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.gift_wrap} onChange={e => updateForm('gift_wrap', e.target.checked)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 checked:bg-purple-600" />
                  <span className="text-sm">Gift Wrap (+1,000 Ks)</span>
                </label>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button onClick={handlePlaceOrder} disabled={loading} className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    {loading ? 'Placing Order...' : 'Place Order'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========== Step 3: Confirmation ========== */}
          {step === 3 && orderResult && (
            <motion.div key="step3" initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2"><CheckCircle className="w-6 h-6 text-green-400" /> Order Confirmed</h2>
              <div className="glass-card p-6 space-y-4 text-center">
                <Sparkles className="w-12 h-12 mx-auto text-yellow-400 animate-pulse" />
                <h3 className="text-xl font-bold">Thank you for your order!</h3>
                <p className="text-zinc-400">Order ID: <span className="font-mono text-purple-300">{orderResult.order_id.slice(0,8)}</span></p>
                <p className="text-sm text-zinc-500">We'll notify you when your order ships.</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button onClick={() => router.push(`/order-tracking?id=${orderResult.order_id}`)} className="gap-2">
                    <Truck className="w-4 h-4" /> Track Order
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/products')} className="gap-2">
                    <ShoppingBag className="w-4 h-4" /> Continue Shopping
                  </Button>
                  {typeof window !== 'undefined' && (
                    <PDFDownloadLink
                      document={<PremiumUltraInvoice order={orderResult} items={orderResult.items} />}
                      fileName={`Thaesu_Premium_Invoice_#${orderResult.order_id.slice(0,8)}.pdf`}
                      className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-medium transition gap-2"
                    >
                      {({ loading }) => (
                        loading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Encrypting Digital Ledger...</>
                        ) : (
                          <><Download className="w-4 h-4" /> Download Invoice</>
                        )
                      )}
                    </PDFDownloadLink>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
