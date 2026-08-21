import type { APIRoute } from 'astro';

export const prerender = false;

const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;

/**
 * WooCommerce Store API for Cart Management
 * Uses the WooCommerce Store API (not REST API)
 * Store API endpoint: /wp-json/wc/store/v1/
 */

// Get Cart
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const cartKey = cookies.get('wc_cart_hash')?.value || '';

    const response = await fetch(`${WOOCOMMERCE_URL}/wp-json/wc/store/v1/cart`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cart-Token': cartKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch cart');
    }

    const cart = await response.json();

    // Store cart hash in cookie
    const newCartHash = response.headers.get('Cart-Token');
    if (newCartHash) {
      cookies.set('wc_cart_hash', newCartHash, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
        sameSite: 'lax',
      });
    }

    return new Response(JSON.stringify(cart), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch cart' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Add item to cart
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { product_id, quantity = 1, variation_id } = await request.json();
    const cartKey = cookies.get('wc_cart_hash')?.value || '';

    const response = await fetch(`${WOOCOMMERCE_URL}/wp-json/wc/store/v1/cart/add-item`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cart-Token': cartKey,
      },
      body: JSON.stringify({
        id: variation_id || product_id,
        quantity: quantity,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add item to cart');
    }

    const cart = await response.json();

    // Store cart hash in cookie
    const newCartHash = response.headers.get('Cart-Token');
    if (newCartHash) {
      cookies.set('wc_cart_hash', newCartHash, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        httpOnly: true,
        sameSite: 'lax',
      });
    }

    return new Response(JSON.stringify(cart), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to add item to cart' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Update cart item
export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    const { item_key, quantity } = await request.json();
    const cartKey = cookies.get('wc_cart_hash')?.value || '';

    const response = await fetch(
      `${WOOCOMMERCE_URL}/wp-json/wc/store/v1/cart/update-item`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cart-Token': cartKey,
        },
        body: JSON.stringify({
          key: item_key,
          quantity: quantity,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update cart item');
    }

    const cart = await response.json();

    return new Response(JSON.stringify(cart), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating cart:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update cart item' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Remove item from cart
export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    const { item_key } = await request.json();
    const cartKey = cookies.get('wc_cart_hash')?.value || '';

    const response = await fetch(
      `${WOOCOMMERCE_URL}/wp-json/wc/store/v1/cart/remove-item`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cart-Token': cartKey,
        },
        body: JSON.stringify({
          key: item_key,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to remove cart item');
    }

    const cart = await response.json();

    return new Response(JSON.stringify(cart), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error removing from cart:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to remove cart item' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
