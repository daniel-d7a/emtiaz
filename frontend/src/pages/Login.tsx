import { useState } from 'react';
import { Link, useNavigate, useSearch, createRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../lib/api';
import { sessionQuery } from '../lib/session';
import { useLang } from '../lib/i18n';
import { Button, Card, ErrorBox, Input } from '../components/ui';

export default function Login() {
  const { t } = useLang();
  const { join } = useSearch({ from: '/login' });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);

  const go = (role: string) => {
    if (join) return navigate({ to: '/join/$joinCode', params: { joinCode: join } });
    const home = {
      TEACHER: '/teacher/dashboard',
      ADMIN: '/admin/dashboard',
      PARENT: '/parent/dashboard',
    } as const;
    navigate({ to: home[role as keyof typeof home] ?? '/student/dashboard' });
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.login(email, password);
      qc.clear();
      qc.setQueryData(sessionQuery.queryKey, { user: res.user });
      go(res.user.role);
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-4">
      <Card className="mt-10">
        <h1 className="mb-4 text-xl font-bold">{t('login')}</h1>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Input label={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          <Input label={t('password')} value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          {error && <ErrorBox error={error} />}
          <Button type="submit" disabled={busy}>{t('login')}</Button>
        </form>
        <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">
          <Link to="/register/$role" params={{ role: 'student' }} search={{ join }} className="text-primary underline">
            {t('student')} — {t('register')}
          </Link>
          <Link to="/register/$role" params={{ role: 'teacher' }} search={{ join }} className="text-primary underline">
            {t('teacher')} — {t('register')}
          </Link>
          <Link to="/register/$role" params={{ role: 'parent' }} search={{ join }} className="text-primary underline">
            {t('parent')} — {t('register')}
          </Link>
        </div>
      </Card>
    </div>
  );
}

import { rootRoute } from '../routes/__root';
import { requireRole } from '../lib/session';

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (s: Record<string, unknown>): { join?: string } => ({ join: typeof s.join === 'string' ? s.join : undefined }),
  component: Login,
});
