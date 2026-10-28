import { useQuery } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import { authApi } from './api';
import { queryClient } from './queryClient';
import type { AdminPermission, Session } from '../../../shared/api';

export type { Session } from '../../../shared/api';

export const sessionQuery = {
  queryKey: ['session'] as const,
  queryFn: authApi.session,
  staleTime: 15_000,
};

export function useSession() {
  return useQuery(sessionQuery);
}

export function useAdminPermissions() {
  const { data } = useSession();
  const permissions = data?.user.permissions ?? [];
  return (...required: AdminPermission[]) =>
    required.some((permission) => permissions.includes(permission));
}

/** Route guard: redirects anonymous (or wrong-role) users to the login page. */
export async function requireRole(role?: string) {
  const session = await queryClient.ensureQueryData(sessionQuery);
  if (!session?.user) throw redirect({ to: '/login' });
  if (role && session.user.role !== role) throw redirect({ to: '/login' });
  return session;
}
