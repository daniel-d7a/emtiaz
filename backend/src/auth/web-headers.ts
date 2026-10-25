import type { Request } from 'express';

/** Convert Express incoming headers to a Web Headers object for Better Auth. */
export function toWebHeaders(headers: Request['headers']): Headers {
  const h = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) h.append(key, v);
  }
  return h;
}
