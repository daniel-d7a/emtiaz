import { useState } from 'react';
import { createRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authApi } from '../lib/api';
import { useLang } from '../lib/i18n';
import { requireAuth, sessionQuery, useSession } from '../lib/session';
import { Button, Card, ErrorBox, Input } from '../components/ui';
import { rootRoute } from '../routes/__root';

const HOME = {
  TEACHER: '/teacher/dashboard',
  ADMIN: '/admin/dashboard',
  PARENT: '/parent/children',
  STUDENT: '/student/dashboard',
} as const;

export default function ChangePassword() {
  const { t } = useLang();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<Error | null>(null);

  const save = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: async () => {
      toast.success(t('saved'));
      await qc.invalidateQueries({ queryKey: sessionQuery.queryKey });
      const role = data?.user.role ?? 'STUDENT';
      navigate({ to: HOME[role] });
    },
    onError: (e) => setError(e as Error),
  });

  const submit = () => {
    setError(null);
    if (newPassword !== confirmPassword) {
      setError(new Error(t('passwordMismatch')));
      return;
    }
    save.mutate();
  };

  return (
    <div className="mx-auto max-w-md p-4">
      <Card className="mt-10">
        <h1 className="mb-2 text-xl font-bold">{t('changePassword')}</h1>
        {data?.user.mustChangePassword && (
          <p className="mb-4 text-sm text-ink-soft">{t('mustChangePassword')}</p>
        )}
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Input
            label={t('currentPassword')}
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
          <Input
            label={t('newPassword')}
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            minLength={8}
          />
          <Input
            label={t('confirmPassword')}
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
          />
          {error && <ErrorBox error={error} />}
          <Button type="submit" disabled={save.isPending}>{t('save')}</Button>
        </form>
      </Card>
    </div>
  );
}

export const changePasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/change-password',
  beforeLoad: () => requireAuth(),
  component: ChangePassword,
});
