/**
 * 自定义分析埋点系统
 * 数据发送到 WordPress MySQL 数据库
 */

// 事件类型定义
export type EventType =
  | 'page_view'           // 页面浏览
  | 'session_start'       // 会话开始
  | 'product_view'        // 查看产品
  | 'add_to_cart'         // 加购
  | 'remove_from_cart'    // 移除购物车
  | 'begin_checkout'      // 开始结账
  | 'purchase'            // 完成购买
  | 'user_login'          // 用户登录
  | 'user_register';      // 用户注册

// 设备类型
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

// 事件数据接口
interface AnalyticsEvent {
  event_type: EventType;
  session_id: string;
  user_id?: number | null;
  page_url: string;
  referrer: string;
  device_type: DeviceType;
  data?: any;
}

// 分析类
class Analytics {
  private sessionId: string;
  private userId: number | null = null;
  private apiEndpoint: string;
  private deviceType: DeviceType;
  private isInitialized: boolean = false;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.deviceType = this.detectDeviceType();
    this.apiEndpoint = '/api/analytics/track';
  }

  // 初始化分析系统
  init() {
    if (this.isInitialized) return;

    // 检查是否有登录用户
    this.checkLoggedInUser();

    // 发送会话开始事件
    this.track('session_start');

    // 发送页面浏览事件
    this.track('page_view');

    this.isInitialized = true;
  }

  // 获取或创建会话ID
  private getOrCreateSessionId(): string {
    const storageKey = 'analytics_session_id';
    const sessionDuration = 30 * 60 * 1000; // 30分钟

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();

        // 如果会话未过期，返回现有ID
        if (now - data.timestamp < sessionDuration) {
          // 更新时间戳
          data.timestamp = now;
          localStorage.setItem(storageKey, JSON.stringify(data));
          return data.sessionId;
        }
      }
    } catch (e) {
      console.error('Failed to get session ID:', e);
    }

    // 创建新会话ID
    const newSessionId = this.generateSessionId();
    const data = {
      sessionId: newSessionId,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to store session ID:', e);
    }

    return newSessionId;
  }

  // 生成唯一会话ID
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 检测设备类型
  private detectDeviceType(): DeviceType {
    const ua = navigator.userAgent;

    // 检测移动设备
    if (/(android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini)/i.test(ua)) {
      // 检测平板
      if (/(ipad|android(?!.*mobile)|tablet)/i.test(ua) ||
          (window.innerWidth >= 768 && window.innerWidth <= 1024)) {
        return 'tablet';
      }
      return 'mobile';
    }

    return 'desktop';
  }

  // 检查登录用户
  private checkLoggedInUser() {
    try {
      const session = localStorage.getItem('woo_session');
      if (session) {
        const data = JSON.parse(atob(session));
        this.userId = data.userId || null;
      }
    } catch (e) {
      // 用户未登录
    }
  }

  // 设置用户ID（登录后调用）
  setUserId(userId: number) {
    this.userId = userId;
  }

  // 追踪事件
  async track(eventType: EventType, data?: any) {
    const event: AnalyticsEvent = {
      event_type: eventType,
      session_id: this.sessionId,
      user_id: this.userId,
      page_url: window.location.href,
      referrer: document.referrer || 'direct',
      device_type: this.deviceType,
      data: data || {},
    };

    try {
      // 发送到后端API（不阻塞）
      fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
        // 使用 keepalive 确保页面关闭时也能发送
        keepalive: true,
      }).catch(err => {
        console.error('Analytics error:', err);
      });
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  // 追踪页面浏览
  trackPageView() {
    this.track('page_view');
  }

  // 追踪产品浏览
  trackProductView(productId: number, productName: string, price: number, category?: string) {
    this.track('product_view', {
      product_id: productId,
      product_name: productName,
      price: price,
      category: category,
    });
  }

  // 追踪加购
  trackAddToCart(productId: number, productName: string, price: number, quantity: number, variationId?: number) {
    this.track('add_to_cart', {
      product_id: productId,
      variation_id: variationId,
      product_name: productName,
      price: price,
      quantity: quantity,
      value: price * quantity,
    });
  }

  // 追踪移除购物车
  trackRemoveFromCart(productId: number, productName: string, price: number, quantity: number) {
    this.track('remove_from_cart', {
      product_id: productId,
      product_name: productName,
      price: price,
      quantity: quantity,
    });
  }

  // 追踪开始结账
  trackBeginCheckout(cartItems: any[], total: number) {
    this.track('begin_checkout', {
      items: cartItems,
      value: total,
      items_count: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    });
  }

  // 追踪购买完成
  trackPurchase(orderId: string, total: number, cartItems: any[]) {
    this.track('purchase', {
      order_id: orderId,
      value: total,
      items: cartItems,
      items_count: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    });
  }

  // 追踪用户登录
  trackUserLogin(userId: number) {
    this.setUserId(userId);
    this.track('user_login', {
      user_id: userId,
    });
  }

  // 追踪用户注册
  trackUserRegister(userId: number) {
    this.setUserId(userId);
    this.track('user_register', {
      user_id: userId,
    });
  }
}

// 创建单例
const analytics = new Analytics();

// 导出
export default analytics;

// 自动初始化（页面加载时）
if (typeof window !== 'undefined') {
  // 等待 DOM 加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      analytics.init();
    });
  } else {
    analytics.init();
  }
}
