import Constants from 'expo-constants';

/** API base: in Expo Go the app runs on the same LAN host as Metro, so derive the API
 *  port from the manifest hostUri. Override by setting EMelia note below for prod.
 *  prod: hardcode https://api.emtiaz.om \\
 */
function apiBase(): string {
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
  session: () => fetch(`${API}/api/auth/get-session`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null)),
  login: (email: string, password: string) => api('/api/auth/sign-in/email', { body: { email, password } }),
  logout: () => api('/api/auth/sign-out', { body: {} }),
};
