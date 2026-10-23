import { Navigate, Route, Routes, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, LogOut, BookOpen } from 'lucide-react';
import { authApi, type SessionUser } from './lib/api';
import { useLang } from './lib/i18n';
import Login from './pages/Login';
import Register from './pages/Register';
import JoinPage from './pages/Join';
import StudentDashboard from './pages/student/Dashboard';
import StudentGroup from './pages/student/Group';
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherCurriculum from './pages/teacher/Curriculum';
import TeacherGroup from './pages/teacher/Group';
import AdminDashboard from './pages/admin/Dashboard';
import Profile from './pages/Profile';
import { Loading } from './components/ui';

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: authApi.session as unknown as () => Promise<{ user: SessionUser } | null>,
  });
}

function RequireRole({ role, children }: { role: string; children: React.ReactNode }) {
  const { data, isLoading } = useSession();
  if (isLoading) return <Loading />;
  if (!data?.user) return <Navigate to="/login" replace />;
  if (data.user.role !== role) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

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
          <Link to="/student" className="rounded-lg px-3 py-2 hover:bg-line/60">{t('myCourses')}</Link>
        )}
        {data?.user?.role === 'TEACHER' && (
          <Link to="/teacher" className="rounded-lg px-3 py-2 hover:bg-line/60">{t('myWorkspace')}</Link>
        )}
        {data?.user?.role === 'ADMIN' && (
          <Link to="/admin" className="rounded-lg px-3 py-2 hover:bg-line/60">{t('admin')}</Link>
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
              navigate('/login');
            }}
            className="flex items-center gap-1 rounded-lg px-3 py-2 hover:bg-line/60"
          >
            <LogOut size={16} /> {t('logout')}
          </button>
        )}
        {data?.user && data.user.role !== 'ADMIN' && (
          <Link to="/profile" className="rounded-lg px-2 py-2 font-semibold hover:bg-line/60" title={t('name')}>
            {data.user.name.split(' ')[0]}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen">
      <TopBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register/:role" element={<Register />} />
        <Route path="/join/:joinCode" element={<JoinPage />} />
        <Route
          path="/student/dashboard"
          element={<RequireRole role="STUDENT"><StudentDashboard /></RequireRole>}
        />
        <Route
          path="/student/groups/:groupId"
          element={<RequireRole role="STUDENT"><StudentGroup /></RequireRole>}
        />
        <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
        <Route
          path="/teacher/dashboard"
          element={<RequireRole role="TEACHER"><TeacherDashboard /></RequireRole>}
        />
        <Route
          path="/teacher/courses/:courseId/curriculum"
          element={<RequireRole role="TEACHER"><TeacherCurriculum /></RequireRole>}
        />
        <Route
          path="/teacher/groups/:groupId"
          element={<RequireRole role="TEACHER"><TeacherGroup /></RequireRole>}
        />
        <Route path="/teacher" element={<Navigate to="/teacher/dashboard" replace />} />
        <Route path="/admin/*" element={<RequireRole role="ADMIN"><AdminDashboard /></RequireRole>} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function Home() {
  const { t } = useLang();
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-24 text-center">
      <BookOpen className="text-primary" size={48} />
      <h1 className="text-4xl font-bold">{t('appName')}</h1>
      <p className="text-ink-soft">{t('tagline')}</p>
      <div className="flex flex-wrap justify-center gap-3 pt-4">
        <Link
          to="/register/teacher"
          className="rounded-xl bg-primary px-6 py-3 font-semibold text-white shadow-sm hover:bg-primary-dark"
        >
          {t('teacher')} — {t('register')}
        </Link>
        <Link
          to="/register/student"
          className="rounded-xl bg-secondary px-6 py-3 font-semibold text-white shadow-sm hover:brightness-110"
        >
          {t('student')} — {t('register')}
        </Link>
      </div>
      <Link to="/login" className="pt-2 text-primary underline">{t('login')}</Link>
    </div>
  );
}
