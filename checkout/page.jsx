
"use jsx"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, CheckCircle } from 'lucide-react';

export default function Checkout() {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const savedCart = localStorage.getItem('thae_su_cart');
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

  // Handle fake base64 preview for image
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setScreenshot(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!screenshot) {
      alert("ကျေးဇူးပြု၍ ငွေလွှဲဖြတ်ပိုင်း Screenshot အရင်တင်ပေးပါခင်ဗျာ။");
      return;
    }
    setLoading(true);

    const orderData = {
      customerName: name,
      customerPhone: phone,
      deliveryAddress: address,
      items: cart,
      total: totalPrice,
      paymentScreenshot: screenshot,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    if (res.ok) {
      localStorage.removeItem('thae_su_cart');
      setSuccess(true);
    } else {
      alert("အော်ဒါတင်ခြင်း မအောင်မြင်ပါ။ ပြန်လည်ကြိုးစားပေးပါ။");
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-md max-w-md w-full border border-gray-100">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">အော်ဒါတင်ခြင်း အောင်မြင်ပါသည်!</h2>
          <p className="text-sm text-gray-500 mt-2">ဝယ်ယူအားပေးမှုကို ကျေးဇူးတင်ပါသည်။ အဖွဲ့သားများမှ ငွေလွှဲဖြတ်ပိုင်းကို စစ်ဆေးပြီး ၁ နာရီအတွင်း ဆက်သွယ်ပေးပါမည်ဗျာ။</p>
          <button onClick={() => router.push('/')} className="mt-6 w-full bg-gradient-to-r from-pink-500 to-red-500 text-white py-2.5 rounded-xl font-bold">
            ဈေးဝယ်စင်မြင့်သို့ ပြန်သွားမည်
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center">
          <button onClick={() => router.push('/')} className="text-gray-600 mr-4">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-800">ငွေချေစနစ် (Checkout)</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-bold text-gray-800 mb-4">မှာယူထားသော ကုန်ပစ္စည်းစုစုပေါင်း</h2>
          <div className="text-2xl font-black text-red-500">{totalPrice.toLocaleString()} Ks</div>
          <p className="text-xs text-gray-400 mt-1">ပစ္စည်းအရေအတွက် - {cart.length} ခု</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">

<h2 className="font-bold text-gray-800 mb-2">ပို့ဆောင်ရမည့် လိပ်စာ</h2>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">အမည်</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-500" placeholder="မောင်မောင်" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">ဖုန်းနံပါတ်</label>
              <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-500" placeholder="09xxxxxxxxx" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">အိမ်လိပ်စာ အပြည့်အစုံ</label>
              <textarea required value={address} onChange={e => setAddress(e.target.value)} rows="3" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-500" placeholder="အမှတ်၊ လမ်း၊ မြို့နယ်၊ ရန်ကုန်။"></textarea>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <h2 className="font-bold text-gray-800 flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-red-500" /> ငွေလွှဲအကောင့်များ
            </h2>
            <div className="p-4 bg-red-50 rounded-xl space-y-2 text-sm text-gray-700">
              <div><span className="font-bold">Wave Money:</span> 09 456 789 123 (U Thae Su)</div>
              <div><span className="font-bold">KBZPay:</span> 09 456 789 123 (U Thae Su)</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">ငွေလွှဲဖြတ်ပိုင်း (Screenshot) တင်ရန်</label>
              <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
              {screenshot && <img src={screenshot} alt="Preview" className="mt-4 max-h-40 rounded-lg border border-gray-200" />}
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white py-3.5 rounded-xl font-bold shadow-md hover:opacity-90 transition disabled:opacity-50">
            {loading ? "အော်ဒါတင်နေပါသည်..." : "ငွေချေပြီး အော်ဒါတင်မည်"}
          </button>
        </form>
      </div>
    </div>
  );
}
