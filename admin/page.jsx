
"use jsx"
import React, { useState, useEffect } from 'react';
import { Package, Check, X, RefreshCw, Eye } from 'lucide-react';

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    const res = await fetch('/api/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, status: newStatus })
    });
    if (res.ok) {
      fetchOrders();
    } else {
      alert("အခြေအနေပြောင်းလဲခြင်း မအောင်မြင်ပါ");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-black text-gray-800 flex items-center">
              <Package className="mr-2 h-7 w-7 text-red-500" /> Thae Su Fruit - Admin Panel
            </h1>
            <p className="text-xs text-gray-500 mt-1">ဝင်လာသမျှ သစ်သီးအော်ဒါများနှင့် NgweLwairဖြတ်ပိုင်းများကို စစ်ဆေးရန်နေရာ</p>
          </div>
          <button 
            onClick={fetchOrders}
            className="flex items-center justify-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-gray-50 transition"
          >
            <RefreshCw className={h-4 w-4 ${loading ? 'animate-spin' : ''}} />
            <span>အသစ်ပြန်ယူမည် (Refresh)</span>
          </button>
        </div>

        {/* Orders Table/List */}
        {loading ? (
          <div className="text-center py-12 text-sm text-gray-400">အော်ဒါများ ဆွဲယူနေပါသည်...</div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm text-gray-400 text-sm">
            လက်ရှိတွင် မည်သည့်အော်ဒါမှ မရှိသေးပါဗျာ။
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold text-gray-800">{order.customerName}</span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-sm text-gray-600 font-medium">{order.customerPhone}</span>
                    <span className={text-xs px-2.5 py-1 rounded-full font-bold ${
                      order.status === 'completed' ? 'bg-green-100 text-green-700' : 
                      order.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }}>
                      {order.status === 'completed' ? 'ငွေလက်ခံရရှိပြီး' : order.status === 'rejected' ? 'ပယ်ဖျက်လိုက်သည်' : 'စစ်ဆေးဆဲ (Pending)'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500"><span className="font-semibold text-gray-700">ပို့ရမည့်လိပ်စာ:</span> {order.deliveryAddress}</p>
                  <div className="border-t border-gray-50 pt-2">

<span className="text-xs font-bold text-gray-700">မှာယူသည့်ပစ္စည်းများ:</span>
                    <div className="text-xs text-gray-500 mt-1 space-y-1">
                      {order.items?.map((item, idx) => (
                        <div key={idx}>• {item.title} ({item.price.toLocaleString()} Ks)</div>
                      ))}
                    </div>
                  </div>
                  <div className="text-base font-black text-red-500 pt-1">
                    စုစုပေါင်းကျသင့်ငွေ - {order.total?.toLocaleString()} Ks
                  </div>
                </div>

                {/* Screenshot & Actions */}
                <div className="flex items-center space-x-4 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
                  {order.paymentScreenshot && (
                    <div className="relative group cursor-pointer" onClick={() => setSelectedScreenshot(order.paymentScreenshot)}>
                      <img src={order.paymentScreenshot} alt="Payslip" className="w-20 h-24 object-cover rounded-xl border border-gray-200" />
                      <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <Eye className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}

                  {order.status === 'pending' && (
                    <div className="flex flex-col space-y-2">
                      <button 
                        onClick={() => updateStatus(order.id, 'completed')}
                        className="flex items-center space-x-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition"
                      >
                        <Check className="h-3.5 w-3.5" /> <span>ငွေမှန်၊ အတည်ပြုမည်</span>
                      </button>
                      <button 
                        onClick={() => updateStatus(order.id, 'rejected')}
                        className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold transition"
                      >
                        <X className="h-3.5 w-3.5" /> <span>ငွေမဝင်၊ ပယ်ဖျက်မည်</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Image Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedScreenshot(null)}>
          <div className="max-w-md w-full bg-white rounded-2xl overflow-hidden p-2">
            <img src={selectedScreenshot} alt="Full Payslip" className="w-full h-auto max-h-[80vh] object-contain rounded-xl" />
            <button className="w-full mt-2 bg-gray-900 text-white py-2 text-sm font-bold rounded-xl">ပိတ်မည်</button>
          </div>
        </div>
      )}
    </div>
  );
                          }
