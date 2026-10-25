import { createRoute, createRouter, redirect } from '@tanstack/react-router';
import { rootRoute } from './routes/__root';
import { homeRoute } from './pages/Home';
import { loginRoute } from './pages/Login';
import { registerRoute } from './pages/Register';
import { joinRoute } from './pages/Join';
import { profileRoute } from './pages/Profile';
import { studentDashboardRoute } from './pages/student/Dashboard';
import { studentGroupRoute } from './pages/student/Group';
import { teacherDashboardRoute } from './pages/teacher/Dashboard';
import { teacherCurriculumRoute } from './pages/teacher/Curriculum';
import { teacherGroupRoute } from './pages/teacher/Group';
import { adminDashboardRoute } from './pages/admin/Dashboard';
import { parentDashboardRoute } from './pages/parent/Dashboard';

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
  teacherDashboardRoute,
  teacherCurriculumRoute,
  teacherGroupRoute,
  adminDashboardRoute,
  parentDashboardRoute,
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
