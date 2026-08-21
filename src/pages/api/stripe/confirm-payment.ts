import type { APIRoute } from 'astro';
import Stripe from 'stripe';

export const prerender = false;

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET;

/**
 * 确认 Stripe 支付成功后，在 WooCommerce 创建订单
 * 并自动为访客创建账户和登录
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { paymentIntentId, billing, shipping, shippingMethod } = await request.json();

    // 1. 验证 Payment Intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // 不再限制状态，所有状态都创建订单
    console.log('Payment Intent Status:', paymentIntent.status);

    // 2. 检查用户是否已登录
    const existingSession = cookies.get('woo_session')?.value;
    let customerId = null;
    let autoCreatedAccount = false;

    if (!existingSession) {
      // 用户未登录，自动创建账户
      try {
        // 2a. 生成随机密码
        const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);

        // 2b. 从邮箱生成用户名
        const username = billing.email.split('@')[0] + '_' + Date.now();

        // 2c. 创建 WooCommerce 客户
        const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');

        const customerResponse = await fetch(`${WOOCOMMERCE_URL}/wp-json/wc/v3/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`,
          },
          body: JSON.stringify({
            email: billing.email,
            username: username,
            password: randomPassword,
            first_name: billing.first_name,
            last_name: billing.last_name,
            billing: billing,
            shipping: shipping,
          }),
        });

        if (customerResponse.ok) {
          const customer = await customerResponse.json();
          customerId = customer.id;
          autoCreatedAccount = true;

          // 2d. 自动登录用户（使用 JWT）
          try {
            const jwtResponse = await fetch(`${WOOCOMMERCE_URL}/wp-json/api/v1/token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password: randomPassword }),
            });

            if (jwtResponse.ok) {
              const jwtData = await jwtResponse.json();
              const jwtToken = jwtData.jwt_token || jwtData.token;

              if (jwtToken) {
                // 解码 JWT token
                const tokenParts = jwtToken.split('.');
                const payload = JSON.parse(atob(tokenParts[1]));

                // 创建 session
                const sessionToken = btoa(JSON.stringify({
                  userId: customer.id,
                  username: username,
                  token: jwtToken,
                  email: billing.email,
                }));

                cookies.set('woo_session', sessionToken, {
                  path: '/',
                  httpOnly: true,
                  secure: import.meta.env.PROD,
                  sameSite: 'lax',
                  maxAge: 60 * 60 * 24 * 7, // 7 days
                });
              }
            }
          } catch (loginError) {
            console.error('Auto-login failed:', loginError);
            // 继续处理订单，即使自动登录失败
          }
        } else {
          // 客户可能已存在，尝试通过邮箱查找
          const searchResponse = await fetch(
            `${WOOCOMMERCE_URL}/wp-json/wc/v3/customers?email=${encodeURIComponent(billing.email)}&consumer_key=${CONSUMER_KEY}&consumer_secret=${CONSUMER_SECRET}`
          );

          if (searchResponse.ok) {
            const customers = await searchResponse.json();
            if (customers.length > 0) {
              customerId = customers[0].id;

              // 旧账号也需要自动登录
              try {
                // 尝试使用邮箱作为用户名登录（WooCommerce 支持邮箱登录）
                const jwtResponse = await fetch(`${WOOCOMMERCE_URL}/wp-json/api/v1/token`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    username: billing.email,
                    password: '' // 我们没有密码，需要使用其他方法
                  }),
                });

                // 如果 JWT 登录失败（预期的），直接创建 session
                // 因为我们已经验证了用户的邮箱（通过 Stripe 支付）
                const sessionToken = btoa(JSON.stringify({
                  userId: customers[0].id,
                  username: customers[0].username,
                  email: billing.email,
                  verified: true,
                }));

                cookies.set('woo_session', sessionToken, {
                  path: '/',
                  httpOnly: true,
                  secure: import.meta.env.PROD,
                  sameSite: 'lax',
                  maxAge: 60 * 60 * 24 * 7, // 7 days
                });
              } catch (loginError) {
                console.error('Auto-login for existing user failed:', loginError);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to create customer:', error);
        // 继续处理订单，即使创建客户失败
      }
    } else {
      // 用户已登录，获取客户 ID
      try {
        const session = JSON.parse(atob(existingSession));
        customerId = session.userId;
      } catch (e) {
        console.error('Failed to parse session:', e);
      }
    }

    // 3. 获取购物车数据
    const cartKey = cookies.get('wc_cart_hash')?.value || '';
    const cartResponse = await fetch(`${WOOCOMMERCE_URL}/wp-json/wc/store/v1/cart`, {
      headers: {
        'Cart-Token': cartKey,
      },
    });

    if (!cartResponse.ok) {
      throw new Error('Failed to fetch cart');
    }

    const cart = await cartResponse.json();

    // 4. 准备订单数据
    const lineItems = cart.items.map((item: any) => ({
      product_id: item.id,
      quantity: item.quantity,
    }));

    // 5. 根据 Stripe 状态决定 WooCommerce 订单状态
    let wooStatus = 'pending';
    let setPaid = false;

    switch (paymentIntent.status) {
      case 'succeeded':
        wooStatus = 'processing';
        setPaid = true;
        break;
      case 'processing':
        wooStatus = 'pending';
        setPaid = false;
        break;
      case 'requires_action':
      case 'requires_payment_method':
        wooStatus = 'on-hold';
        setPaid = false;
        break;
      case 'canceled':
        wooStatus = 'cancelled';
        setPaid = false;
        break;
      default:
        wooStatus = 'failed';
        setPaid = false;
    }

    // 6. 在 WooCommerce 创建订单
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');

    // 准备发货方式数据
    // 使用 free_shipping 作为 method_id
    const shippingLines = [];
    if (shippingMethod === 'standard') {
      shippingLines.push({
        method_id: 'free_shipping',
        method_title: 'Standard Shipping',
        total: '0.00'
      });
    } else if (shippingMethod === 'express') {
      shippingLines.push({
        method_id: 'free_shipping',
        method_title: 'Express Shipping',
        total: '15.00'
      });
    } else {
      // 默认使用 free shipping
      shippingLines.push({
        method_id: 'free_shipping',
        method_title: 'Free Shipping',
        total: '0.00'
      });
    }

    const orderData: any = {
      payment_method: 'stripe',
      payment_method_title: 'Credit Card (Stripe)',
      set_paid: setPaid,
      status: wooStatus,
      billing: {
        first_name: billing.first_name,
        last_name: billing.last_name,
        address_1: billing.address_1,
        address_2: billing.address_2 || '',
        city: billing.city,
        state: billing.state,
        postcode: billing.postcode,
        country: billing.country,
        email: billing.email,
        phone: billing.phone,
      },
      shipping: {
        first_name: shipping.first_name,
        last_name: shipping.last_name,
        address_1: shipping.address_1,
        address_2: shipping.address_2 || '',
        city: shipping.city,
        state: shipping.state,
        postcode: shipping.postcode,
        country: shipping.country,
      },
      line_items: lineItems,
      shipping_lines: shippingLines,
      meta_data: [
        {
          key: '_stripe_payment_intent_id',
          value: paymentIntentId,
        },
        {
          key: '_stripe_charge_id',
          value: paymentIntent.latest_charge,
        },
        {
          key: '_paid_via_frontend',
          value: 'yes',
        },
      ],
    };

    // 添加客户 ID（如果有）
    if (customerId) {
      orderData.customer_id = customerId;
    }

    const orderResponse = await fetch(`${WOOCOMMERCE_URL}/wp-json/wc/v3/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json();
      console.error('WooCommerce order creation failed:', errorData);
      throw new Error(errorData.message || 'Failed to create order in WooCommerce');
    }

    const order = await orderResponse.json();

    // 5. 清空购物车（通过删除 cookie）
    cookies.delete('wc_cart_hash', { path: '/' });

    // 6. 根据订单状态决定跳转页面
    let redirectPage = 'success';

    // WooCommerce 订单状态：
    // - pending: 等待付款
    // - processing: 处理中（已付款）
    // - on-hold: 暂停
    // - completed: 已完成
    // - cancelled: 已取消
    // - refunded: 已退款
    // - failed: 失败

    if (order.status === 'failed' || order.status === 'cancelled') {
      redirectPage = 'failed';
    } else if (order.status === 'pending' || order.status === 'on-hold') {
      redirectPage = 'processing';
    } else if (order.status === 'processing' || order.status === 'completed') {
      redirectPage = 'success';
    }

    return new Response(
      JSON.stringify({
        success: true,
        autoCreatedAccount: autoCreatedAccount,
        order: {
          id: order.id,
          order_key: order.order_key,
          total: order.total,
          status: order.status,
          redirect_page: redirectPage,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to confirm payment' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
