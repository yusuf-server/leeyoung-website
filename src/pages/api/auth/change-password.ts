import type { APIRoute } from 'astro';

export const prerender = false;

const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;
const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Check if user is authenticated
    const sessionToken = cookies.get('woo_session')?.value;

    console.log('🔐 Change password request received');
    console.log('Session token exists:', !!sessionToken);

    if (!sessionToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Not authenticated'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    console.log('Password lengths - current:', currentPassword?.length, 'new:', newPassword?.length);

    // Validate input
    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Current password and new password are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (newPassword.length < 8) {
      return new Response(JSON.stringify({
        success: false,
        error: 'New password must be at least 8 characters'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Decode session token to get user info
    let sessionData;
    try {
      sessionData = JSON.parse(atob(sessionToken));
      console.log('Session data decoded:', { userId: sessionData.userId, email: sessionData.email });
    } catch (decodeError) {
      console.error('Failed to decode session token:', decodeError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid session token'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = sessionData.userId;
    const username = sessionData.username;
    const userEmail = sessionData.email;

    if (!userId || !username) {
      console.error('Missing userId or username in session:', { userId, username });
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid session'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Verifying current password for user:', username);

    // Verify current password by attempting to authenticate
    const verifyResponse = await fetch(
      `${WOOCOMMERCE_URL}/wp-json/api/v1/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: currentPassword,
        }),
      }
    );

    console.log('Password verification response status:', verifyResponse.status);

    if (!verifyResponse.ok) {
      const verifyError = await verifyResponse.text();
      console.error('Password verification failed:', verifyError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Current password is incorrect'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Current password verified, updating password for userId:', userId);

    // Update password using WooCommerce REST API
    const updateResponse = await fetch(
      `${WOOCOMMERCE_URL}/wp-json/wc/v3/customers/${userId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`)}`
        },
        body: JSON.stringify({
          password: newPassword,
        }),
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

    console.log('✅ Password updated successfully');

    return new Response(JSON.stringify({
      success: true,
      message: 'Password updated successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'An error occurred while updating password',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
