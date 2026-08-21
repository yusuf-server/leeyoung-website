import type { APIRoute } from 'astro';
import { getEnv, validateEnv } from '../../lib/env';
import { getProducts } from '../../lib/woocommerce';

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
      realApiTest: null as any,
    };

    // 使用真实的 getProducts 函数测试
    if (validation.valid) {
      try {
        const products = await getProducts({ per_page: 2, env });

        result.realApiTest = {
          success: true,
          productsCount: products.length,
          firstProduct: products[0] ? {
            id: products[0].id,
            name: products[0].name,
            price: products[0].price,
          } : null,
        };
      } catch (error: any) {
        result.realApiTest = {
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
