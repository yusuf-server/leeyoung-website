import type { APIRoute } from 'astro';

export const prerender = false;

const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET;

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    // Check if user is logged in
    const sessionToken = cookies.get('woo_session')?.value;

    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse session
    let sessionData;
    try {
      sessionData = JSON.parse(atob(sessionToken));
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customerId = sessionData.userId;

    // Fetch orders from WooCommerce
    const response = await fetch(
      `${WOOCOMMERCE_URL}/wp-json/wc/v3/orders?customer=${customerId}&per_page=100&consumer_key=${CONSUMER_KEY}&consumer_secret=${CONSUMER_SECRET}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }

    const orders = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        orders: orders
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching orders:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch orders',
        details: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
