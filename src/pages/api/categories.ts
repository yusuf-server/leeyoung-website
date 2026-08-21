import type { APIRoute } from 'astro';
import { getProductCategories } from '../../lib/woocommerce';

export const GET: APIRoute = async ({ url }) => {
  try {
    const searchParams = url.searchParams;

    const params: any = {
      per_page: parseInt(searchParams.get('per_page') || '100'),
    };

    // 只获取父级分类
    if (searchParams.get('parent') !== null) {
      params.parent = parseInt(searchParams.get('parent') || '0');
    }

    const categories = await getProductCategories(params);

    return new Response(JSON.stringify(categories), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Categories API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch categories' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
