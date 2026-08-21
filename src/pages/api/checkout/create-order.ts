import type { APIRoute } from 'astro';

export const prerender = false;

const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;

/**
 * Create order using WooCommerce Store API
 * This uses the cart session and creates an order with the selected payment method
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const orderData = await request.json();
    const cartKey = cookies.get('wc_cart_hash')?.value || '';

    console.log('Creating order with Store API');

    // Prepare checkout data for WooCommerce Store API
    const checkoutData = {
      billing_address: {
        first_name: orderData.billing.first_name,
        last_name: orderData.billing.last_name,
        address_1: orderData.billing.address_1,
        address_2: orderData.billing.address_2 || '',
        city: orderData.billing.city,
        state: orderData.billing.state,
        postcode: orderData.billing.postcode,
        country: orderData.billing.country,
        email: orderData.billing.email,
        phone: orderData.billing.phone,
      },
      shipping_address: {
        first_name: orderData.shipping.first_name,
        last_name: orderData.shipping.last_name,
        address_1: orderData.shipping.address_1,
        address_2: orderData.shipping.address_2 || '',
        city: orderData.shipping.city,
        state: orderData.shipping.state,
        postcode: orderData.shipping.postcode,
        country: orderData.shipping.country,
      },
      payment_method: orderData.payment_method,
    };

    // Create order using Store API
    const response = await fetch(
      `${WOOCOMMERCE_URL}/wp-json/wc/store/v1/checkout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cart-Token': cartKey,
        },
        body: JSON.stringify(checkoutData),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('WooCommerce order creation failed:', result);
      return new Response(
        JSON.stringify({
          error: result.message || 'Failed to create order',
          details: result,
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order created successfully:', result.order_id);

    // Clear cart cookie after successful order
    cookies.delete('wc_cart_hash', { path: '/' });

    // Return order data
    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: result.order_id,
          order_key: result.order_key,
          status: result.status,
          total: result.totals?.total_price,
          // WooCommerce will handle payment redirect
          // If payment method requires redirect (like Stripe), this URL will be provided
          payment_url: result.payment_result?.redirect ||
                      `${WOOCOMMERCE_URL}/checkout/order-received/${result.order_id}/?key=${result.order_key}`,
          payment_result: result.payment_result,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Order creation error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create order. Please try again.',
        details: error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
