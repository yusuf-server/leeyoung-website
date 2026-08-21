import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const modelUrl = url.searchParams.get('url');

  if (!modelUrl) {
    return new Response('Missing URL parameter', { status: 400 });
  }

  try {
    console.log('Fetching model from:', modelUrl);

    // 从 WordPress 获取 GLB 文件
    const response = await fetch(modelUrl);

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('Failed to fetch model, status:', response.status);
      return new Response('Failed to fetch model', { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    console.log('Buffer size:', buffer.byteLength);

    // 返回文件并添加 CORS 头
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000',
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(`Failed to proxy model: ${error}`, { status: 500 });
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
