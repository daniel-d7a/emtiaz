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

export async function resolveAttachmentUrl(a: { id: string; url: string | null }): Promise<string> {
  if (a.url) return a.url;
  const d = await api<{ url: string }>(`/api/storage/attachments/${a.id}/download`);
  return d.url;
}

export async function resolveAttachmentDownloadUrl(a: { id: string; url: string | null }): Promise<string> {
  if (a.url) return a.url;
  const d = await api<{ url: string }>(`/api/storage/attachments/${a.id}/download?download=1`);
  return d.url;
}

export async function deleteUploadedObject(objectKey?: string | null) {
  if (!objectKey) return;
  try {
    await api('/api/storage/uploaded', { method: 'DELETE', body: { objectKey } });
  } catch {
    // Best-effort cleanup; keep the original save error.
  }
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
  login: (identifier: string, password: string) =>
    identifier.includes('@')
      ? api('/api/auth/sign-in/email', { body: { email: identifier.trim(), password } })
      : api('/api/auth/sign-in/phone-number', {
          body: { phoneNumber: normalizePhone(identifier), password },
        }),
  logout: () => api('/api/auth/sign-out', { body: {} }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api('/api/me/change-password', { body: { currentPassword, newPassword } }),
};

function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('968') && digits.length === 11) return `+${digits}`;
  if (digits.length === 8) return `+968${digits.startsWith('0') ? digits.slice(1) : digits}`;
  return `+${digits}`;
}
