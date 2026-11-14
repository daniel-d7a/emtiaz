const DEFAULT_API_ORIGIN = 'https://api.emtyazapp.com';

function resolveApiOrigin(env) {
  const raw = (env?.API_ORIGIN || env?.BACKEND_URL || env?.VITE_API_URL || DEFAULT_API_ORIGIN).trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/$/, '');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (
      url.pathname.startsWith('/api/') ||
      url.pathname === '/api' ||
      url.pathname === '/sitemap.xml' ||
      url.pathname === '/robots.txt'
    ) {
      const apiOrigin = resolveApiOrigin(env);
      const targetUrl = `${apiOrigin}${url.pathname}${url.search}`;

      const headers = new Headers(request.headers);
      headers.set('X-Forwarded-Host', url.host);
      headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

      const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
      const upstreamResponse = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: hasBody ? request.body : undefined,
        redirect: 'manual',
      });

      const responseHeaders = new Headers(upstreamResponse.headers);
      const setCookies =
        typeof upstreamResponse.headers.getSetCookie === 'function'
          ? upstreamResponse.headers.getSetCookie()
          : [];

      if (setCookies.length > 0) {
        responseHeaders.delete('set-cookie');
        for (const cookie of setCookies) {
          responseHeaders.append('set-cookie', cookie.replace(/;\s*Domain=[^;]+/gi, ''));
        }
      }

      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
      });
    }

    return env.ASSETS.fetch(request);
  },
};
