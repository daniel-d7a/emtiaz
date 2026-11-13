import { useEffect, useState } from 'react';
import { Link, useNavigate, createRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Shield, ArrowRight, ArrowLeft } from 'lucide-react';
import { authApi } from '../../lib/api';
import { sessionQuery, useSession } from '../../lib/session';
import { useLang } from '../../lib/i18n';
import { Button, Card, ErrorBox, Input } from '../../components/ui';
import { rootRoute } from '../../routes/__root';

export default function AdminLogin() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: session, isLoading: sessionLoading } = useSession();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!sessionLoading && session?.user?.role === 'ADMIN') {
      void navigate({ to: '/admin/dashboard' });
    }
  }, [session, sessionLoading, navigate]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!identifier.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.login(identifier.trim(), password);
      qc.clear();

      if (res?.user?.role !== 'ADMIN') {
        await authApi.logout().catch(() => {});
        qc.clear();
        setError(new Error(t('notAdminError')));
        return;
      }

      await qc.fetchQuery(sessionQuery).catch(() => {});

      if (res.user.mustChangePassword) {
        void navigate({ to: '/change-password' });
        return;
      }

      void navigate({ to: '/admin/dashboard' });
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error(err?.message || 'Login failed'));
    } finally {
      setBusy(false);
    }
  };

  const BackArrow = lang === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-md flex-col justify-center p-4">
      <Card className="border-line/70 shadow-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
            <Shield size={32} />
          </div>
          <h1 className="text-xl font-bold text-ink">{t('adminLoginTitle')}</h1>
          <p className="mt-1 text-xs text-ink-soft">{t('adminLoginSubtitle')}</p>
        </div>

        {error && (
          <div className="mb-4">
            <ErrorBox error={error} />
          </div>
        )}

        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input
            label={t('phoneOrEmail')}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            autoFocus
            required
            placeholder="admin@emtiaz.om"
            dir="ltr"
          />

          <Input
            label={t('password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <Button
            type="submit"
            disabled={busy || !identifier.trim() || !password}
            className="mt-2 min-h-11 w-full text-base font-bold"
          >
            {busy ? t('loading') : t('loginAsAdmin')}
          </Button>
        </form>

        <div className="mt-6 border-t border-line/60 pt-4 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft transition hover:text-primary"
          >
            <span>{t('backToStandardLogin')}</span>
            <BackArrow size={14} />
          </Link>
        </div>
      </Card>
    </div>
  );
}

export const adminLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/login',
  component: AdminLogin,
});
