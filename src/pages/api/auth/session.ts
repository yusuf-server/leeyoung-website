import type { APIRoute } from 'astro';

export const prerender = false;

const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET;

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const sessionToken = cookies.get('woo_session')?.value;

    if (!sessionToken) {
      return new Response(
        JSON.stringify({ authenticated: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 解析session token
    let sessionData;
    try {
      sessionData = JSON.parse(atob(sessionToken));
    } catch (e) {
      cookies.delete('woo_session', { path: '/' });
      return new Response(
        JSON.stringify({ authenticated: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证必需字段
    // token 字段是可选的（支付后自动登录的用户可能没有 JWT token）
    if (!sessionData.userId || !sessionData.username) {
      cookies.delete('woo_session', { path: '/' });
      return new Response(
        JSON.stringify({ authenticated: false }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 获取WooCommerce客户数据
    let wooCustomer = null;
    try {
      const customerResponse = await fetch(
        `${WOOCOMMERCE_URL}/wp-json/wc/v3/customers/${sessionData.userId}?consumer_key=${CONSUMER_KEY}&consumer_secret=${CONSUMER_SECRET}`
      );
      if (customerResponse.ok) {
        wooCustomer = await customerResponse.json();
      }
    } catch (e) {
      console.warn('Could not fetch WooCommerce customer data:', e);
    }

    // 使用用户的 first name 生成头像
    const displayName = wooCustomer?.first_name || sessionData.username;
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&size=96&background=d4af37&color=fff&bold=true`;

    return new Response(
      JSON.stringify({
        authenticated: true,
        user: {
          id: sessionData.userId,
          username: sessionData.username,
          email: sessionData.email || wooCustomer?.email,
          name: wooCustomer ? `${wooCustomer.first_name} ${wooCustomer.last_name}`.trim() : sessionData.username,
          avatar: avatarUrl,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Session check error:', error);
    return new Response(
      JSON.stringify({ authenticated: false }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
