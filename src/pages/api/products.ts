import type { APIRoute } from 'astro';
import { getProducts, getProductCategories } from '../../lib/woocommerce';
import { getEnv } from '../../lib/env';

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // 获取环境变量（兼容 Cloudflare Pages）
    const env = getEnv(locals);

    const searchParams = url.searchParams;

    // 获取查询参数
    const params: any = {
      per_page: parseInt(searchParams.get('per_page') || '12'),
      page: parseInt(searchParams.get('page') || '1'),
      env,
    };

    // 分类筛选
    if (searchParams.get('category')) {
      params.category = searchParams.get('category');
    }

    // 标签筛选
    if (searchParams.get('tag')) {
      params.tag = searchParams.get('tag');
    }

    // 价格筛选
    if (searchParams.get('min_price')) {
      params.min_price = searchParams.get('min_price');
    }
    if (searchParams.get('max_price')) {
      params.max_price = searchParams.get('max_price');
    }

    // 排序
    const orderby = searchParams.get('orderby');
    if (orderby === 'price-low') {
      params.orderby = 'price';
      params.order = 'asc';
    } else if (orderby === 'price-high') {
      params.orderby = 'price';
      params.order = 'desc';
    } else if (orderby === 'name') {
      params.orderby = 'title';
      params.order = 'asc';
    } else if (orderby === 'newest') {
      params.orderby = 'date';
      params.order = 'desc';
    } else {
      params.orderby = 'date';
      params.order = 'desc';
    }

    // 特色/促销
    if (searchParams.get('featured') === 'true') {
      params.featured = true;
    }
    if (searchParams.get('on_sale') === 'true') {
      params.on_sale = true;
    }

    const products = await getProducts(params);

    return new Response(JSON.stringify(products), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Products API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch products' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
