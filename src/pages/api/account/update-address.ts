import type { APIRoute } from 'astro';

const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET;

export const POST: APIRoute = async ({ request, cookies }) => {
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
    const body = await request.json();

    // Update shipping address in WooCommerce
    const updateData: any = {
      shipping: {
        first_name: body.firstName || '',
        last_name: body.lastName || '',
        address_1: body.address || '',
        address_2: body.address2 || '',
        city: body.city || '',
        state: body.state || '',
        postcode: body.postcode || '',
        country: body.country || 'US'
      }
    };

    const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);
    const response = await fetch(
      `${WOOCOMMERCE_URL}/wp-json/wc/v3/customers/${userId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      }
    );

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.statusText}`);
    }

    const customer = await response.json();

    return new Response(JSON.stringify({
      success: true,
      customer
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Update address error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to update address',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
