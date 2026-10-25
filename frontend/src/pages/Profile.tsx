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
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ user: { parentInviteCode: string } }>('/api/me'),
  });
  const user: SessionUser | null = data?.user ?? null;
  const { data: subjects = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['categories'],
    queryFn: () => api('/api/categories'),
    enabled: user?.role === 'TEACHER',
  });
  const [version, setVersion] = useState(0);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr, setAvatarErr] = useState<Error | null>(null);
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

  const uploadAvatar = async (file: File) => {
    setAvatarBusy(true);
    setAvatarErr(null);
    try {
      const up = await api<{ objectKey: string; uploadUrl: string }>('/api/storage/avatar', {
        body: { fileName: file.name, mimeType: file.type, fileSizeBytes: file.size },
      });
      const put = await fetch(up.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed: ${put.status}`);
      await api('/api/me', { method: 'PATCH', body: { image: up.objectKey } });
      await qc.invalidateQueries({ queryKey: ['session'] });
      setVersion(Date.now());
    } catch (e) {
      setAvatarErr(e as Error);
    } finally {
      setAvatarBusy(false);
    }
  };

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
        <div className="mb-4 flex items-center gap-4">
          {user.image ? (
            <img
              src={`/api/me/avatar?v=${version}`}
              alt={user.name}
              className="h-16 w-16 rounded-full border border-line object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
              {user.name.slice(0, 1)}
            </div>
          )}
          <div>
            <label className="cursor-pointer text-sm font-semibold text-primary hover:underline">
              {avatarBusy ? '…' : t('uploadFile')}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadAvatar(f);
                }}
              />
            </label>
            <p className="text-xs text-ink-soft">PNG/JPG · ≤ 2 MB</p>
          </div>
        </div>
        {avatarErr && <div className="mb-3"><ErrorBox error={avatarErr} /></div>}
        <p className="mb-4 text-sm text-ink-soft" dir="ltr">{user.email || user.phoneNumber}</p>
        {user.role === 'STUDENT' && me?.user.parentInviteCode && (
          <div className="mb-4 rounded-xl border border-line bg-primary-light/40 p-3">
            <p className="text-xs font-semibold text-ink-soft">{t('parentCode')}</p>
            <p className="text-lg font-bold tracking-widest text-primary" dir="ltr">{me.user.parentInviteCode}</p>
            <p className="text-xs text-ink-soft">{t('parentCodeHint')}</p>
          </div>
        )}
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
