// 购物车相关类型定义
export interface CartItem {
  id: number;
  product_id: number;
  name: string;
  slug: string;
  price: number;
  quantity: number;
  image: string;
  stock_status: string;
  max_quantity?: number;
}

export interface Cart {
  items: CartItem[];
  total: number;
  subtotal: number;
  tax: number;
  shipping: number;
}

// 购物车工具函数
export class CartManager {
  private static CART_KEY = 'leeyoung_cart';

  // 获取购物车
  static getCart(): Cart {
    if (typeof window === 'undefined') {
      return this.createEmptyCart();
    }

    try {
      const cartData = localStorage.getItem(this.CART_KEY);
      if (!cartData) {
        return this.createEmptyCart();
      }

      const cart = JSON.parse(cartData) as Cart;
      return this.calculateTotals(cart);
    } catch (error) {
      console.error('Error loading cart:', error);
      return this.createEmptyCart();
    }
  }

  // 保存购物车
  static saveCart(cart: Cart): void {
    if (typeof window === 'undefined') return;

    try {
      const updatedCart = this.calculateTotals(cart);
      localStorage.setItem(this.CART_KEY, JSON.stringify(updatedCart));

      // 触发自定义事件，通知其他组件购物车已更新
      window.dispatchEvent(new CustomEvent('cart-updated', { detail: updatedCart }));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }

  // 添加商品到购物车
  static addItem(item: Omit<CartItem, 'id'>): Cart {
    const cart = this.getCart();

    // 检查商品是否已存在
    const existingItemIndex = cart.items.findIndex(
      (i) => i.product_id === item.product_id
    );

    if (existingItemIndex > -1) {
      // 更新数量
      cart.items[existingItemIndex].quantity += item.quantity;
    } else {
      // 添加新商品
      const newItem: CartItem = {
        ...item,
        id: Date.now(), // 使用时间戳作为唯一 ID
      };
      cart.items.push(newItem);
    }

    this.saveCart(cart);
    // 返回重新计算后的购物车
    return this.getCart();
  }

  // 更新商品数量
  static updateQuantity(itemId: number, quantity: number): Cart {
    const cart = this.getCart();
    const item = cart.items.find((i) => i.id === itemId);

    if (item) {
      if (quantity <= 0) {
        // 如果数量为 0 或负数，移除商品
        return this.removeItem(itemId);
      }
      item.quantity = quantity;
    }

    this.saveCart(cart);
    // 返回重新计算后的购物车
    return this.getCart();
  }

  // 移除商品
  static removeItem(itemId: number): Cart {
    const cart = this.getCart();
    cart.items = cart.items.filter((i) => i.id !== itemId);
    this.saveCart(cart);
    // 返回重新计算后的购物车
    return this.getCart();
  }

  // 清空购物车
  static clearCart(): Cart {
    const emptyCart = this.createEmptyCart();
    this.saveCart(emptyCart);
    return emptyCart;
  }

  // 获取购物车商品数量
  static getItemCount(): number {
    const cart = this.getCart();
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  }

  // 计算总价
  private static calculateTotals(cart: Cart): Cart {
    const subtotal = cart.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

    // 如果购物车为空，所有费用都为0
    if (subtotal === 0) {
      return {
        ...cart,
        subtotal: 0,
        tax: 0,
        shipping: 0,
        total: 0,
      };
    }

    // 税费已移除
    const tax = 0;

    // 运费计算（可根据实际需求调整）
    const shipping = subtotal > 100 ? 0 : 0; // 免运费

    const total = subtotal + tax + shipping;

    return {
      ...cart,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      shipping: Math.round(shipping * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }

  // 创建空购物车
  private static createEmptyCart(): Cart {
    return {
      items: [],
      total: 0,
      subtotal: 0,
      tax: 0,
      shipping: 0,
    };
  }
}
