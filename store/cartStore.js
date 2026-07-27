import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      // ========== State ==========
      items: [],
      coupon: null,            // { code, type: 'percent'|'fixed', value }
      shippingMethod: 'standard', // 'standard','express'
      giftWrap: false,
      notes: '',               // general order notes

      // ========== Actions ==========

      /** Add item to cart with optional variant and notes */
      addItem: (product, quantity = 1, variant = null, itemNote = '') => {
        const price = parseFloat(product.price) || 0;
        const compareAtPrice = product.compare_at_price ? parseFloat(product.compare_at_price) : null;
        const items = get().items;
        // Build a unique key: product_id + variant (if any)
        const key = variant ? `${product.id}_${variant}` : product.id;
        const existing = items.find(i => i.cartKey === key);

        if (existing) {
          set({
            items: items.map(i =>
              i.cartKey === key
                ? { ...i, quantity: i.quantity + quantity, itemNote: itemNote || i.itemNote }
                : i
            ),
          });
        } else {
          set({
            items: [
              ...items,
              {
                cartKey: key,
                product_id: product.id,
                title: product.title,
                price: price,
                compareAtPrice,
                variant: variant || null,
                image: product.media?.[0]?.url || '/placeholder.jpg',
                quantity,
                itemNote,
                addedAt: Date.now(),
                stock: product.stock || 0, // snapshot of stock at add time
              },
            ],
          });
        }
      },

      /** Remove item by cartKey */
      removeItem: (cartKey) => {
        set({ items: get().items.filter(i => i.cartKey !== cartKey) });
      },

      /** Update quantity (0 = remove) */
      updateQuantity: (cartKey, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartKey);
          return;
        }
        set({
          items: get().items.map(i =>
            i.cartKey === cartKey ? { ...i, quantity } : i
          ),
        });
      },

      /** Update item note */
      updateItemNote: (cartKey, note) => {
        set({
          items: get().items.map(i =>
            i.cartKey === cartKey ? { ...i, itemNote: note } : i
          ),
        });
      },

      /** Apply coupon */
      applyCoupon: (coupon) => {
        set({ coupon });
      },

      /** Remove coupon */
      removeCoupon: () => {
        set({ coupon: null });
      },

      /** Set shipping method */
      setShippingMethod: (method) => {
        set({ shippingMethod: method });
      },

      /** Toggle gift wrap */
      toggleGiftWrap: () => {
        set(state => ({ giftWrap: !state.giftWrap }));
      },

      /** Set order notes */
      setNotes: (notes) => {
        set({ notes });
      },

      /** Clear cart */
      clearCart: () => set({ items: [], coupon: null, giftWrap: false, notes: '', shippingMethod: 'standard' }),

      // ========== Computed Values (getters) ==========

      /** Subtotal (sum of price * quantity) */
      subtotal: () => {
        return get().items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);
      },

      /** Discount amount from coupon */
      discountAmount: () => {
        const { coupon, items } = get();
        if (!coupon) return 0;
        const subtotal = get().subtotal();
        if (coupon.type === 'fixed') return Math.min(coupon.value, subtotal);
        if (coupon.type === 'percent') return (subtotal * coupon.value) / 100;
        return 0;
      },

      /** Shipping cost */
      shippingCost: () => {
        const method = get().shippingMethod;
        if (method === 'express') return 3000; // example
        return 1500; // standard
      },

      /** Gift wrap cost */
      giftWrapCost: () => (get().giftWrap ? 1000 : 0),

      /** Final total */
      totalAmount: () => {
        const subtotal = get().subtotal();
        const discount = get().discountAmount();
        const shipping = get().shippingCost();
        const giftWrap = get().giftWrapCost();
        return Math.max(0, subtotal - discount + shipping + giftWrap);
      },

      /** Count of total items */
      totalItems: () => {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },

      /** Check if any item has low stock (≤ 5) */
      lowStockItems: () => {
        return get().items.filter(i => i.stock <= 5 && i.stock > 0);
      },

      /** Merge guest cart with logged‑in user cart (call after login) */
      mergeWithServerCart: async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return;
          // Fetch server cart
          const res = await fetch('/api/cart', { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) return;
          const serverItems = await res.json(); // array of cart items
          const localItems = get().items;

          // Merge: add local items to server via API, then set state to server
          for (const local of localItems) {
            const existing = serverItems.find(s => s.product_id === local.product_id);
            if (!existing) {
              // Add to server cart
              await fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ product_id: local.product_id, quantity: local.quantity }),
              });
            }
          }
          // Reload from server and set local
          const refreshed = await fetch('/api/cart', { headers: { Authorization: `Bearer ${token}` } });
          const refreshedItems = await refreshed.json();
          // Map server items to local format
          set({
            items: refreshedItems.map(item => ({
              cartKey: item.product_id,
              product_id: item.product_id,
              title: item.title,
              price: parseFloat(item.price) || 0,
              compareAtPrice: item.compare_at_price ? parseFloat(item.compare_at_price) : null,
              image: item.media?.[0]?.url || '/placeholder.jpg',
              quantity: item.quantity,
              variant: null,
              itemNote: '',
              addedAt: Date.now(),
              stock: item.stock || 0,
            })),
          });
        } catch (e) {
          console.error('Cart merge error:', e);
        }
      },
    }),
    {
      name: 'thaesu-cart',
      storage: createJSONStorage(() => localStorage),
      // Only persist items, coupon, giftWrap, shippingMethod, notes (not server merge)
      partialize: (state) => ({
        items: state.items,
        coupon: state.coupon,
        giftWrap: state.giftWrap,
        shippingMethod: state.shippingMethod,
        notes: state.notes,
      }),
    }
  )
);

export default useCartStore;
