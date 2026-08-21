import type { APIRoute } from 'astro';

const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: '请输入邮箱地址' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 调用 WordPress 密码重置 API
    const formData = new FormData();
    formData.append('user_login', email);

    const response = await fetch(
      `${WOOCOMMERCE_URL}/wp-login.php?action=lostpassword`,
      {
        method: 'POST',
        body: formData,
        redirect: 'manual' // 不自动跟随重定向
      }
    );

    // WordPress 成功时会重定向，我们检查状态码
    if (response.status === 302 || response.status === 200) {
      return new Response(JSON.stringify({
        success: true,
        message: '重置链接已发送'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 如果不是重定向，可能是错误
    const text = await response.text();

    return new Response(JSON.stringify({
      error: '发送失败，请检查邮箱地址是否正确'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Password reset error:', error);
    return new Response(JSON.stringify({
      error: '操作失败，请稍后重试',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
