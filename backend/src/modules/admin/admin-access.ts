import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { adminRoles, users } from '../../db/schema';
import { ADMIN_PERMISSIONS, type AdminPermission } from '../../lib/admin-permissions';

export async function effectiveAdminPermissions(userId: string): Promise<AdminPermission[]> {
  const [user] = await db
    .select({ adminRoleId: users.adminRoleId })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) return [];
  if (!user.adminRoleId) return [...ADMIN_PERMISSIONS];
  const [role] = await db
    .select({ permissions: adminRoles.permissions })
    .from(adminRoles)
    .where(eq(adminRoles.id, user.adminRoleId));
  return (role?.permissions ?? []).filter((permission): permission is AdminPermission =>
    (ADMIN_PERMISSIONS as readonly string[]).includes(permission),
  );
}
