/**
 * 创建 WooCommerce 订单并生成 Stripe PaymentIntent
 *
 * 安全流程：
 * 1. 先创建 WooCommerce 订单（状态：pending）
 * 2. 将订单 ID 绑定到 PaymentIntent metadata
 * 3. 返回 clientSecret 给前端完成支付
 * 4. Webhook 收到支付成功后更新订单状态
 */
import type { APIRoute } from 'astro';
import { getEnv, validateEnv } from '../../../lib/env';
import { createStripeClient } from '../../../lib/stripe-client';

export const prerender = false;

interface RequestBody {
  billing: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  shippingMethod?: string;
  line_items: Array<{
    product_id: number;
    variation_id?: number;
    quantity: number;
  }>;
}

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    // 1. 读取环境变量
    const env = getEnv(locals);
    const validation = validateEnv(env);

    if (!validation.valid) {
      console.error('❌ 缺少环境变量:', validation.missing);
      return new Response(
        JSON.stringify({
          error: 'Server configuration error',
          details: `Missing: ${validation.missing.join(', ')}`
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. 初始化 Stripe 客户端
    const stripe = createStripeClient(env);

    // 3. 解析请求体
    const { billing, shipping, shippingMethod = 'standard', line_items } = await request.json() as RequestBody;

    // 4. 验证必需字段
    if (!billing.email || !billing.first_name || !billing.last_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required billing information' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. 验证购物车数据
    if (!line_items || line_items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Cart is empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. 初始化 WooCommerce 认证（需要在创建客户前定义）
    const wcAuth = btoa(`${env.WOOCOMMERCE_CONSUMER_KEY}:${env.WOOCOMMERCE_CONSUMER_SECRET}`);

    // 7. 准备订单数据
    const lineItems = line_items.map((item) => ({
      product_id: item.product_id,
      variation_id: item.variation_id || undefined,
      quantity: item.quantity,
    }));

    // 准备发货方式
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
    }

    // 7. 检查用户是否已登录，获取 customer_id
    let customerId: number | null = null;
    let autoCreatedAccount = false;
    const existingSession = cookies.get('woo_session')?.value;

    if (existingSession) {
      // 用户已登录，获取客户 ID
      try {
        const session = JSON.parse(atob(existingSession));
        customerId = session.userId || null;
        console.log('✅ 用户已登录，客户 ID:', customerId);
      } catch (e) {
        console.warn('⚠️ 解析 session 失败:', e);
      }
    } else {
      // 🔑 用户未登录，自动创建账户并登录
      console.log('🔄 用户未登录，开始自动创建账户...');
      try {
        // 7a. 生成随机密码（24位强密码）
        const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);

        // 7b. 从邮箱生成唯一用户名
        const username = billing.email.split('@')[0] + '_' + Date.now();

        // 7c. 创建 WooCommerce 客户
        const customerResponse = await fetch(`${env.WOOCOMMERCE_URL}/wp-json/wc/v3/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${wcAuth}`,
          },
          body: JSON.stringify({
            email: billing.email,
            username: username,
            password: randomPassword,
            first_name: billing.first_name,
            last_name: billing.last_name,
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
          }),
        });

        if (customerResponse.ok) {
          const customer = await customerResponse.json();
          customerId = customer.id;
          autoCreatedAccount = true;
          console.log('✅ 账户创建成功，客户 ID:', customerId);

          // 7d. 自动登录用户（使用 JWT）
          try {
            const jwtResponse = await fetch(`${env.WOOCOMMERCE_URL}/wp-json/api/v1/token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password: randomPassword }),
            });

            if (jwtResponse.ok) {
              const jwtData = await jwtResponse.json();
              const jwtToken = jwtData.jwt_token || jwtData.token;

              if (jwtToken) {
                // 解码 JWT token（获取过期时间等信息）
                const tokenParts = jwtToken.split('.');
                const payload = JSON.parse(atob(tokenParts[1]));

                // 创建 session token
                const sessionToken = btoa(JSON.stringify({
                  userId: customer.id,
                  username: username,
                  token: jwtToken,
                  email: billing.email,
                  firstName: billing.first_name,
                  lastName: billing.last_name,
                }));

                // 设置 session cookie
                cookies.set('woo_session', sessionToken, {
                  path: '/',
                  httpOnly: true,
                  secure: import.meta.env.PROD,
                  sameSite: 'lax',
                  maxAge: 60 * 60 * 24 * 7, // 7 天
                });

                console.log('✅ 用户自动登录成功');
              }
            }
          } catch (loginError) {
            console.error('⚠️ 自动登录失败:', loginError);
            // 继续处理订单，即使自动登录失败
          }
        } else {
          // 客户可能已存在（邮箱重复），尝试通过邮箱查找
          const errorData = await customerResponse.json();
          console.warn('⚠️ 创建客户失败:', errorData.message);

          if (errorData.code === 'registration-error-email-exists') {
            // 邮箱已存在，查找现有客户
            const searchResponse = await fetch(
              `${env.WOOCOMMERCE_URL}/wp-json/wc/v3/customers?email=${encodeURIComponent(billing.email)}`,
              {
                headers: {
                  'Authorization': `Basic ${wcAuth}`,
                },
              }
            );

            if (searchResponse.ok) {
              const customers = await searchResponse.json();
              if (customers.length > 0) {
                customerId = customers[0].id;
                console.log('✅ 找到现有客户，客户 ID:', customerId);

                // 为现有客户创建简单 session（不包含密码）
                const sessionToken = btoa(JSON.stringify({
                  userId: customers[0].id,
                  username: customers[0].username,
                  email: billing.email,
                  verified: true, // 通过支付验证
                }));

                cookies.set('woo_session', sessionToken, {
                  path: '/',
                  httpOnly: true,
                  secure: import.meta.env.PROD,
                  sameSite: 'lax',
                  maxAge: 60 * 60 * 24 * 7, // 7 天
                });

                console.log('✅ 现有用户自动登录成功');
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ 创建客户失败:', error);
        // 继续处理订单，即使创建客户失败（作为访客订单）
      }
    }

    // 8. 创建 WooCommerce 订单（pending 状态）
    const orderData: any = {
      status: 'pending', // 🔑 关键：先创建 pending 状态订单
      payment_method: 'stripe',
      payment_method_title: 'Credit Card (Stripe)',
      set_paid: false,
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
          key: '_payment_pending',
          value: 'yes'
        }
      ],
    };

    // 添加客户 ID（如果已登录）
    if (customerId) {
      orderData.customer_id = customerId;
    }

    const orderResponse = await fetch(`${env.WOOCOMMERCE_URL}/wp-json/wc/v3/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${wcAuth}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json();
      console.error('❌ WooCommerce 订单创建失败:', errorData);
      return new Response(
        JSON.stringify({
          error: 'Failed to create order',
          details: errorData.message
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const wcOrder = await orderResponse.json();
    console.log('✅ WooCommerce 订单创建成功:', wcOrder.id);

    // 9. 创建 Stripe PaymentIntent（绑定订单 ID）
    // 从WooCommerce订单中获取总金额
    const totalAmount = Math.round(parseFloat(wcOrder.total) * 100); // 转换为分

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: wcOrder.currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      // 🔑 关键：绑定 WooCommerce 订单 ID
      metadata: {
        order_id: wcOrder.id.toString(),
        customer_email: billing.email,
      },
      description: `Order #${wcOrder.id} - ${billing.email}`,
      shipping: {
        name: `${shipping.first_name} ${shipping.last_name}`,
        address: {
          line1: shipping.address_1,
          line2: shipping.address_2 || undefined,
          city: shipping.city,
          state: shipping.state,
          postal_code: shipping.postcode,
          country: shipping.country,
        },
      },
    });

    console.log('✅ Stripe PaymentIntent 创建成功:', paymentIntent.id);

    // 10. 更新订单 meta_data，记录 PaymentIntent ID
    await fetch(`${env.WOOCOMMERCE_URL}/wp-json/wc/v3/orders/${wcOrder.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${wcAuth}`,
      },
      body: JSON.stringify({
        meta_data: [
          {
            key: '_stripe_payment_intent_id',
            value: paymentIntent.id
          }
        ]
      }),
    });

    // 11. 返回给前端
    return new Response(
      JSON.stringify({
        success: true,
        clientSecret: paymentIntent.client_secret,
        orderId: wcOrder.id,
        orderKey: wcOrder.order_key,
        amount: totalAmount,
        currency: wcOrder.currency,
        autoCreatedAccount: autoCreatedAccount, // 告诉前端是否自动创建了账户
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ 创建订单和 PaymentIntent 失败:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
