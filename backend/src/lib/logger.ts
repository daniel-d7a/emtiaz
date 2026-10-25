import pino from 'pino';
import { randomUUID } from 'crypto';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  redact: {
    paths: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
    censor: '[redacted]',
  },
});

/** Reuse an upstream request id when present, otherwise mint one and echo it back. */
export function requestId(req: { headers: Record<string, unknown> }, res: { setHeader(k: string, v: string): unknown }) {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && incoming ? incoming : randomUUID();
  res.setHeader('x-request-id', id);
  return id;
}
