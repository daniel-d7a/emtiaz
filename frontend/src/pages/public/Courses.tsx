import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../../routes/__root';
import { PublicTopBar } from '../../components/AppShell';
import { CourseBrowser } from '../../components/CourseBrowser';
import { useLang } from '../../lib/i18n';

export default function PublicCourses() {
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-background">
      <PublicTopBar />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 p-4">
        <h1 className="text-2xl font-extrabold">{t('browseCourses')}</h1>
        <CourseBrowser />
      </main>
    </div>
  );
}

export const publicCoursesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/courses',
  component: PublicCourses,
});
