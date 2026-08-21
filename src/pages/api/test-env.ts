import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const url = import.meta.env.WOOCOMMERCE_URL;

  return new Response(
    JSON.stringify({
      WOOCOMMERCE_URL: url || 'NOT_FOUND',
      allEnv: Object.keys(import.meta.env).filter(k => k.includes('WOOCOMMERCE'))
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};
