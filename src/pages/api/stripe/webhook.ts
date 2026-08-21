/**
 * Stripe Webhook 端点
 *
 * 安全处理支付成功事件：
 * 1. 验证 Webhook 签名（防伪造）
 * 2. 监听 payment_intent.succeeded 事件
 * 3. 从 metadata 获取 order_id
 * 4. 更新 WooCommerce 订单状态为 processing
 * 5. 记录 transaction_id
 */
import type { APIRoute } from 'astro';
import type Stripe from 'stripe';
import { getEnv, validateEnv } from '../../../lib/env';
import { createStripeClient, constructWebhookEvent } from '../../../lib/stripe-client';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. 读取环境变量
    const env = getEnv(locals);
    const validation = validateEnv(env);

    if (!validation.valid) {
      console.error('❌ Webhook: 缺少环境变量:', validation.missing);
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. 初始化 Stripe 客户端
    const stripe = createStripeClient(env);

    // 3. 获取 Stripe 签名头
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      console.error('❌ Webhook: 缺少 stripe-signature 头');
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. 🔑 关键：获取原始请求体（Raw Body）
    // 绝对不能使用 request.json()，必须用 text() 进行签名验证
    const payload = await request.text();

    // 5. 验证 Webhook 签名
    let event: Stripe.Event;
    try {
      event = await constructWebhookEvent(
        stripe,
        payload,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      );
      console.log('✅ Webhook 签名验证成功:', event.type);
    } catch (err: any) {
      console.error('❌ Webhook 签名验证失败:', err.message);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. 处理不同的事件类型
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('💰 收到支付成功事件:', paymentIntent.id);

        // 7. 从 metadata 获取订单 ID
        const orderId = paymentIntent.metadata.order_id;
        if (!orderId) {
          console.error('❌ PaymentIntent metadata 中缺少 order_id:', paymentIntent.id);
          return new Response(
            JSON.stringify({ error: 'Missing order_id in metadata' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        console.log(`🔄 更新订单 #${orderId} 状态为 processing...`);

        // 8. 更新 WooCommerce 订单状态
        const wcAuth = btoa(`${env.WOOCOMMERCE_CONSUMER_KEY}:${env.WOOCOMMERCE_CONSUMER_SECRET}`);

        // 8a. 先获取订单当前状态（幂等性检查）
        const getOrderResponse = await fetch(
          `${env.WOOCOMMERCE_URL}/wp-json/wc/v3/orders/${orderId}`,
          {
            headers: {
              'Authorization': `Basic ${wcAuth}`,
            },
          }
        );

        if (!getOrderResponse.ok) {
          console.error(`❌ 获取订单 #${orderId} 失败:`, await getOrderResponse.text());
          return new Response(
            JSON.stringify({ error: 'Order not found' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const currentOrder = await getOrderResponse.json();

        // 8b. 幂等性检查：如果订单已经是 processing 或 completed，跳过更新
        if (currentOrder.status === 'processing' || currentOrder.status === 'completed') {
          console.log(`⚠️ 订单 #${orderId} 已经是 ${currentOrder.status} 状态，跳过更新`);
          return new Response(
            JSON.stringify({
              received: true,
              message: 'Order already processed'
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // 8c. 更新订单状态为 processing
        const updateData = {
          status: 'processing',
          set_paid: true,
          transaction_id: paymentIntent.id,
          meta_data: [
            {
              key: '_stripe_charge_id',
              value: paymentIntent.latest_charge || ''
            },
            {
              key: '_stripe_payment_intent_id',
              value: paymentIntent.id
            },
            {
              key: '_stripe_payment_completed_at',
              value: new Date().toISOString()
            }
          ]
        };

        const updateOrderResponse = await fetch(
          `${env.WOOCOMMERCE_URL}/wp-json/wc/v3/orders/${orderId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${wcAuth}`,
            },
            body: JSON.stringify(updateData),
          }
        );

        if (!updateOrderResponse.ok) {
          const errorData = await updateOrderResponse.json();
          console.error(`❌ 更新订单 #${orderId} 失败:`, errorData);
          return new Response(
            JSON.stringify({
              error: 'Failed to update order',
              details: errorData.message
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const updatedOrder = await updateOrderResponse.json();
        console.log(`✅ 订单 #${orderId} 已更新为 processing 状态`);

        // 9. 可选：创建订单备注
        await fetch(
          `${env.WOOCOMMERCE_URL}/wp-json/wc/v3/orders/${orderId}/notes`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${wcAuth}`,
            },
            body: JSON.stringify({
              note: `Payment confirmed via Stripe. Transaction ID: ${paymentIntent.id}`,
              customer_note: false
            }),
          }
        );

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('❌ 收到支付失败事件:', paymentIntent.id);

        const orderId = paymentIntent.metadata.order_id;
        if (!orderId) {
          console.error('❌ PaymentIntent metadata 中缺少 order_id');
          break;
        }

        // 更新订单状态为 failed
        const wcAuth = btoa(`${env.WOOCOMMERCE_CONSUMER_KEY}:${env.WOOCOMMERCE_CONSUMER_SECRET}`);

        await fetch(
          `${env.WOOCOMMERCE_URL}/wp-json/wc/v3/orders/${orderId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${wcAuth}`,
            },
            body: JSON.stringify({
              status: 'failed',
              meta_data: [
                {
                  key: '_stripe_payment_intent_id',
                  value: paymentIntent.id
                },
                {
                  key: '_stripe_payment_failed_at',
                  value: new Date().toISOString()
                }
              ]
            }),
          }
        );

        console.log(`✅ 订单 #${orderId} 已标记为 failed`);
        break;
      }

      case 'payment_intent.requires_action': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('⏳ 收到需要用户操作事件 (3D Secure):', paymentIntent.id);

        const orderId = paymentIntent.metadata.order_id;
        if (!orderId) {
          console.error('❌ PaymentIntent metadata 中缺少 order_id');
          break;
        }

        // 更新订单状态为 on-hold（等待用户完成 3D Secure 认证）
        const wcAuth = btoa(`${env.WOOCOMMERCE_CONSUMER_KEY}:${env.WOOCOMMERCE_CONSUMER_SECRET}`);

        // 先检查当前状态，避免覆盖已完成的订单
        const getOrderResponse = await fetch(
          `${env.WOOCOMMERCE_URL}/wp-json/wc/v3/orders/${orderId}`,
          {
            headers: {
              'Authorization': `Basic ${wcAuth}`,
            },
          }
        );

        if (getOrderResponse.ok) {
          const currentOrder = await getOrderResponse.json();

          // 只有 pending 状态的订单才更新为 on-hold
          if (currentOrder.status === 'pending') {
            await fetch(
              `${env.WOOCOMMERCE_URL}/wp-json/wc/v3/orders/${orderId}`,
              {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Basic ${wcAuth}`,
                },
                body: JSON.stringify({
                  status: 'on-hold',
                  meta_data: [
                    {
                      key: '_stripe_payment_intent_id',
                      value: paymentIntent.id
                    },
                    {
                      key: '_stripe_requires_action_at',
                      value: new Date().toISOString()
                    }
                  ]
                }),
              }
            );

            // 添加订单备注
            await fetch(
              `${env.WOOCOMMERCE_URL}/wp-json/wc/v3/orders/${orderId}/notes`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Basic ${wcAuth}`,
                },
                body: JSON.stringify({
                  note: `Payment requires additional authentication (3D Secure). Waiting for customer action.`,
                  customer_note: false
                }),
              }
            );

            console.log(`✅ 订单 #${orderId} 已标记为 on-hold (等待 3D Secure)`);
          } else {
            console.log(`⚠️ 订单 #${orderId} 状态为 ${currentOrder.status}，跳过更新`);
          }
        }

        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('🚫 收到支付取消事件:', paymentIntent.id);

        const orderId = paymentIntent.metadata.order_id;
        if (!orderId) {
          console.error('❌ PaymentIntent metadata 中缺少 order_id');
          break;
        }

        // 更新订单状态为 cancelled
        const wcAuth = btoa(`${env.WOOCOMMERCE_CONSUMER_KEY}:${env.WOOCOMMERCE_CONSUMER_SECRET}`);

        await fetch(
          `${env.WOOCOMMERCE_URL}/wp-json/wc/v3/orders/${orderId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${wcAuth}`,
            },
            body: JSON.stringify({
              status: 'cancelled',
              meta_data: [
                {
                  key: '_stripe_payment_intent_id',
                  value: paymentIntent.id
                },
                {
                  key: '_stripe_payment_canceled_at',
                  value: new Date().toISOString()
                }
              ]
            }),
          }
        );

        console.log(`✅ 订单 #${orderId} 已标记为 cancelled`);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log('💸 收到退款事件:', charge.id);

        // 从 charge 的 payment_intent 获取订单 ID
        const paymentIntentId = charge.payment_intent as string;

        if (!paymentIntentId) {
          console.error('❌ Charge 中缺少 payment_intent');
          break;
        }

        // 获取 PaymentIntent 以读取 metadata
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        const orderId = paymentIntent.metadata.order_id;

        if (!orderId) {
          console.error('❌ PaymentIntent metadata 中缺少 order_id');
          break;
        }

        console.log(`🔄 更新订单 #${orderId} 状态为 refunded...`);

        // 更新订单状态为 refunded
        const wcAuth = btoa(`${env.WOOCOMMERCE_CONSUMER_KEY}:${env.WOOCOMMERCE_CONSUMER_SECRET}`);

        const refundResponse = await fetch(
          `${env.WOOCOMMERCE_URL}/wp-json/wc/v3/orders/${orderId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${wcAuth}`,
            },
            body: JSON.stringify({
              status: 'refunded',
              meta_data: [
                {
                  key: '_stripe_charge_id',
                  value: charge.id
                },
                {
                  key: '_stripe_refund_id',
                  value: charge.refunds?.data[0]?.id || ''
                },
                {
                  key: '_stripe_refunded_at',
                  value: new Date().toISOString()
                },
                {
                  key: '_stripe_refund_amount',
                  value: charge.amount_refunded.toString()
                }
              ]
            }),
          }
        );

        if (!refundResponse.ok) {
          const errorData = await refundResponse.json();
          console.error(`❌ 更新订单 #${orderId} 退款状态失败:`, errorData);
          break;
        }

        console.log(`✅ 订单 #${orderId} 已标记为 refunded`);

        // 添加订单备注
        await fetch(
          `${env.WOOCOMMERCE_URL}/wp-json/wc/v3/orders/${orderId}/notes`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${wcAuth}`,
            },
            body: JSON.stringify({
              note: `Refund processed via Stripe. Charge ID: ${charge.id}, Refund Amount: $${(charge.amount_refunded / 100).toFixed(2)}`,
              customer_note: true
            }),
          }
        );

        break;
      }

      default:
        console.log(`ℹ️ 收到未处理的事件类型: ${event.type}`);
    }

    // 10. 返回 200 响应（告诉 Stripe 已成功处理）
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Webhook 处理失败:', error);
    // 返回 500 会让 Stripe 继续重试
    return new Response(
      JSON.stringify({
        error: 'Webhook processing failed',
        message: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
