import { useQuery } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import { authApi, type SessionUser } from './api';
import { queryClient } from './queryClient';

export type Session = { user: SessionUser } | null;

export const sessionQuery = {
  queryKey: ['session'] as const,
  queryFn: authApi.session as unknown as () => Promise<Session>,
  staleTime: 15_000,
};

export function useSession() {
  return useQuery(sessionQuery);
}

/** Route guard: redirects anonymous (or wrong-role) users to the login page. */
export async function requireRole(role?: string) {
  const session = await queryClient.ensureQueryData(sessionQuery);
  if (!session?.user) throw redirect({ to: '/login' });
  if (role && session.user.role !== role) throw redirect({ to: '/login' });
  return session;
}
