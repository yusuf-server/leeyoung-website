/**
 * 像素追踪配置文件
 *
 * 支持的平台：
 * - Meta Pixel (Facebook/Instagram 广告)
 * - Google Ads (Google 广告转化追踪)
 * - Google Analytics 4 (GA4)
 * - TikTok Pixel
 * - Pinterest Tag
 *
 * 配置方式：
 * 1. 开发环境：直接在这里填写（用于测试）
 * 2. 生产环境：在 Cloudflare 后台配置环境变量（推荐）
 */

// 优先使用环境变量，如果没有则使用默认值
export const pixelConfig = {
  // Meta Pixel (Facebook/Instagram)
  meta: {
    enabled: !!(import.meta.env.PUBLIC_META_PIXEL_ID || ''),
    pixelId: import.meta.env.PUBLIC_META_PIXEL_ID || '',
    advancedMatching: true
  },

  // Google Ads 转化追踪
  googleAds: {
    enabled: !!(import.meta.env.PUBLIC_GOOGLE_ADS_ID || ''),
    conversionId: import.meta.env.PUBLIC_GOOGLE_ADS_ID || '',
    conversionLabels: {
      purchase: import.meta.env.PUBLIC_GOOGLE_ADS_PURCHASE_LABEL || '',
      signUp: import.meta.env.PUBLIC_GOOGLE_ADS_SIGNUP_LABEL || '',
      addToCart: import.meta.env.PUBLIC_GOOGLE_ADS_ADDCART_LABEL || ''
    }
  },

  // Google Analytics 4
  googleAnalytics: {
    enabled: !!(import.meta.env.PUBLIC_GA4_MEASUREMENT_ID || ''),
    measurementId: import.meta.env.PUBLIC_GA4_MEASUREMENT_ID || ''
  },

  // TikTok Pixel
  tiktok: {
    enabled: !!(import.meta.env.PUBLIC_TIKTOK_PIXEL_ID || ''),
    pixelId: import.meta.env.PUBLIC_TIKTOK_PIXEL_ID || ''
  },

  // Pinterest Tag
  pinterest: {
    enabled: !!(import.meta.env.PUBLIC_PINTEREST_TAG_ID || ''),
    tagId: import.meta.env.PUBLIC_PINTEREST_TAG_ID || ''
  },

  // 自定义脚本
  custom: {
    enabled: !!(import.meta.env.PUBLIC_CUSTOM_TRACKING_ENABLED || ''),
    headScripts: import.meta.env.PUBLIC_CUSTOM_HEAD_SCRIPTS || '',
    bodyScripts: import.meta.env.PUBLIC_CUSTOM_BODY_SCRIPTS || ''
  }
};

export type PixelConfig = typeof pixelConfig;

