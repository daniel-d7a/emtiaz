import Constants from 'expo-constants';
import type { Session } from '../../shared/api';

/** API base: set EXPO_PUBLIC_API_URL to override (required with `expo start --tunnel`,
 *  where hostUri is the ngrok host and cannot reach the API). Otherwise derive the
 *  API host from Metro's hostUri on the same LAN. */
function apiBase(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const uri = Constants.expoConfig?.hostUri;
  if (uri) return `http://${uri.split(':')[0]}:3000`;
  return 'http://localhost:3000';
}
export const API = apiBase();

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: any } = {},
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as any)?.message || res.statusText;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
  return data as T;
}

export const authApi = {
  session: (): Promise<Session> =>
    fetch(`${API}/api/auth/get-session`, {
      credentials: 'include',
      signal: AbortSignal.timeout(8000),
    }).then((r) => (r.ok ? r.json() : null)),
  login: (email: string, password: string) => api('/api/auth/sign-in/email', { body: { email, password } }),
  logout: () => api('/api/auth/sign-out', { body: {} }),
};
