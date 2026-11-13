interface Env {
  ASSETS: {
    fetch: (request: Request | URL | string) => Promise<Response>;
  };
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // 1. Try to serve existing static assets (/assets/..., /landing/..., favicon, etc.)
  const asset = await env.ASSETS.fetch(request);
  if (asset.status !== 404) {
    return asset;
  }

  // 2. If no static asset matches, serve root index.html (SPA entry) with 200 OK
  return env.ASSETS.fetch(new URL('/', request.url));
};
