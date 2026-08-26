import type { APIRoute } from 'astro';

const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { key, login, password } = body;

    console.log('🔐 Password reset confirm request:', { key: key?.substring(0, 10) + '...', login });

    if (!key || !login || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required parameters'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Password must be at least 8 characters'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Step 1: Validate the reset key and get user info using WordPress API
    const validateResponse = await fetch(
      `${WOOCOMMERCE_URL}/wp-json/wp/v2/users/reset-password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: key,
          login: login
        })
      }
    );

    let userId;

    // If the custom endpoint doesn't exist, try to get user by login
    if (!validateResponse.ok) {
      console.log('Custom reset endpoint not available, fetching user by email/username');

      // Try to find user by email or username
      const usersResponse = await fetch(
        `${WOOCOMMERCE_URL}/wp-json/wc/v3/customers?email=${encodeURIComponent(login)}&consumer_key=${CONSUMER_KEY}&consumer_secret=${CONSUMER_SECRET}`
      );

      if (!usersResponse.ok) {
        // Try by username if email didn't work
        const usersByUsername = await fetch(
          `${WOOCOMMERCE_URL}/wp-json/wc/v3/customers?search=${encodeURIComponent(login)}&consumer_key=${CONSUMER_KEY}&consumer_secret=${CONSUMER_SECRET}`
        );

        if (usersByUsername.ok) {
          const users = await usersByUsername.json();
          if (users && users.length > 0) {
            userId = users[0].id;
          }
        }
      } else {
        const users = await usersResponse.json();
        if (users && users.length > 0) {
          userId = users[0].id;
        }
      }

      if (!userId) {
        console.error('User not found:', login);
        return new Response(JSON.stringify({
          success: false,
          error: 'User not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      const validateData = await validateResponse.json();
      userId = validateData.user_id;
    }

    console.log('Found user ID:', userId);

    // Step 2: Update password using WooCommerce REST API
    const updateResponse = await fetch(
      `${WOOCOMMERCE_URL}/wp-json/wc/v3/customers/${userId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`)}`
        },
        body: JSON.stringify({
          password: password
        })
      }
    );

    console.log('Password update response status:', updateResponse.status);

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json().catch(() => ({}));
      console.error('Password update failed:', errorData);
      return new Response(JSON.stringify({
        success: false,
        error: errorData.message || 'Failed to update password'
      }), {
        status: updateResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Password reset successfully');

    return new Response(JSON.stringify({
      success: true,
      message: 'Password reset successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Password reset confirm error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'An error occurred while resetting password',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
