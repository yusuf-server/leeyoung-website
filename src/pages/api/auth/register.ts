import type { APIRoute } from 'astro';

export const prerender = false;

const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { username, email, password, firstName, lastName } = await request.json();

    if (!username || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Username, email, and password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 使用WooCommerce API创建客户
    const response = await fetch(
      `${WOOCOMMERCE_URL}/wp-json/wc/v3/customers?consumer_key=${CONSUMER_KEY}&consumer_secret=${CONSUMER_SECRET}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password,
          first_name: firstName || '',
          last_name: lastName || '',
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.message || 'Registration failed';
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account created successfully! You can now log in.',
        user: {
          id: data.id,
          username: data.username,
          email: data.email,
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return new Response(
      JSON.stringify({ error: 'Registration failed. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
