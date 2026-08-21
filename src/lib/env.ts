/**
 * 环境变量适配层
 * 兼容本地开发 (import.meta.env) 和 Cloudflare Pages (context.locals.runtime.env)
 */

export interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  WOOCOMMERCE_URL: string;
  WOOCOMMERCE_CONSUMER_KEY: string;
  WOOCOMMERCE_CONSUMER_SECRET: string;
  PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
}

/**
 * 从 Astro APIContext 获取环境变量
 * 优先使用 Cloudflare runtime.env，降级到 import.meta.env
 */
export function getEnv(context?: any): Env {
  // Cloudflare Pages 环境
  if (context?.locals?.runtime?.env) {
    return context.locals.runtime.env as Env;
  }

  // 本地开发环境 (使用 import.meta.env)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return {
      STRIPE_SECRET_KEY: import.meta.env.STRIPE_SECRET_KEY || '',
      STRIPE_WEBHOOK_SECRET: import.meta.env.STRIPE_WEBHOOK_SECRET || '',
      WOOCOMMERCE_URL: import.meta.env.WOOCOMMERCE_URL || '',
      WOOCOMMERCE_CONSUMER_KEY: import.meta.env.WOOCOMMERCE_CONSUMER_KEY || '',
      WOOCOMMERCE_CONSUMER_SECRET: import.meta.env.WOOCOMMERCE_CONSUMER_SECRET || '',
      PUBLIC_STRIPE_PUBLISHABLE_KEY: import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    };
  }

  // 兜底：所有环境变量都为空字符串
  console.error('❌ 无法读取环境变量！请检查配置。');
  return {
    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
    WOOCOMMERCE_URL: '',
    WOOCOMMERCE_CONSUMER_KEY: '',
    WOOCOMMERCE_CONSUMER_SECRET: '',
    PUBLIC_STRIPE_PUBLISHABLE_KEY: '',
  };
}

/**
 * 验证必需的环境变量是否存在
 */
export function validateEnv(env: Env): { valid: boolean; missing: string[] } {
  const required: (keyof Env)[] = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'WOOCOMMERCE_URL',
    'WOOCOMMERCE_CONSUMER_KEY',
    'WOOCOMMERCE_CONSUMER_SECRET',
  ];

  const missing = required.filter((key) => !env[key]);

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Build WooCommerce API URL with URL parameter authentication
 * This is more compatible than Basic Auth with some hosting providers
 */
export function buildWooCommerceApiUrl(env: Env, endpoint: string, additionalParams?: Record<string, string>): string {
  const url = new URL(`${env.WOOCOMMERCE_URL}/wp-json/wc/v3${endpoint}`);

  // Add authentication as URL parameters (not Basic Auth)
  url.searchParams.append('consumer_key', env.WOOCOMMERCE_CONSUMER_KEY);
  url.searchParams.append('consumer_secret', env.WOOCOMMERCE_CONSUMER_SECRET);

  // Add additional parameters
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  return url.toString();
}
