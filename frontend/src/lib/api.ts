import type { Session } from '../../../shared/api';

export type { Session, SessionUser } from '../../../shared/api';

/** Minimal fetch client: same-origin API, cookie sessions included. */
const BASE = import.meta.env.VITE_API_URL ?? '';

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: any } = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'include',
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as any)?.message || (data as any)?.error || res.statusText;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
  return data as T;
}

export const authApi = {
  session: async (): Promise<Session> => {
    const session: Session = await fetch(`${BASE}/api/auth/get-session?disableCookieCache=true`, {
      credentials: 'include',
      cache: 'no-store',
    }).then((r) => (r.ok ? r.json() : null));
    if (session?.user.role === 'ADMIN') {
      const res = await fetch(`${BASE}/api/admin/permissions`, { credentials: 'include', cache: 'no-store' });
      session.user.permissions = res.ok ? await res.json() : [];
    }
    return session;
  },
  login: (email: string, password: string) =>
    api('/api/auth/sign-in/email', { body: { email, password } }),
  logout: () => api('/api/auth/sign-out', { body: {} }),
};

export const onboardingApi = {
  listCategories: () => api('/api/categories'),
  registerTeacher: (dto: {
    name: string; email: string; password: string; phoneNumber?: string; subject: string;
  }) => api('/api/onboarding/teacher', { body: dto }),
  registerStudent: (dto: {
    name: string; password: string; phoneNumber: string; email?: string; gradeId?: string;
  }) => api('/api/onboarding/student', { body: dto }),
  registerParent: (dto: {
    name: string; email: string; password: string; phoneNumber?: string; studentPhone?: string;
  }) => api('/api/onboarding/parent', { body: dto }),
};
