/**
 * 分析埋点数据接收API
 * 将数据转发到 WordPress REST API
 */
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const event = await request.json();

    // 获取环境变量
    const WORDPRESS_URL = import.meta.env.WOOCOMMERCE_URL || import.meta.env.PUBLIC_WOOCOMMERCE_URL;

    if (!WORDPRESS_URL) {
      console.error('WordPress URL not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 获取客户端IP（Cloudflare提供）
    const clientIP = request.headers.get('cf-connecting-ip') ||
                     request.headers.get('x-forwarded-for') ||
                     'unknown';

    // 获取地理位置信息（Cloudflare提供）
    const country = request.headers.get('cf-ipcountry') || '';
    const cfData = request.headers.get('cf-request-data');

    // 获取User Agent
    const userAgent = request.headers.get('user-agent') || '';

    // 增强事件数据
    const enhancedEvent = {
      ...event,
      ip_address: clientIP,
      country: country,
      user_agent: userAgent,
      cf_data: cfData,
    };

    // 转发到 WordPress REST API
    const wpResponse = await fetch(`${WORDPRESS_URL}/wp-json/analytics/v1/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enhancedEvent),
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      console.error('WordPress API error:', errorText);
      throw new Error('Failed to send to WordPress');
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );

  } catch (error) {
    console.error('Analytics API error:', error);

    // 即使失败也返回200，不影响用户体验
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
