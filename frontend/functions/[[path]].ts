interface Env {
  ASSETS: {
    fetch: (request: Request | URL | string) => Promise<Response>;
  };
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // 1. Normalize /landing to /landing/
  if (url.pathname === '/landing') {
    return Response.redirect(new URL('/landing/', request.url).toString(), 308);
  }

  // 2. Try to serve existing static assets (/assets/..., /landing/..., favicon, etc.)
  const asset = await env.ASSETS.fetch(request);
  if (asset.status !== 404) {
    return asset;
  }

  // 3. If no static asset matches, serve /index.html with 200 OK for SPA client-side routing
  const indexUrl = new URL('/index.html', request.url);
  const spaResponse = await env.ASSETS.fetch(new Request(indexUrl.toString(), request));
  return new Response(spaResponse.body, {
    status: 200,
    headers: spaResponse.headers,
  });
};
