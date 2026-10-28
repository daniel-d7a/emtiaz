import { SetMetadata } from '@nestjs/common';

export const ADMIN_PERMISSIONS = [
  'overview',
  'teachers',
  'students',
  'parents',
  'courses',
  'taxonomy',
  'notifications',
  'audit',
  'settings',
  'roles',
  'users',
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const ADMIN_PERMISSIONS_KEY = 'admin_permissions';
export const RequirePermission = (...permissions: AdminPermission[]) =>
  SetMetadata(ADMIN_PERMISSIONS_KEY, permissions);
