import type { APIRoute } from 'astro';

export const prerender = false;

const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET;

/**
 * 获取订单详情
 * 支持两种方式：
 * 1. 已登录用户通过 session
 * 2. 访客通过 order_key
 */
export const GET: APIRoute = async ({ params, url, cookies }) => {
  try {
    const orderId = params.id;
    const orderKey = url.searchParams.get('order_key');

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 检查用户是否已登录
    const session = cookies.get('woo_session')?.value;
    let userId = null;

    if (session) {
      try {
        const sessionData = JSON.parse(atob(session));
        userId = sessionData.userId;
      } catch (e) {
        console.error('Failed to parse session:', e);
      }
    }

    // 获取订单
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');

    const orderResponse = await fetch(
      `${WOOCOMMERCE_URL}/wp-json/wc/v3/orders/${orderId}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      }
    );

    if (!orderResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const order = await orderResponse.json();

    // 验证访问权限
    // 1. 如果用户已登录，检查订单是否属于该用户
    if (userId && order.customer_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to view this order' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. 如果用户未登录，必须提供正确的 order_key
    if (!userId && !orderKey) {
      return new Response(
        JSON.stringify({ error: 'Order key is required for guest orders' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!userId && order.order_key !== orderKey) {
      return new Response(
        JSON.stringify({ error: 'Invalid order key' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 返回订单数据
    return new Response(
      JSON.stringify(order),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error fetching order:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch order' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
