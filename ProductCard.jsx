import React from 'react';
import { Plus } from 'lucide-react';

export default function ProductCard({ product, onAddToCart }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition duration-200 flex flex-col border border-gray-100">
      <div className="relative h-48 w-full bg-gray-100">
        <img 
          src={product.image || "/api/placeholder/400/300"} 
          alt={product.title} 
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-gray-800 text-base line-clamp-2 min-h-[3rem]">{product.title}</h3>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2 flex-1">{product.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-lg font-extrabold text-red-500">{product.price.toLocaleString()} Ks</span>
          <button 
            onClick={() => onAddToCart(product)}
            className="bg-gray-900 text-white p-2 rounded-full hover:bg-red-500 transition"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
