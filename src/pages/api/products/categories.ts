import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;

    if (!WOOCOMMERCE_URL) {
      throw new Error('WooCommerce URL not configured');
    }

    // 使用 WooCommerce Store API (公开接口，无需认证)
    const response = await fetch(
      `${WOOCOMMERCE_URL}/wp-json/wc/store/v1/products/categories?per_page=10&hide_empty=true&order=desc&orderby=count`
    );

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status}`);
    }

    const categories = await response.json();

    // 格式化分类数据
    const formattedCategories = categories.map((category: any) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      count: category.count,
    }));

    return new Response(
      JSON.stringify({
        categories: formattedCategories,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Categories API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch categories',
        categories: [],
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
