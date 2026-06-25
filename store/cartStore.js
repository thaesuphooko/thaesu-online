import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1) => {
        const items = get().items;
        const existing = items.find(i => i.product_id === product.id);
        if (existing) {
          set({
            items: items.map(i =>
              i.product_id === product.id ? { ...i, quantity: i.quantity + quantity } : i
            )
          });
        } else {
          set({
            items: [
              ...items,
              {
                product_id: product.id,
                title: product.title,
                price: product.price,
                image: product.media?.[0]?.url || '',
                quantity,
              },
            ],
          });
        }
      },
      removeItem: (productId) => {
        set({ items: get().items.filter(i => i.product_id !== productId) });
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map(i =>
            i.product_id === productId ? { ...i, quantity } : i
          ),
        });
      },
      clearCart: () => set({ items: [] }),
      totalAmount: () => {
        return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      },
    }),
    { name: 'thaesu-cart' }
  )
);

export default useCartStore;
