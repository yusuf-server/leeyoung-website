import type { APIRoute } from 'astro';
import { getProductVariations } from '../../../../lib/woocommerce';
import { getEnv } from '../../../../lib/env';

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // 获取环境变量（兼容 Cloudflare Pages）
    const env = getEnv(locals);

    const productId = parseInt(params.id || '0');

    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'Product ID is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const variations = await getProductVariations(productId, env);

    return new Response(JSON.stringify(variations), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Variations API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch variations' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
