import React from 'react';
import { ShoppingCart } from 'lucide-react';

export default function ProductCard({ product, onAddToCart }) {
  // ကုန်ပစ္စည်းတစ်ခုချင်းစီကို ပြသပေးမည့် UI ကတ်ကလေး
  return (
    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition duration-300 flex flex-col h-full">
      <div className="relative pt-[80%] bg-gray-50 overflow-hidden">
        <img 
          src={product.image} 
          alt={product.title} 
          className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition duration-500"
        />
      </div>
      <div className="p-5 flex flex-col flex-grow justify-between space-y-4">
        <div className="space-y-1.5">
          <h3 className="text-base font-black text-gray-800 line-clamp-1">{product.title}</h3>
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{product.description}</p>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <span className="text-base font-black text-red-500">
            {product.price?.toLocaleString()} Ks
          </span>
          <button 
            onClick={() => onAddToCart(product)}
            className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-2xl shadow-sm hover:shadow transition flex items-center justify-center"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
