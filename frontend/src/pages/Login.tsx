import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../lib/api';
import { useLang } from '../lib/i18n';
import { Button, Card, ErrorBox, Input } from '../components/ui';

export default function Login() {
  const { t } = useLang();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);

  const go = (role: string) =>
    navigate(params.get('join') ? `/join/${params.get('join')}` : role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard');

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.login(email, password);
      qc.clear();
      go(res.user.role);
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-4">
      <Card className="mt-10">
        <h1 className="mb-4 text-xl font-bold">{t('login')}</h1>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Input label={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          <Input label={t('password')} value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          {error && <ErrorBox error={error} />}
          <Button type="submit" disabled={busy}>{t('login')}</Button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <Link to={`/register/student${params.get('join') ? `?join=${params.get('join')}` : ''}`} className="text-primary underline">
            {t('student')} — {t('register')}
          </Link>
          <Link to={`/register/teacher${params.get('join') ? `?join=${params.get('join')}` : ''}`} className="text-primary underline">
            {t('teacher')} — {t('register')}
          </Link>
        </div>
      </Card>
    </div>
  );
}
