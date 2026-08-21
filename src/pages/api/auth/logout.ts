import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  // 删除session cookie
  cookies.delete('woo_session', {
    path: '/',
  });

  return new Response(
    JSON.stringify({ success: true, message: 'Logged out successfully' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
