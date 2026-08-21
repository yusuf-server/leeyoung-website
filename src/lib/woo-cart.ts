// WooCommerce Store API Cart Manager
// This replaces localStorage cart with WooCommerce server-side cart

export interface WooCartItem {
  key: string;
  id: number;
  quantity: number;
  name: string;
  short_description: string;
  description: string;
  sku: string;
  low_stock_remaining: number | null;
  backorders_allowed: boolean;
  show_backorder_badge: boolean;
  sold_individually: boolean;
  permalink: string;
  images: Array<{
    id: number;
    src: string;
    thumbnail: string;
    srcset: string;
    sizes: string;
    name: string;
    alt: string;
  }>;
  variation: any[];
  item_data: any[];
  prices: {
    price: string;
    regular_price: string;
    sale_price: string;
    price_range: any;
    currency_code: string;
    currency_symbol: string;
    currency_minor_unit: number;
    currency_decimal_separator: string;
    currency_thousand_separator: string;
    currency_prefix: string;
    currency_suffix: string;
    raw_prices: {
      precision: number;
      price: string;
      regular_price: string;
      sale_price: string;
    };
  };
  totals: {
    line_subtotal: string;
    line_subtotal_tax: string;
    line_total: string;
    line_total_tax: string;
    currency_code: string;
    currency_symbol: string;
    currency_minor_unit: number;
    currency_decimal_separator: string;
    currency_thousand_separator: string;
    currency_prefix: string;
    currency_suffix: string;
  };
}

export interface WooCart {
  items: WooCartItem[];
  items_count: number;
  items_weight: number;
  cross_sells: any[];
  needs_payment: boolean;
  needs_shipping: boolean;
  has_calculated_shipping: boolean;
  fees: any[];
  totals: {
    total_items: string;
    total_items_tax: string;
    total_fees: string;
    total_fees_tax: string;
    total_discount: string;
    total_discount_tax: string;
    total_shipping: string;
    total_shipping_tax: string;
    total_price: string;
    total_tax: string;
    tax_lines: any[];
    currency_code: string;
    currency_symbol: string;
    currency_minor_unit: number;
    currency_decimal_separator: string;
    currency_thousand_separator: string;
    currency_prefix: string;
    currency_suffix: string;
  };
  shipping_address: any;
  billing_address: any;
  shipping_rates: any[];
  coupons: any[];
  errors: any[];
  payment_methods: string[];
  payment_requirements: string[];
  extensions: any;
}

// Cart Manager for WooCommerce Store API
export class WooCartManager {
  // Get cart from WooCommerce
  static async getCart(): Promise<WooCart | null> {
    try {
      const response = await fetch('/api/cart', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch cart');
      }

      const cart = await response.json();
      return cart;
    } catch (error) {
      console.error('Error fetching cart:', error);
      return null;
    }
  }

  // Add item to cart
  static async addItem(productId: number, quantity: number = 1, variationId?: number): Promise<WooCart | null> {
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          product_id: productId,
          quantity: quantity,
          variation_id: variationId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add item to cart');
      }

      const cart = await response.json();

      // Trigger cart update event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('woo-cart-updated', { detail: cart }));
      }

      return cart;
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  }

  // Update cart item quantity
  static async updateQuantity(itemKey: string, quantity: number): Promise<WooCart | null> {
    try {
      const response = await fetch('/api/cart', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          item_key: itemKey,
          quantity: quantity,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update cart item');
      }

      const cart = await response.json();

      // Trigger cart update event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('woo-cart-updated', { detail: cart }));
      }

      return cart;
    } catch (error) {
      console.error('Error updating cart:', error);
      return null;
    }
  }

  // Remove item from cart
  static async removeItem(itemKey: string): Promise<WooCart | null> {
    try {
      const response = await fetch('/api/cart', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          item_key: itemKey,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove cart item');
      }

      const cart = await response.json();

      // Trigger cart update event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('woo-cart-updated', { detail: cart }));
      }

      return cart;
    } catch (error) {
      console.error('Error removing from cart:', error);
      return null;
    }
  }

  // Get cart item count
  static async getItemCount(): Promise<number> {
    const cart = await this.getCart();
    return cart?.items_count || 0;
  }

  // Helper: Format price
  static formatPrice(price: string, cart: WooCart): string {
    const numPrice = parseFloat(price) / Math.pow(10, cart.totals.currency_minor_unit);
    return `${cart.totals.currency_prefix}${numPrice.toFixed(2)}${cart.totals.currency_suffix}`;
  }

  // Helper: Get cart total
  static getCartTotal(cart: WooCart): string {
    return this.formatPrice(cart.totals.total_price, cart);
  }

  // Helper: Get cart subtotal
  static getCartSubtotal(cart: WooCart): string {
    return this.formatPrice(cart.totals.total_items, cart);
  }
}
