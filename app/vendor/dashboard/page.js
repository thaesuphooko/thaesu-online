'use client';
import { useState, useEffect } from 'react';

export default function VendorDashboard() {
  const [token, setToken] = useState('');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken') || '';
    setToken(savedToken);
    if (savedToken) {
      fetchProducts(savedToken);
      fetchOrders(savedToken);
    }
  }, []);

  const fetchProducts = async (tok) => {
    const res = await fetch('/api/vendor/products', { headers: { Authorization: `Bearer ${tok}` } });
    if (res.ok) setProducts(await res.json());
  };
  const fetchOrders = async (tok) => {
    const res = await fetch('/api/vendor/orders', { headers: { Authorization: `Bearer ${tok}` } });
    if (res.ok) setOrders(await res.json());
  };

  return (
    <div className="max-w-6xl mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Vendor Dashboard</h1>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">My Products ({products.length})</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.slice(0,8).map(p => (
            <div key={p.id} className="glass-card p-3">
              <p className="font-bold">{p.title}</p>
              <p className="text-sm">Stock: {p.stock}</p>
              <p className="text-sm">Price: {p.price}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Recent Orders</h2>
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.order_id} className="glass-card p-4">
              <div className="flex justify-between">
                <span className="font-mono">{o.order_id.slice(0,8)}</span>
                <span className="font-bold">{o.total_amount} Ks</span>
                <span className="capitalize">{o.status}</span>
              </div>
              <ul className="text-sm mt-2">
                {o.items.map((item, idx) => (
                  <li key={idx}>{item.title} x {item.qty}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
