import Constants from 'expo-constants';
import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';
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

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

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
    throw new ApiError(typeof message === 'string' ? message : JSON.stringify(message), res.status);
  }
  return data as T;
}

export async function uploadFile(uploadUrl: string, uri: string, mimeType: string) {
  const file = new File(uri);
  const res = await expoFetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: file,
  });
  if (!res.ok) throw new ApiError('Upload failed', res.status);
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
