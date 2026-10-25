import { Link, createRoute } from '@tanstack/react-router';
import { BookOpen } from 'lucide-react';
import { useLang } from '../lib/i18n';

export default function Home() {
  const { t } = useLang();
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-24 text-center">
      <BookOpen className="text-primary" size={48} />
      <h1 className="text-4xl font-bold">{t('appName')}</h1>
      <p className="text-ink-soft">{t('tagline')}</p>
      <div className="flex flex-wrap justify-center gap-3 pt-4">
        <Link
          to="/register/$role"
          params={{ role: 'teacher' }}
          className="rounded-xl bg-primary px-6 py-3 font-semibold text-white shadow-sm hover:bg-primary-dark"
        >
          {t('teacher')} — {t('register')}
        </Link>
        <Link
          to="/register/$role"
          params={{ role: 'student' }}
          className="rounded-xl bg-secondary px-6 py-3 font-semibold text-white shadow-sm hover:brightness-110"
        >
          {t('student')} — {t('register')}
        </Link>
      </div>
      <Link to="/login" className="pt-2 text-primary underline">{t('login')}</Link>
    </div>
  );
}

import { rootRoute } from '../routes/__root';

export const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
});
