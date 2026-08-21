/**
 * 像素追踪事件工具函数
 * 用于在网站各处触发追踪事件
 */

import { pixelConfig } from '../config/pixels';

// Meta Pixel 事件
export const trackMetaEvent = (eventName: string, data?: any) => {
  if (pixelConfig.meta.enabled && typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', eventName, data);
  }
};

// Google Ads 转化事件
export const trackGoogleAdsConversion = (conversionLabel: string, value?: number) => {
  if (pixelConfig.googleAds.enabled && typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'conversion', {
      'send_to': `${pixelConfig.googleAds.conversionId}/${conversionLabel}`,
      'value': value || 0,
      'currency': 'USD'
    });
  }
};

// Google Analytics 事件
export const trackGAEvent = (eventName: string, params?: any) => {
  if (pixelConfig.googleAnalytics.enabled && typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, params);
  }
};

// TikTok Pixel 事件
export const trackTikTokEvent = (eventName: string, data?: any) => {
  if (pixelConfig.tiktok.enabled && typeof window !== 'undefined' && (window as any).ttq) {
    (window as any).ttq.track(eventName, data);
  }
};

// Pinterest Tag 事件
export const trackPinterestEvent = (eventName: string, data?: any) => {
  if (pixelConfig.pinterest.enabled && typeof window !== 'undefined' && (window as any).pintrk) {
    (window as any).pintrk('track', eventName, data);
  }
};

// 统一追踪所有平台
export const trackAllPixels = (eventName: string, data?: any) => {
  // Meta Pixel
  trackMetaEvent(eventName, data);

  // Google Analytics
  trackGAEvent(eventName, data);

  // TikTok
  trackTikTokEvent(eventName, data);

  // Pinterest
  trackPinterestEvent(eventName, data);
};

// 常用事件快捷方法
export const pixelEvents = {
  // 查看内容
  viewContent: (data?: { content_name?: string; content_category?: string; value?: number }) => {
    trackMetaEvent('ViewContent', data);
    trackTikTokEvent('ViewContent', data);
    trackPinterestEvent('pagevisit', data);
    trackGAEvent('view_item', data);
  },

  // 搜索
  search: (searchTerm: string) => {
    trackMetaEvent('Search', { search_string: searchTerm });
    trackTikTokEvent('Search', { query: searchTerm });
    trackGAEvent('search', { search_term: searchTerm });
  },

  // 加入购物车
  addToCart: (data: { content_name: string; content_id: string; value: number; currency?: string }) => {
    trackMetaEvent('AddToCart', data);
    trackTikTokEvent('AddToCart', data);
    trackPinterestEvent('addtocart', data);
    trackGAEvent('add_to_cart', {
      items: [{
        item_id: data.content_id,
        item_name: data.content_name,
        price: data.value
      }]
    });
  },

  // 开始结账
  initiateCheckout: (data: { value: number; currency?: string; num_items?: number }) => {
    trackMetaEvent('InitiateCheckout', data);
    trackTikTokEvent('InitiateCheckout', data);
    trackPinterestEvent('checkout', data);
    trackGAEvent('begin_checkout', data);
  },

  // 购买完成
  purchase: (data: { value: number; currency?: string; transaction_id: string; contents?: any[] }) => {
    // Meta Pixel
    trackMetaEvent('Purchase', {
      value: data.value,
      currency: data.currency || 'USD',
      contents: data.contents
    });

    // TikTok
    trackTikTokEvent('CompletePayment', {
      value: data.value,
      currency: data.currency || 'USD'
    });

    // Pinterest
    trackPinterestEvent('checkout', {
      value: data.value,
      order_quantity: data.contents?.length || 1,
      currency: data.currency || 'USD'
    });

    // Google Analytics
    trackGAEvent('purchase', {
      transaction_id: data.transaction_id,
      value: data.value,
      currency: data.currency || 'USD',
      items: data.contents
    });

    // Google Ads 转化
    if (pixelConfig.googleAds.conversionLabels.purchase) {
      trackGoogleAdsConversion(pixelConfig.googleAds.conversionLabels.purchase, data.value);
    }
  },

  // 注册
  completeRegistration: (data?: { value?: number; currency?: string }) => {
    trackMetaEvent('CompleteRegistration', data);
    trackTikTokEvent('CompleteRegistration', data);
    trackGAEvent('sign_up', data);

    if (pixelConfig.googleAds.conversionLabels.signUp) {
      trackGoogleAdsConversion(pixelConfig.googleAds.conversionLabels.signUp);
    }
  },

  // 查看商品详情
  viewItem: (data: { item_id: string; item_name: string; price: number; category?: string }) => {
    trackMetaEvent('ViewContent', {
      content_ids: [data.item_id],
      content_name: data.item_name,
      content_type: 'product',
      value: data.price,
      currency: 'USD'
    });

    trackGAEvent('view_item', {
      items: [{
        item_id: data.item_id,
        item_name: data.item_name,
        price: data.price,
        item_category: data.category
      }]
    });

    trackTikTokEvent('ViewContent', {
      content_id: data.item_id,
      content_name: data.item_name,
      value: data.price,
      currency: 'USD'
    });
  }
};
