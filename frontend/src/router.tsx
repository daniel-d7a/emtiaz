import { createRoute, createRouter, redirect } from '@tanstack/react-router';
import { rootRoute } from './routes/__root';
import { homeRoute } from './pages/Home';
import { loginRoute } from './pages/Login';
import { registerRoute } from './pages/Register';
import { joinRoute } from './pages/Join';
import { profileRoute } from './pages/Profile';
import { studentDashboardRoute } from './pages/student/Dashboard';
import { studentGroupRoute } from './pages/student/Group';
import { studentCoursesRoute } from './pages/student/Courses';
import { studentLessonRoute } from './pages/student/Lesson';
import { studentQuizRoute } from './pages/student/Quiz';
import { teacherDashboardRoute } from './pages/teacher/Dashboard';
import { teacherNewCourseRoute } from './pages/teacher/NewCourse';
import { teacherCourseGroupsRoute } from './pages/teacher/CourseGroups';
import { teacherCurriculumRoute } from './pages/teacher/Curriculum';
import { teacherGroupRoute } from './pages/teacher/Group';
import { adminDashboardRoute } from './pages/admin/Dashboard';
import { adminTeachersRoute } from './pages/admin/Teachers';
import { adminStudentsRoute } from './pages/admin/Students';
import { adminParentsRoute } from './pages/admin/Parents';
import { adminCoursesRoute } from './pages/admin/Courses';
import { adminSettingsRoute } from './pages/admin/Settings';
import { adminAuditRoute } from './pages/admin/Audit';
import { parentChildrenRoute } from './pages/parent/Children';
import { teacherLandingRoute } from './pages/public/Teacher';
import { publicCourseRoute } from './pages/public/Course';
import { publicCoursesRoute } from './pages/public/Courses';

const fallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$',
  beforeLoad: () => {
    throw redirect({ to: '/' });
  },
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  loginRoute,
  registerRoute,
  joinRoute,
  profileRoute,
  studentDashboardRoute,
  studentGroupRoute,
  studentCoursesRoute,
  studentLessonRoute,
  studentQuizRoute,
  teacherDashboardRoute,
  teacherNewCourseRoute,
  teacherCourseGroupsRoute,
  teacherCurriculumRoute,
  teacherGroupRoute,
  adminDashboardRoute,
  adminTeachersRoute,
  adminStudentsRoute,
  adminParentsRoute,
  adminCoursesRoute,
  adminSettingsRoute,
  adminAuditRoute,
  parentChildrenRoute,
  teacherLandingRoute,
  publicCourseRoute,
  publicCoursesRoute,
  fallbackRoute,
]);

export const router = createRouter({
  routeTree,
  scrollRestoration: true,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
