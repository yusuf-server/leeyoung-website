import type { APIRoute } from 'astro';

export const prerender = false;

const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;

/**
 * Get available payment methods from WooCommerce Store API
 * This will return payment methods available for the current cart
 */
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const cartKey = cookies.get('wc_cart_hash')?.value || '';

    // Fetch checkout data which includes available payment methods
    const response = await fetch(
      `${WOOCOMMERCE_URL}/wp-json/wc/store/v1/checkout`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cart-Token': cartKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch payment methods');
    }

    const checkoutData = await response.json();

    // Extract payment methods from checkout data
    const paymentMethods = checkoutData.payment_methods || [];

    return new Response(
      JSON.stringify({
        success: true,
        gateways: paymentMethods.map((method: any) => ({
          id: method.id,
          title: method.title,
          description: method.description,
          supports: method.supports || [],
        })),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch payment methods',
        details: error.message,
        gateways: [],
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
