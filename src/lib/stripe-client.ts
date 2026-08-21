/**
 * Stripe SDK 初始化
 * 使用 Fetch HTTP Client 以兼容 Cloudflare Workers 环境
 */
import Stripe from 'stripe';
import type { Env } from './env';

/**
 * 创建 Stripe 客户端实例
 * @param env - 环境变量对象
 * @returns Stripe 客户端实例
 */
export function createStripeClient(env: Env): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('❌ STRIPE_SECRET_KEY is not configured');
  }

  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
    // 🔑 关键：使用 Fetch HTTP Client 以兼容边缘运行时
    httpClient: Stripe.createFetchHttpClient(),
    // 可选：在开发环境启用详细日志
    // typescript: true,
  });
}

/**
 * 验证 Webhook 签名（异步版本）
 * @param payload - 请求体原始文本
 * @param signature - Stripe-Signature 头
 * @param secret - Webhook Secret
 * @returns 验证后的 Stripe Event
 */
export async function constructWebhookEvent(
  stripe: Stripe,
  payload: string,
  signature: string,
  secret: string
): Promise<Stripe.Event> {
  try {
    // 使用 constructEventAsync 以兼容边缘运行时
    return await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      secret,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );
  } catch (err: any) {
    console.error('❌ Webhook 签名验证失败:', err.message);
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }
}
