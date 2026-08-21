import type { APIRoute } from 'astro';
import Stripe from 'stripe';

export const prerender = false;

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET;

/**
 * 创建 Stripe Payment Intent
 * 在前端完成支付，然后创建 WooCommerce 订单
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { billing, shipping } = await request.json();

    // 1. 获取购物车数据
    const cartKey = cookies.get('wc_cart_hash')?.value || '';
    const cartResponse = await fetch(`${WOOCOMMERCE_URL}/wp-json/wc/store/v1/cart`, {
      headers: {
        'Cart-Token': cartKey,
      },
    });

    if (!cartResponse.ok) {
      throw new Error('Failed to fetch cart');
    }

    const cart = await cartResponse.json();

    if (!cart.items || cart.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Cart is empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. 计算总金额（从购物车获取）
    const totalAmount = parseInt(cart.totals.total_price);

    // 3. 创建 Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount, // Stripe 使用最小货币单位（分）
      currency: cart.totals.currency_code.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        cart_key: cartKey,
        customer_email: billing.email,
        customer_name: `${billing.first_name} ${billing.last_name}`,
      },
      description: `Order from ${billing.email}`,
      shipping: {
        name: `${shipping.first_name} ${shipping.last_name}`,
        address: {
          line1: shipping.address_1,
          line2: shipping.address_2 || undefined,
          city: shipping.city,
          state: shipping.state,
          postal_code: shipping.postcode,
          country: shipping.country,
        },
      },
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        amount: totalAmount,
        currency: cart.totals.currency_code,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to create payment intent' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
