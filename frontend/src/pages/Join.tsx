import { useEffect, useState } from 'react';
import { createRoute, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { sessionQuery, useSession } from '../lib/session';
import { api, authApi, onboardingApi } from '../lib/api';
import { useLang } from '../lib/i18n';
import { Button, Card, ErrorBox, Input, Loading } from '../components/ui';

/** WhatsApp magic join landing: enrolled instantly when logged in,
 *  otherwise a 1-step quick register card. */
export default function JoinPage() {
  const { joinCode } = useParams({ from: '/join/$joinCode' });
  const { entry } = useSearch({ from: '/join/$joinCode' });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useSession();
  const { t } = useLang();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);

  const joinAndGo = async () => {
    try {
      await api(`/api/onboarding/join/${joinCode}`, {
        method: 'POST',
        body: entry ? { entryCode: entry } : {},
      });
      setJoined(true);
      qc.clear();
      setTimeout(() => navigate({ to: '/student/dashboard' }), 800);
    } catch (e) {
      setError(e as Error);
    }
  };

  useEffect(() => {
    if (isLoading || joined || error) return;
    if (data?.user?.role === 'STUDENT') void joinAndGo();
  }, [data, isLoading, joined, error, joinCode, entry]);

  const quickRegister = async () => {
    setBusy(true);
    setError(null);
    try {
      await onboardingApi.registerStudent({ name, password, phoneNumber: phone });
      await authApi.login(phone.replace(/[^\d]/g, '') + '@phone.emtiaz.om', password);
      qc.clear();
      await qc.fetchQuery(sessionQuery);
      await joinAndGo();
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <div className="mx-auto max-w-md p-4"><Loading /></div>;

  if (data?.user?.role === 'STUDENT') {
    return (
      <div className="mx-auto max-w-md p-4">
        <Card className="mt-10 text-center">
          {error ? <ErrorBox error={error} /> : <p className="py-6 text-primary">✓ {t('joinedOk')}</p>}
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-4">
      <Card className="mt-10">
        <h1 className="mb-2 text-xl font-bold">{t('joinClass')} {joinCode}</h1>
        <p className="mb-4 text-sm text-ink-soft">{t('oneStepJoin')}</p>
        <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void quickRegister(); }}>
          <Input label={t('name')} value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label={t('phoneWithPrefix')} value={phone} onChange={(e) => setPhone(e.target.value)} required dir="ltr" />
          <Input label={t('password')} value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} />
          {error && <ErrorBox error={error} />}
          <Button type="submit" variant="secondary" disabled={busy}>{t('joinNow')}</Button>
        </form>
      </Card>
    </div>
  );
}

import { rootRoute } from '../routes/__root';

export const joinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/join/$joinCode',
  validateSearch: (s: Record<string, unknown>): { entry?: string } => ({
    entry: typeof s.entry === 'string' ? s.entry : undefined,
  }),
  component: JoinPage,
});
