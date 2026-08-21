import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  console.log('=== SEARCH API DEBUG ===');
  console.log('context.url:', context.url);
  console.log('context.url.href:', context.url?.href);
  console.log('context.url.search:', context.url?.search);
  console.log('context.request.url:', context.request.url);

  // 尝试多种方式获取查询参数
  const urlFromContext = context.url;
  const urlFromRequest = new URL(context.request.url);

  console.log('Query from context.url:', urlFromContext?.searchParams.get('q'));
  console.log('Query from request URL:', urlFromRequest.searchParams.get('q'));

  const query = urlFromContext?.searchParams.get('q') || urlFromRequest.searchParams.get('q') || '';

  console.log('Final query:', query);

  if (!query.trim()) {
    console.log('Empty query, returning empty array');
    return new Response(JSON.stringify({ products: [], debug: 'empty query' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;

    if (!WOOCOMMERCE_URL) {
      throw new Error('WooCommerce URL not configured');
    }

    const searchUrl = `${WOOCOMMERCE_URL}/wp-json/wc/store/v1/products?search=${encodeURIComponent(query)}&per_page=20`;
    console.log('Fetching from:', searchUrl);

    const response = await fetch(searchUrl);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Products received:', data.length);

    const formattedProducts = data.map((product: any) => {
      const price = parseInt(product.prices.price) / 100;
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: price.toFixed(2),
        images: product.images,
        stock_status: product.is_in_stock ? 'instock' : 'outofstock',
      };
    });

    return new Response(
      JSON.stringify({
        products: formattedProducts,
        total: formattedProducts.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Search API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to search products',
        products: [],
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
