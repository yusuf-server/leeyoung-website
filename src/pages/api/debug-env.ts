import type { APIRoute } from 'astro';
import { getEnv, validateEnv } from '../../lib/env';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    // 尝试获取环境变量
    const env = getEnv(locals);
    const validation = validateEnv(env);

    const result = {
      timestamp: new Date().toISOString(),
      environment: {
        hasLocals: !!locals,
        hasRuntime: !!(locals as any)?.runtime,
        hasRuntimeEnv: !!(locals as any)?.runtime?.env,
        hasImportMetaEnv: typeof import.meta !== 'undefined' && !!import.meta.env,
      },
      envVariables: {
        WOOCOMMERCE_URL: env.WOOCOMMERCE_URL ? `${env.WOOCOMMERCE_URL.substring(0, 20)}...` : 'NOT SET',
        WOOCOMMERCE_CONSUMER_KEY: env.WOOCOMMERCE_CONSUMER_KEY ? `${env.WOOCOMMERCE_CONSUMER_KEY.substring(0, 10)}...` : 'NOT SET',
        WOOCOMMERCE_CONSUMER_SECRET: env.WOOCOMMERCE_CONSUMER_SECRET ? 'SET (hidden)' : 'NOT SET',
        PUBLIC_STRIPE_PUBLISHABLE_KEY: env.PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'SET (hidden)' : 'NOT SET',
      },
      validation: {
        valid: validation.valid,
        missing: validation.missing,
      },
      test: null as any,
    };

    // 尝试访问 WooCommerce API
    if (validation.valid) {
      try {
        const url = `${env.WOOCOMMERCE_URL}/wp-json/wc/v3/products?consumer_key=${env.WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${env.WOOCOMMERCE_CONSUMER_SECRET}&per_page=1`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'LEEYOUNG-Website/1.0',
          },
        });

        const contentType = response.headers.get('content-type') || '';
        let data: any = null;

        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
          data = data.substring(0, 500); // 只返回前500字符
        }

        result.test = {
          status: response.status,
          ok: response.ok,
          contentType,
          dataType: typeof data,
          dataPreview: Array.isArray(data) ? `Array(${data.length})` : JSON.stringify(data).substring(0, 200),
        };
      } catch (error: any) {
        result.test = {
          error: error.message,
          stack: error.stack?.substring(0, 500),
        };
      }
    }

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
      }, null, 2),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
