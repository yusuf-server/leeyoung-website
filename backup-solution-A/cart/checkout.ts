import type { APIRoute } from 'astro';

export const prerender = false;

const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;

/**
 * WooCommerce Store API - Checkout
 * This handles the checkout process using WooCommerce Store API
 */

// Update checkout (set billing/shipping address)
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const checkoutData = await request.json();
    const cartKey = cookies.get('wc_cart_hash')?.value || '';

    // Update billing address
    if (checkoutData.billing_address) {
      await fetch(`${WOOCOMMERCE_URL}/wp-json/wc/store/v1/cart/update-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cart-Token': cartKey,
        },
        body: JSON.stringify({
          billing_address: checkoutData.billing_address,
          shipping_address: checkoutData.shipping_address || checkoutData.billing_address,
        }),
      });
    }

    // Get checkout data (includes available payment methods, shipping methods, etc.)
    const checkoutResponse = await fetch(
      `${WOOCOMMERCE_URL}/wp-json/wc/store/v1/checkout`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cart-Token': cartKey,
        },
      }
    );

    if (!checkoutResponse.ok) {
      throw new Error('Failed to fetch checkout data');
    }

    const checkout = await checkoutResponse.json();

    return new Response(JSON.stringify(checkout), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing checkout:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process checkout' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Get checkout data
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const cartKey = cookies.get('wc_cart_hash')?.value || '';

    const response = await fetch(`${WOOCOMMERCE_URL}/wp-json/wc/store/v1/checkout`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cart-Token': cartKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch checkout data');
    }

    const checkout = await response.json();

    return new Response(JSON.stringify(checkout), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching checkout:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch checkout data' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
