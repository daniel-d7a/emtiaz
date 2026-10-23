import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi, onboardingApi } from '../lib/api';
import { useLang } from '../lib/i18n';
import { Button, Card, ErrorBox, Input } from '../components/ui';

export default function Register() {
  const { role = 'student' } = useParams();
  const isTeacher = role === 'teacher';
  const { t } = useLang();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);
  const [params] = useSearchParams();
  const joinCode = params.get('join');

  useEffect(() => {
    document.title = isTeacher ? 'Emtiaz — Teacher sign up' : 'Emtiaz — Student sign up';
  }, [isTeacher]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (isTeacher) {
        await onboardingApi.registerTeacher({ name, email, password, phoneNumber: phone, specialization });
      } else {
        await onboardingApi.registerStudent({ name, password, phoneNumber: phone, email: email || undefined });
      }
      await authApi.login(isTeacher ? email : email || phone.replace(/[^\d]/g, '') + '@phone.emtiaz.om', password);
      qc.clear();
      if (joinCode) return navigate(`/join/${joinCode}`);
      navigate(isTeacher ? '/teacher/dashboard' : '/student/dashboard');
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
          {isTeacher ? t('teacher') : t('student')} — {t('register')}
        </h1>
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <Input label={t('name')} value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label={`${t('phone')} (+968…)`} value={phone} onChange={(e) => setPhone(e.target.value)} required dir="ltr" />
          {!isTeacher && (
            <Input label={`${t('email')} (optional)`} value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          )}
          {isTeacher && (
            <Input label={t('specialization')} value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
          )}
          <Input label={t('password')} value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} />
          {error && <ErrorBox error={error} />}
          <Button type="submit" disabled={busy}>{t('register')}</Button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link to={`/login${joinCode ? `?join=${joinCode}` : ''}`} className="text-primary underline">
            {t('login')}
          </Link>
        </p>
      </Card>
    </div>
  );
}
