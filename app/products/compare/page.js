'use client';
import { useState } from 'react';
export default function ComparePage() {
  const [ids, setIds] = useState([]);
  const [products, setProducts] = useState([]);
  const addProduct = async () => {
    const id = prompt('Product ID');
    if (id) {
      const res = await fetch('/api/products/' + id);
      const data = await res.json();
      setProducts(prev => [...prev, data]);
    }
  };
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Compare Products</h1>
      <button onClick={addProduct} className="px-4 py-2 bg-blue-600 text-white rounded mb-4">Add Product</button>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(p => (
          <div key={p.id} className="glass-card p-4">
            <h3>{p.title}</h3>
            <p>{p.price} Ks</p>
          </div>
        ))}
      </div>
    </div>
  );
}
