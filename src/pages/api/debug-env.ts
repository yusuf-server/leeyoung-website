import type { APIRoute } from 'astro';
import { getEnv, validateEnv, buildWooCommerceApiUrl } from '../../lib/env';

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
      directFetchTest: null as any,
    };

    // 直接测试fetch，捕获原始响应
    if (validation.valid) {
      try {
        const url = buildWooCommerceApiUrl(env, '/products', { per_page: '1' });

        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; LEEYOUNG-Website/1.0)',
          },
        });

        const contentType = response.headers.get('content-type') || '';
        const responseText = await response.text();

        result.directFetchTest = {
          url: url.replace(/consumer_(key|secret)=[^&]+/g, 'consumer_$1=***'), // 隐藏密钥
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          contentType,
          isJson: contentType.includes('application/json'),
          responseLength: responseText.length,
          responsePreview: responseText.substring(0, 500),
          headers: {
            'content-type': response.headers.get('content-type'),
            'server': response.headers.get('server'),
            'cf-ray': response.headers.get('cf-ray'),
          },
        };
      } catch (error: any) {
        result.directFetchTest = {
          success: false,
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
