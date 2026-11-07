import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router';
import { AppShell, PublicTopBar } from '../components/AppShell';
import { SiteBranding } from '../components/SiteBranding';
import { useLang } from '../lib/i18n';
import { useSession } from '../lib/session';

const PUBLIC_ROUTE = /^\/($|login|register|join|t|privacy|terms)(\/|$)/;

function RootLayout() {
  const { lang } = useLang();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data } = useSession();
  const user = data?.user ?? null;
  const isPublic = PUBLIC_ROUTE.test(pathname);

  return (
    <div className="min-h-screen min-w-0 bg-background">
      <SiteBranding />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        {lang === 'ar' ? 'تجاوز إلى المحتوى' : 'Skip to content'}
      </a>
      {user && !isPublic ? (
        <AppShell user={user}>
          <div key={pathname} className="page-fade">
            <Outlet />
          </div>
        </AppShell>
      ) : (
        <>
          <PublicTopBar />
          <main id="main" className="min-w-0">
            <div key={pathname} className="page-fade">
              <Outlet />
            </div>
          </main>
        </>
      )}
    </div>
  );
}

export const rootRoute = createRootRoute({ component: RootLayout });
