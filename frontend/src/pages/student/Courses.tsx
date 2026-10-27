import { createRoute } from '@tanstack/react-router';
import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';
import { CourseBrowser } from '../../components/CourseBrowser';
import { Page } from '../../components/ui';
import { useLang } from '../../lib/i18n';

export default function StudentCourses() {
  const { t } = useLang();
  return (
    <Page title={t('browseCourses')}>
      <CourseBrowser />
    </Page>
  );
}

export const studentCoursesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/student/courses',
  beforeLoad: () => requireRole('STUDENT'),
  component: StudentCourses,
});
