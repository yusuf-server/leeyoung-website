import type { APIRoute } from 'astro';

const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET;

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Check authentication
    const sessionToken = cookies.get('woo_session')?.value;

    if (!sessionToken) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse session token
    let sessionData;
    try {
      sessionData = JSON.parse(atob(sessionToken));
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!sessionData?.userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = sessionData.userId;

    // Get customer data from WooCommerce
    const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);
    const response = await fetch(
      `${WOOCOMMERCE_URL}/wp-json/wc/v3/customers/${userId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.statusText}`);
    }

    const customer = await response.json();

    return new Response(JSON.stringify({
      success: true,
      profile: {
        firstName: customer.first_name || '',
        lastName: customer.last_name || '',
        email: customer.email || '',
        phone: customer.billing?.phone || '',
        shipping: {
          address: customer.shipping?.address_1 || '',
          address2: customer.shipping?.address_2 || '',
          city: customer.shipping?.city || '',
          state: customer.shipping?.state || '',
          postcode: customer.shipping?.postcode || '',
          country: customer.shipping?.country || 'US'
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Get profile error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to load profile',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
