import { describe, it, expect, beforeEach } from 'vitest';
import useCartStore from '../store/cartStore';

describe('Cart Store', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [] });
  });
  it('adds item to cart', () => {
    const product = { id: '1', title: 'Test', price: 100, media: [] };
    useCartStore.getState().addItem(product);
    expect(useCartStore.getState().items).toHaveLength(1);
  });
  it('calculates total amount', () => {
    const product = { id: '1', title: 'Test', price: 100, media: [] };
    useCartStore.getState().addItem(product, 2);
    expect(useCartStore.getState().totalAmount()).toBe(200);
  });
});
