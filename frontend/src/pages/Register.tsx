import { useState } from 'react';
import { Link, useNavigate, useParams, useSearch, createRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, onboardingApi } from '../lib/api';
import { useLang } from '../lib/i18n';
import { Button, Card, ErrorBox, Input } from '../components/ui';

export default function Register() {
  const { role } = useParams({ from: '/register/$role' });
  const isTeacher = role === 'teacher';
  const isParent = role === 'parent';
  const { t } = useLang();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const { data: subjects = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['categories'],
    queryFn: () => onboardingApi.listCategories().then((d) => (d as Array<{ id: string; name: string }>)),
    enabled: isTeacher,
  });
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);
  const { join: joinCode } = useSearch({ from: '/register/$role' });

  useEffect(() => {
    document.title = isTeacher ? 'Emtiaz — Teacher sign up' : isParent ? 'Emtiaz — Parent sign up' : 'Emtiaz — Student sign up';
  }, [isTeacher, isParent]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (isTeacher) {
        await onboardingApi.registerTeacher({ name, email, password, phoneNumber: phone, subject });
      } else if (isParent) {
        await onboardingApi.registerParent({ name, email, password, phoneNumber: phone, studentCode: studentCode.trim() || undefined });
      } else {
        await onboardingApi.registerStudent({ name, password, phoneNumber: phone, email: email || undefined });
      }
      await authApi.login(isTeacher || isParent ? email : email || phone.replace(/[^\d]/g, '') + '@phone.emtiaz.om', password);
      qc.clear();
      if (joinCode && !isParent) return navigate({ to: '/join/$joinCode', params: { joinCode } });
      navigate({ to: isTeacher ? '/teacher/dashboard' : isParent ? '/parent/dashboard' : '/student/dashboard' });
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-4">
      <Card className="mt-10">
        <h1 className="mb-4 text-xl font-bold">
          {isTeacher ? t('teacher') : isParent ? t('parent') : t('student')} — {t('register')}
        </h1>
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <Input label={t('name')} value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label={`${t('phone')} (+968…)`} value={phone} onChange={(e) => setPhone(e.target.value)} required dir="ltr" />
          {(!isTeacher && !isParent) && (
            <Input label={`${t('email')} (optional)`} value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          )}
          {isParent && (
            <Input label={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          )}
          {isTeacher && (
            <label className="block">
              <span className="mb-1 block text-sm text-ink">{t('specialization')}</span>
              <input
                className="w-full rounded-lg border border-border bg-white px-3 py-2"
                list="subject-suggestions"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
              <datalist id="subject-suggestions">
                {subjects.map((c) => <option key={c.id} value={c.name} />)}
              </datalist>
            </label>
          )}
          {isParent && (
            <Input label={`${t('childCode')} (optional)`} value={studentCode} onChange={(e) => setStudentCode(e.target.value)} dir="ltr" />
          )}
          <Input label={t('password')} value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} />
          {error && <ErrorBox error={error} />}
          <Button type="submit" disabled={busy}>{t('register')}</Button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link to="/login" search={{ join: joinCode }} className="text-primary underline">
            {t('login')}
          </Link>
        </p>
      </Card>
    </div>
  );
}

import { rootRoute } from '../routes/__root';

export const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register/$role',
  validateSearch: (s: Record<string, unknown>): { join?: string } => ({ join: typeof s.join === 'string' ? s.join : undefined }),
  component: Register,
});
