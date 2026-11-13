export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Normalize /landing to /landing/
    if (url.pathname === '/landing') {
      url.pathname = '/landing/';
      return Response.redirect(url.toString(), 308);
    }

    // 2. Attempt to serve physical static assets (/assets/..., /landing/..., favicon.svg, etc.)
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) {
      return asset;
    }

    // 3. For any unmatched route (SPA client-side routes like /login, /register, etc.),
    // fall back to /index.html and return 200 OK so the browser router can mount.
    const indexUrl = new URL('/index.html', request.url);
    const spaResponse = await env.ASSETS.fetch(new Request(indexUrl.toString(), request));
    return new Response(spaResponse.body, {
      status: 200,
      headers: spaResponse.headers,
    });
  },
};
