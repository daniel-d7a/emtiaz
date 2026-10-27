import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, GraduationCap, Home, LayoutDashboard, LogOut, UserRound, Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { authApi } from '../lib/api';
import { useLang, type Key } from '../lib/i18n';
import { sessionQuery } from '../lib/session';
import type { SessionUser } from '../../../shared/api';
import { NotificationBell } from './NotificationBell';

type NavTarget =
  | '/student/dashboard'
  | '/student/courses'
  | '/teacher/dashboard'
  | '/parent/children'
  | '/admin/dashboard'
  | '/profile';

type NavItem = { to: NavTarget; label: Key; icon: LucideIcon };

const ROLE_HOME: Record<SessionUser['role'], NavTarget> = {
  STUDENT: '/student/dashboard',
  TEACHER: '/teacher/dashboard',
  PARENT: '/parent/children',
  ADMIN: '/admin/dashboard',
};

const ROLE_LABEL: Record<SessionUser['role'], Key> = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  PARENT: 'parent',
  ADMIN: 'admin',
};

const ROLE_NAV: Record<SessionUser['role'], NavItem[]> = {
  STUDENT: [
    { to: '/student/dashboard', label: 'home', icon: Home },
    { to: '/student/courses', label: 'browseCourses', icon: BookOpen },
  ],
  TEACHER: [{ to: '/teacher/dashboard', label: 'myWorkspace', icon: LayoutDashboard }],
  PARENT: [{ to: '/parent/children', label: 'myChildren', icon: Users }],
  ADMIN: [{ to: '/admin/dashboard', label: 'overview', icon: LayoutDashboard }],
};

function navFor(role: SessionUser['role']) {
  return role === 'ADMIN'
    ? ROLE_NAV[role]
    : [...ROLE_NAV[role], { to: '/profile', label: 'profile', icon: UserRound } as NavItem];
}

function Avatar({ user, size = 32 }: { user: SessionUser; size?: number }) {
  if (user.image) {
    return (
      <img
        src={`/api/me/avatar?v=${encodeURIComponent(user.image)}`}
        alt=""
        className="rounded-full border border-line object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex items-center justify-center rounded-full bg-primary-light font-bold text-primary-dark"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {user.name.slice(0, 1)}
    </span>
  );
}

export function PublicTopBar() {
  const { t, lang, setLang } = useLang();
  return (
    <header className="flex min-h-16 items-center justify-between gap-3 border-b border-line bg-background px-4">
      <Link to="/" className="flex items-center gap-2 font-bold text-primary">
        <GraduationCap size={22} /> {t('appName')}
      </Link>
      <button
        type="button"
        aria-label={lang === 'ar' ? t('switchToEnglish') : t('switchToArabic')}
        onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line px-3 font-semibold"
      >
        {lang === 'ar' ? 'EN' : 'ع'}
      </button>
    </header>
  );
}

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const items = navFor(user.role);
  const home = ROLE_HOME[user.role];

  useEffect(() => setMenuOpen(false), [pathname]);

  const logout = async () => {
    await authApi.logout();
    qc.clear();
    qc.setQueryData(sessionQuery.queryKey, null);
    navigate({ to: '/login' });
  };

  return (
    <div className="flex min-h-screen min-w-0">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-line bg-surface lg:flex">
        <Link to={home} className="flex min-h-16 items-center gap-2 border-b border-line px-5 font-bold text-primary">
          <GraduationCap size={22} /> {t('appName')}
        </Link>
        <nav aria-label={t('appName')} className="flex flex-1 flex-col gap-1 p-3">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-line/50 data-[status=active]:bg-primary-light data-[status=active]:text-primary-dark"
            >
              <item.icon size={20} />
              {t(item.label)}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-2 border-b border-line bg-background/95 px-4 backdrop-blur">
          <Link to={home} className="flex min-w-0 items-center gap-2 font-bold text-primary lg:hidden">
            <GraduationCap size={22} />
            <span className="truncate">{t('appName')}</span>
          </Link>
          <div className="ms-auto flex items-center gap-1">
            <NotificationBell />
            <button
              type="button"
              aria-label={lang === 'ar' ? t('switchToEnglish') : t('switchToArabic')}
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line px-3 text-sm font-semibold"
            >
              {lang === 'ar' ? 'EN' : 'ع'}
            </button>
            <div className="relative">
              <button
                type="button"
                aria-label={user.name}
                title={user.name}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl p-1 hover:bg-line/50"
              >
                <Avatar user={user} />
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={t('cancel')}
                    onClick={() => setMenuOpen(false)}
                    className="fixed inset-0 z-40 cursor-default"
                  />
                  <div className="absolute end-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface">
                    <div className="border-b border-line px-4 py-3">
                      <p className="truncate font-semibold">{user.name}</p>
                      <p className="text-xs text-ink-soft">{t(ROLE_LABEL[user.role])}</p>
                    </div>
                    {user.role !== 'ADMIN' && (
                      <Link to="/profile" className="flex min-h-12 items-center gap-2 px-4 text-sm font-semibold hover:bg-line/40">
                        <UserRound size={16} /> {t('profile')}
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="flex min-h-12 w-full items-center gap-2 px-4 text-start text-sm font-semibold hover:bg-line/40"
                    >
                      <LogOut size={16} /> {t('logout')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main id="main" className="min-w-0 flex-1 overflow-x-clip pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </main>
      </div>

      <nav
        aria-label={t('appName')}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex max-w-lg items-stretch">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold text-ink-soft data-[status=active]:text-primary"
            >
              <item.icon size={20} />
              <span className="max-w-full truncate">{t(item.label)}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
