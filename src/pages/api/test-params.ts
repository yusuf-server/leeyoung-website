import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, request }) => {
  return new Response(
    JSON.stringify({
      'url.href': url.href,
      'url.search': url.search,
      'url.searchParams.toString()': url.searchParams.toString(),
      'q param': url.searchParams.get('q'),
      'request.url': request.url,
      'all params': Object.fromEntries(url.searchParams)
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
