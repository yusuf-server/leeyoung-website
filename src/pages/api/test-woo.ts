import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;
    const searchUrl = `${WOOCOMMERCE_URL}/wp-json/wc/store/v1/products?search=hijab&per_page=5`;

    console.log('Fetching:', searchUrl);

    const response = await fetch(searchUrl);
    const data = await response.json();

    console.log('Response status:', response.status);
    console.log('Products count:', data.length);

    return new Response(
      JSON.stringify({
        url: searchUrl,
        status: response.status,
        productsCount: Array.isArray(data) ? data.length : 0,
        firstProduct: data[0] ? { id: data[0].id, name: data[0].name } : null,
        rawData: data
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
