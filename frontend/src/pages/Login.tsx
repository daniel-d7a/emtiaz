import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearch, createRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, HeartHandshake, MessageCircle, Users } from 'lucide-react';
import { authApi, publicApi } from '../lib/api';
import { sessionQuery } from '../lib/session';
import { useLang } from '../lib/i18n';
import { Button, Card, Dialog, ErrorBox, Input } from '../components/ui';
import { ReportProblemButton } from '../components/ReportProblemButton';
import { rootRoute } from '../routes/__root';

export type AuthRoleSlug = 'teacher' | 'student' | 'parent';

function normalizeRoleSlug(raw?: string, hasJoin?: boolean): AuthRoleSlug {
  if (raw === 'teacher' || raw === 'student' || raw === 'parent') return raw;
  return hasJoin ? 'student' : 'teacher';
}

export default function Login() {
  const { t, lang } = useLang();
  const params = useParams({ strict: false }) as { role?: string };
  const search = useSearch({ strict: false }) as { join?: string; entry?: string };
  const join = typeof search?.join === 'string' ? search.join : undefined;
  const entry = typeof search?.entry === 'string' ? search.entry : undefined;

  const [activeRole, setActiveRole] = useState<AuthRoleSlug>(() =>
    normalizeRoleSlug(params?.role, Boolean(join)),
  );

  useEffect(() => {
    if (params?.role === 'teacher' || params?.role === 'student' || params?.role === 'parent') {
      setActiveRole(params.role);
    }
  }, [params?.role]);

  const navigate = useNavigate();
  const qc = useQueryClient();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const { data: support } = useQuery({
    queryKey: ['public-support'],
    queryFn: () => publicApi.support(),
    staleTime: 60_000,
  });
  const rawSupportPhone = support?.supportWhatsapp || support?.whatsapp || '+96890000000';
  const cleanSupportPhone = rawSupportPhone.replace(/\D/g, '');
  const forgotMessage = 'مرحباً، أود إعادة تعيين كلمة المرور لحسابي في منصة امتياز';
  const whatsappUrl = `https://wa.me/${cleanSupportPhone}?text=${encodeURIComponent(forgotMessage)}`;

  const selectRole = (role: AuthRoleSlug) => {
    setActiveRole(role);
    void navigate({ to: '/login/$role', params: { role }, search: { join, entry } });
  };

  const go = (role: string) => {
    if (join) return navigate({ to: '/join/$joinCode', params: { joinCode: join }, search: { entry } });
    const home = {
      TEACHER: '/teacher/dashboard',
      ADMIN: '/admin/dashboard',
      PARENT: '/parent/children',
    } as const;
    void navigate({ to: home[role as keyof typeof home] ?? '/student/dashboard' });
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.login(identifier, password);
      qc.clear();
      await qc.fetchQuery(sessionQuery);
      if (res.user.mustChangePassword) return navigate({ to: '/change-password' });
      go(res.user.role);
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  };

  const roleTabs: Array<{
    slug: AuthRoleSlug;
    label: string;
    subtitle: string;
    icon: typeof GraduationCap;
  }> = [
    {
      slug: 'teacher',
      label: t('teacherRoleTab'),
      subtitle: t('teacherLoginSubtitle'),
      icon: GraduationCap,
    },
    {
      slug: 'student',
      label: t('studentRoleTab'),
      subtitle: t('studentLoginSubtitle'),
      icon: Users,
    },
    {
      slug: 'parent',
      label: t('parentRoleTab'),
      subtitle: t('parentLoginSubtitle'),
      icon: HeartHandshake,
    },
  ];

  const currentTab = roleTabs.find((tab) => tab.slug === activeRole) ?? roleTabs[0];

  return (
    <div className="mx-auto max-w-md p-4">
      <Card className="mt-8">
        <div
          role="tablist"
          aria-label={t('login')}
          className="mb-5 grid grid-cols-3 gap-1.5 rounded-xl bg-background p-1.5"
        >
          {roleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeRole === tab.slug;
            return (
              <button
                key={tab.slug}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectRole(tab.slug)}
                className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition-colors sm:text-sm ${
                  active
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-ink-soft hover:bg-surface hover:text-ink'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <h1 className="mb-1 text-xl font-bold">
          {t('login')} — {currentTab.label}
        </h1>
        <p className="mb-4 text-sm text-ink-soft">{currentTab.subtitle}</p>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Input
            label={t('phoneOrEmail')}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            dir="ltr"
          />
          <Input
            label={t('password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
          <div className="flex justify-end -mt-2">
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t('forgotPassword')}
            </button>
          </div>
          {error && <ErrorBox error={error} />}
          <Button type="submit" disabled={busy}>
            {t('login')}
          </Button>
        </form>

        <div className="mt-5 border-t border-line pt-4 text-center text-sm">
          <p className="mb-2 text-ink-soft">{t('noAccountYet')}</p>
          <Link
            to="/register/$role"
            params={{ role: activeRole }}
            search={{ join, entry }}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary-light px-4 py-2 font-bold text-primary-dark hover:brightness-95"
          >
            {currentTab.label} — {t('register')}
          </Link>
        </div>

        <div className="mt-4 flex justify-center">
          <ReportProblemButton context={`login-${activeRole}`} />
        </div>
      </Card>

      <Dialog
        open={forgotOpen}
        onOpenChange={setForgotOpen}
        title={t('forgotPasswordTitle')}
        description={t('forgotPasswordDesc')}
        className="max-w-md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setForgotOpen(false)}>
              {t('close')}
            </Button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition"
            >
              <MessageCircle size={16} className="me-1.5" />
              <span>{t('contactSupportViaWhatsapp')}</span>
            </a>
          </>
        }
      >
        <p className="text-sm text-ink-soft leading-relaxed">
          {lang === 'ar'
            ? 'للحفاظ على أمان حسابك، يتم التحقق من الهوية وإعادة تعيين كلمة المرور بالتواصل المباشر مع الدعم الفني للإدارة.'
            : 'For account security, password resets are verified and processed directly through platform administrative support.'}
        </p>
      </Dialog>
    </div>
  );
}

const validateLoginSearch = (s: Record<string, unknown>): { join?: string; entry?: string } => ({
  join: typeof s.join === 'string' ? s.join : undefined,
  entry: typeof s.entry === 'string' ? s.entry : undefined,
});

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: validateLoginSearch,
  component: Login,
});

export const loginRoleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login/$role',
  validateSearch: validateLoginSearch,
  component: Login,
});
