import { createRootRoute, Link, Outlet, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { GraduationCap, LogOut } from 'lucide-react';
import { authApi } from '../lib/api';
import { useLang } from '../lib/i18n';
import { useSession } from '../lib/session';

function TopBar() {
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data } = useSession();
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-background/95 px-4 py-3 backdrop-blur">
      <Link to="/" className="flex items-center gap-2 font-bold text-primary">
        <GraduationCap /> {t('appName')}
      </Link>
      <div className="flex items-center gap-2 text-sm">
        {data?.user?.role === 'STUDENT' && (
          <Link to="/student/dashboard" className="rounded-lg px-3 py-2 hover:bg-line/60">{t('myCourses')}</Link>
        )}
        {data?.user?.role === 'TEACHER' && (
          <Link to="/teacher/dashboard" className="rounded-lg px-3 py-2 hover:bg-line/60">{t('myWorkspace')}</Link>
        )}
        {data?.user?.role === 'ADMIN' && (
          <Link to="/admin/dashboard" className="rounded-lg px-3 py-2 hover:bg-line/60">{t('admin')}</Link>
        )}
        <button
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="rounded-lg border border-line px-3 py-2 font-semibold"
        >
          {lang === 'ar' ? 'EN' : 'ع'}
        </button>
        {data?.user && (
          <button
            onClick={async () => {
              await authApi.logout();
              qc.clear();
              navigate({ to: '/login' });
            }}
            className="flex items-center gap-1 rounded-lg px-3 py-2 hover:bg-line/60"
          >
            <LogOut size={16} /> {t('logout')}
          </button>
        )}
        {data?.user && data.user.role !== 'ADMIN' && (
          <Link to="/profile" className="flex items-center gap-2 rounded-lg px-2 py-2 font-semibold hover:bg-line/60" title={t('name')}>
            {data.user.image ? (
              <img src="/api/me/avatar" alt="" className="h-7 w-7 rounded-full border border-line object-cover" />
            ) : null}
            {data.user.name.split(' ')[0]}
          </Link>
        )}
      </div>
    </div>
  );
}

export const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen">
      <TopBar />
      <Outlet />
    </div>
  ),
});
