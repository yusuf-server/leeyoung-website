import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  const WOOCOMMERCE_URL = import.meta.env.WOOCOMMERCE_URL;
  const CONSUMER_KEY = import.meta.env.WOOCOMMERCE_CONSUMER_KEY;
  const CONSUMER_SECRET = import.meta.env.WOOCOMMERCE_CONSUMER_SECRET;

  const results = {
    env: {
      url: WOOCOMMERCE_URL || 'NOT SET',
      hasKey: !!CONSUMER_KEY,
      hasSecret: !!CONSUMER_SECRET,
      keyPrefix: CONSUMER_KEY ? CONSUMER_KEY.substring(0, 6) + '...' : 'NOT SET',
    },
    tests: [] as any[]
  };

  // Test 1: Basic connectivity
  try {
    const testUrl = `${WOOCOMMERCE_URL}`;
    const response = await fetch(testUrl);
    results.tests.push({
      name: 'WordPress Site Accessible',
      url: testUrl,
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
    });
  } catch (error: any) {
    results.tests.push({
      name: 'WordPress Site Accessible',
      error: error.message,
      ok: false
    });
  }

  // Test 2: WooCommerce REST API endpoint
  try {
    const apiUrl = `${WOOCOMMERCE_URL}/wp-json/wc/v3/products`;
    const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);

    const response = await fetch(apiUrl + '?per_page=1', {
      headers: {
        'Authorization': `Basic ${auth}`,
      }
    });

    const contentType = response.headers.get('content-type') || '';
    let responseData: any = null;
    let responseText = '';

    try {
      responseText = await response.text();
      if (contentType.includes('application/json')) {
        responseData = JSON.parse(responseText);
      }
    } catch (e) {
      responseData = responseText.substring(0, 200);
    }

    results.tests.push({
      name: 'WooCommerce API Call',
      url: apiUrl,
      status: response.status,
      ok: response.ok,
      contentType: contentType,
      isJson: contentType.includes('application/json'),
      responsePreview: typeof responseData === 'string' ? responseData : JSON.stringify(responseData, null, 2).substring(0, 500),
    });
  } catch (error: any) {
    results.tests.push({
      name: 'WooCommerce API Call',
      error: error.message,
      ok: false
    });
  }

  // Test 3: Check if WooCommerce is installed
  try {
    const wcUrl = `${WOOCOMMERCE_URL}/wp-json/wc/v3/system_status`;
    const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);

    const response = await fetch(wcUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
      }
    });

    results.tests.push({
      name: 'WooCommerce Installed Check',
      url: wcUrl,
      status: response.status,
      ok: response.ok,
      message: response.ok ? 'WooCommerce API is responding' : 'WooCommerce may not be installed or API is disabled'
    });
  } catch (error: any) {
    results.tests.push({
      name: 'WooCommerce Installed Check',
      error: error.message,
      ok: false
    });
  }

  return new Response(JSON.stringify(results, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
