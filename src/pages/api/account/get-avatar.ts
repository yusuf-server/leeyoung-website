import type { APIRoute } from 'astro';

export const prerender = false;

const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const sessionToken = cookies.get('woo_session')?.value;

    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse session
    let sessionData;
    try {
      sessionData = JSON.parse(atob(sessionToken));
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Try to get custom avatar from WordPress custom endpoint
    try {
      const response = await fetch(
        `${WOOCOMMERCE_URL}/wp-json/custom/v1/get-avatar`,
        {
          headers: {
            'Authorization': `Bearer ${sessionData.token}`
          }
        }
      );

      if (response.ok) {
        const avatarData = await response.json();

        // Return the WordPress endpoint response
        if (avatarData.success) {
          return new Response(
            JSON.stringify(avatarData),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    } catch (e) {
      console.warn('Could not fetch custom avatar:', e);
    }

    // Return default avatar
    return new Response(
      JSON.stringify({
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(sessionData.username)}&size=96&background=000&color=fff`,
        source: 'default'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get avatar error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get avatar' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
