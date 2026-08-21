import type { APIRoute } from 'astro';

const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { key, login, password } = body;

    if (!key || !login || !password) {
      return new Response(JSON.stringify({ error: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: '密码至少需要8个字符' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 调用 WordPress 密码重置确认 API
    const formData = new FormData();
    formData.append('rp_key', key);
    formData.append('rp_login', login);
    formData.append('pass1', password);
    formData.append('pass2', password);

    const response = await fetch(
      `${WOOCOMMERCE_URL}/wp-login.php?action=resetpass`,
      {
        method: 'POST',
        body: formData,
        redirect: 'manual' // 不自动跟随重定向
      }
    );

    // WordPress 成功时会重定向到登录页
    if (response.status === 302) {
      const location = response.headers.get('location');

      // 检查是否重定向到登录页（表示成功）
      if (location && (location.includes('resetpass=complete') || location.includes('wp-login.php'))) {
        return new Response(JSON.stringify({
          success: true,
          message: '密码重置成功'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 检查响应内容是否包含错误
    const text = await response.text();

    if (text.includes('error') || text.includes('expired') || text.includes('invalid')) {
      return new Response(JSON.stringify({
        error: '重置链接已过期或无效，请重新申请'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: '密码重置成功'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Password reset confirm error:', error);
    return new Response(JSON.stringify({
      error: '操作失败，请稍后重试',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
