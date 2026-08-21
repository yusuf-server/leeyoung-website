/**
 * 支付配置
 * 用于控制启用哪些支付方式
 */

export const PAYMENT_CONFIG = {
  // Stripe 配置
  stripe: {
    enabled: true, // 🔴 暂时禁用 Stripe（待验证身份后启用）
    name: 'Credit Card',
    description: 'Pay securely with your credit card',
    icon: '💳',
  },

  // PayPal 配置
  paypal: {
    enabled: true, // 🟢 启用 PayPal
    name: 'PayPal',
    description: 'Pay securely with your PayPal account',
    icon: '🅿️',
  },
} as const;

/**
 * 获取启用的支付方式列表
 */
export function getEnabledPaymentMethods() {
  const methods = [];

  if (PAYMENT_CONFIG.stripe.enabled) {
    methods.push({ id: 'stripe', ...PAYMENT_CONFIG.stripe });
  }

  if (PAYMENT_CONFIG.paypal.enabled) {
    methods.push({ id: 'paypal', ...PAYMENT_CONFIG.paypal });
  }

  return methods;
}

/**
 * 检查支付方式是否启用
 */
export function isPaymentMethodEnabled(method: 'stripe' | 'paypal'): boolean {
  return PAYMENT_CONFIG[method].enabled;
}
