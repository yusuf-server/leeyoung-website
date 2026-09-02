import type { APIRoute } from 'astro';

export const prerender = false;

const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'Username and password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 检测是否为邮箱格式
    const isEmail = username.includes('@');

    // 如果是邮箱，先通过WooCommerce API查找用户名
    let actualUsername = username;

    if (isEmail) {
      console.log('Email login detected, looking up username for:', username);

      try {
        // 使用WooCommerce API通过邮箱查找客户
        const customerResponse = await fetch(
          `${WOOCOMMERCE_URL}/wp-json/wc/v3/customers?email=${encodeURIComponent(username)}&consumer_key=${CONSUMER_KEY}&consumer_secret=${CONSUMER_SECRET}`
        );

        if (customerResponse.ok) {
          const customers = await customerResponse.json();
          if (customers && customers.length > 0) {
            actualUsername = customers[0].username;
            console.log('Found username for email:', actualUsername);
          } else {
            return new Response(
              JSON.stringify({ error: 'No account found with this email' }),
              { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (e) {
        console.error('Failed to lookup username by email:', e);
        // 继续尝试使用邮箱登录，某些JWT插件支持邮箱
      }
    }

    // 使用JWT Authentication插件验证用户
    console.log('Attempting JWT login for user:', actualUsername);
    console.log('JWT endpoint:', `${WOOCOMMERCE_URL}/wp-json/api/v1/token`);

    const jwtResponse = await fetch(
      `${WOOCOMMERCE_URL}/wp-json/api/v1/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: actualUsername, password })
      }
    );

    console.log('JWT response status:', jwtResponse.status);

    const jwtData = await jwtResponse.json();
    console.log('JWT response data:', JSON.stringify(jwtData, null, 2));

    if (!jwtResponse.ok || jwtData.status === 'error') {
      console.error('JWT authentication failed:', jwtData);
      return new Response(
        JSON.stringify({ error: jwtData.error_description || 'Invalid username or password' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // JWT返回的数据格式：token需要解码来获取用户信息
    const jwtToken = jwtData.jwt_token || jwtData.token;

    if (!jwtToken) {
      console.error('Missing JWT token in response');
      return new Response(
        JSON.stringify({ error: 'Authentication succeeded but token is missing' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('JWT token received:', jwtToken ? 'Present' : 'Missing');

    // 解码JWT token来获取用户信息（payload是中间部分）
    const tokenParts = jwtToken.split('.');
    const payload = JSON.parse(atob(tokenParts[1]));

    console.log('Decoded JWT payload:', payload);

    const userId = payload.sub || payload.user_id || payload.id;
    const userDisplayName = payload.name || payload.username || payload.user_login || username;

    if (!userId) {
      console.error('Missing user ID in JWT payload');
      return new Response(
        JSON.stringify({ error: 'Authentication succeeded but user ID is missing' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 获取WooCommerce客户数据（用于获取头像等额外信息）
    let wooCustomer = null;
    try {
      const customerResponse = await fetch(
        `${WOOCOMMERCE_URL}/wp-json/wc/v3/customers/${userId}?consumer_key=${CONSUMER_KEY}&consumer_secret=${CONSUMER_SECRET}`
      );
      if (customerResponse.ok) {
        wooCustomer = await customerResponse.json();
      }
    } catch (e) {
      console.warn('Could not fetch WooCommerce customer data:', e);
    }

    // 创建session token（存储JWT token和用户信息）
    const sessionToken = btoa(JSON.stringify({
      userId: userId,
      username: userDisplayName,
      token: jwtToken,
      email: payload.email || wooCustomer?.email
    }));

    console.log('Creating session for user ID:', userId);

    // 先删除旧的 cookie，确保不会有残留
    cookies.delete('woo_session', { path: '/' });

    // 设置新的 cookie
    cookies.set('woo_session', sessionToken, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    const displayName = wooCustomer ? `${wooCustomer.first_name} ${wooCustomer.last_name}`.trim() : userDisplayName;

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userId,
          username: userDisplayName,
          email: payload.email || wooCustomer?.email,
          name: displayName || userDisplayName,
          avatar: wooCustomer?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || userDisplayName)}&size=96&background=000&color=fff`,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'Login failed. Please try again.', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
