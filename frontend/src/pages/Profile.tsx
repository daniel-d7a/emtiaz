import { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type SessionUser } from '../lib/api';
import { useLang } from '../lib/i18n';
import { Button, Card, ErrorBox, Input, Loading, Page } from '../components/ui';

export default function Profile() {
  const { t } = useLang();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(sessionQuery);
  const user: SessionUser | null = data?.user ?? null;
  const { data: subjects = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['categories'],
    queryFn: () => api('/api/categories'),
    enabled: user?.role === 'TEACHER',
  });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [init, setInit] = useState(false);
  if (user && !init) {
    setName(user.name);
    setPhone(user.phoneNumber ?? '');
    setSubject('');
    setInit(true);
  }

  const save = useMutation({
    mutationFn: () =>
      api('/api/me', {
        method: 'PATCH',
        body: { name, phoneNumber: phone || undefined, subject: user?.role === 'TEACHER' && subject ? subject : undefined },
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['session'] }),
  });

  if (isLoading || !user) return <Loading />;
  return (
    <Page title={t('register')}>
      <Card className="max-w-md">
        <p className="mb-4 text-sm text-ink-soft" dir="ltr">{user.email || user.phoneNumber}</p>
        <div className="flex flex-col gap-3">
          <Input label={t('name')} value={name} onChange={(e) => setName(e.target.value)} />
          <Input label={t('phone')} value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
          {user.role === 'TEACHER' && (
            <label className="block">
              <span className="mb-1 block text-sm text-ink">{t('specialization')}</span>
              <input
                className="w-full rounded-lg border border-border bg-white px-3 py-2"
                list="profile-subjects"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('specialization')}
              />
              <datalist id="profile-subjects">
                {subjects.map((c) => <option key={c.id} value={c.name} />)}
              </datalist>
            </label>
          )}
          {save.error && <ErrorBox error={save.error} />}
          <Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>{t('save')}</Button>
        </div>
      </Card>
    </Page>
  );
}

import { rootRoute } from '../routes/__root';
import { requireRole, sessionQuery } from '../lib/session';
import { queryClient } from '../lib/queryClient';

export const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  beforeLoad: () => requireRole(),
  loader: () => queryClient.ensureQueryData(sessionQuery),
  component: Profile,
});
