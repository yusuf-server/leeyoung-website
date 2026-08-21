import type { APIRoute } from 'astro';

export const prerender = false;

const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET;

/**
 * Webhook endpoint for payment gateway notifications
 * This endpoint can receive payment status updates from payment gateways
 * and sync with WooCommerce order status
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    console.log('Webhook received:', data);

    // Here you can handle different payment gateway webhooks
    // For example, PayPal, Stripe, etc.

    // Example: Update order status in WooCommerce
    if (data.order_id && data.status) {
      const orderId = data.order_id;
      const newStatus = data.status;

      const response = await fetch(
        `${WOOCOMMERCE_URL}/wp-json/wc/v3/orders/${orderId}?consumer_key=${CONSUMER_KEY}&consumer_secret=${CONSUMER_SECRET}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error('Failed to update order status:', result);
        return new Response(
          JSON.stringify({ error: 'Failed to update order' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      console.log('Order status updated:', result.id, result.status);

      return new Response(
        JSON.stringify({ success: true, order: result }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook received' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * GET endpoint for webhook verification
 * Some payment gateways send a GET request to verify the webhook URL
 */
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      status: 'active',
      message: 'Webhook endpoint is active'
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
