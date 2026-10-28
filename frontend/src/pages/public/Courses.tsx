import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../../routes/__root';
import { CourseBrowser } from '../../components/CourseBrowser';
import { useLang } from '../../lib/i18n';

export default function PublicCourses() {
  const { t } = useLang();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4">
      <h1 className="text-2xl font-bold">{t('browseCourses')}</h1>
      <CourseBrowser />
    </div>
  );
}

export const publicCoursesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/courses',
  component: PublicCourses,
});
