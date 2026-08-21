// LocalStorage Cart Manager
// Fast, client-side cart management

export interface CartItem {
  id: number;
  product_id: number;
  variation_id?: number;
  quantity: number;
  name: string;
  price: number;
  regular_price?: number;
  sale_price?: number;
  image?: string;
  permalink?: string;
  attributes?: Array<{
    name: string;
    value: string;
  }>;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  total: number;
}

const CART_KEY = 'leeyoung_cart';

export class CartManager {
  // Get cart from localStorage
  static getCart(): Cart {
    if (typeof window === 'undefined') {
      return { items: [], subtotal: 0, total: 0 };
    }

    try {
      const cartData = localStorage.getItem(CART_KEY);
      if (!cartData) {
        return { items: [], subtotal: 0, total: 0 };
      }

      const cart = JSON.parse(cartData);
      return cart;
    } catch (error) {
      console.error('Error reading cart:', error);
      return { items: [], subtotal: 0, total: 0 };
    }
  }

  // Save cart to localStorage
  static saveCart(cart: Cart): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));

      // Trigger cart update event
      window.dispatchEvent(new CustomEvent('cart-updated', { detail: cart }));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }

  // Calculate cart totals
  static calculateTotals(items: CartItem[]): { subtotal: number; total: number } {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal; // Can add tax/shipping calculation here if needed
    return { subtotal, total };
  }

  // Add item to cart
  static addItem(item: Omit<CartItem, 'id'>): Cart {
    const cart = this.getCart();

    // Check if item already exists (same product_id and variation_id)
    const existingItemIndex = cart.items.findIndex(
      i => i.product_id === item.product_id &&
           (i.variation_id || 0) === (item.variation_id || 0)
    );

    if (existingItemIndex > -1) {
      // Update quantity
      cart.items[existingItemIndex].quantity += item.quantity;
    } else {
      // Add new item with unique ID
      const newItem: CartItem = {
        ...item,
        id: Date.now() + Math.random(), // Simple unique ID
      };
      cart.items.push(newItem);
    }

    // Recalculate totals
    const totals = this.calculateTotals(cart.items);
    cart.subtotal = totals.subtotal;
    cart.total = totals.total;

    this.saveCart(cart);
    return cart;
  }

  // Update item quantity
  static updateQuantity(itemId: number, quantity: number): Cart {
    const cart = this.getCart();
    const itemIndex = cart.items.findIndex(i => i.id === itemId);

    if (itemIndex > -1) {
      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
      }

      // Recalculate totals
      const totals = this.calculateTotals(cart.items);
      cart.subtotal = totals.subtotal;
      cart.total = totals.total;

      this.saveCart(cart);
    }

    return cart;
  }

  // Remove item from cart
  static removeItem(itemId: number): Cart {
    const cart = this.getCart();
    cart.items = cart.items.filter(i => i.id !== itemId);

    // Recalculate totals
    const totals = this.calculateTotals(cart.items);
    cart.subtotal = totals.subtotal;
    cart.total = totals.total;

    this.saveCart(cart);
    return cart;
  }

  // Clear cart
  static clearCart(): void {
    const emptyCart: Cart = { items: [], subtotal: 0, total: 0 };
    this.saveCart(emptyCart);
  }

  // Get item count
  static getItemCount(): number {
    const cart = this.getCart();
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  // Format price
  static formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }
}
