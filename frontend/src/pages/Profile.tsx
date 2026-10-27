import { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, type SessionUser } from '../lib/api';
import { localizeName, useLang } from '../lib/i18n';
import { Button, Card, ErrorBox, Input, Loading, Page, Select } from '../components/ui';
import { ThemeHero, ThemeSurface } from '../components/TeacherTheme';
import { normalizeTheme } from '../lib/theme';
import type { MeResponse, PresignedUpload, TeacherTheme } from '../../../shared/api';

export default function Profile() {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(sessionQuery);
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<MeResponse>('/api/me'),
  });
  const user: SessionUser | null = data?.user ?? null;
  const { data: subjects = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['categories'],
    queryFn: () => api('/api/categories'),
    enabled: user?.role === 'TEACHER',
  });
  const { data: grades = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['grades-list'],
    queryFn: () => api('/api/admin/taxonomy/grades'),
    enabled: user?.role === 'STUDENT',
  });
  const [version, setVersion] = useState(0);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr, setAvatarErr] = useState<Error | null>(null);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [bannerErr, setBannerErr] = useState<Error | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [landingSlug, setLandingSlug] = useState('');
  const [landingBio, setLandingBio] = useState('');
  const [landingPublished, setLandingPublished] = useState(false);
  const [theme, setTheme] = useState<TeacherTheme>(normalizeTheme(null));
  const [init, setInit] = useState(false);
  const [landingInit, setLandingInit] = useState(false);
  if (user && !init) {
    setName(user.name);
    setPhone(user.phoneNumber ?? '');
    setSubject('');
    setInit(true);
  }
  if (me?.user && !landingInit) {
    setLandingSlug(me.user.landingSlug ?? '');
    setLandingBio(me.user.landingBio ?? '');
    setLandingPublished(me.user.landingPublished);
    setTheme(normalizeTheme(me.user.landingTheme));
    setDateOfBirth(me.user.dateOfBirth ?? '');
    setGradeId(me.user.gradeId ?? '');
    setLandingInit(true);
  }

  const uploadAvatar = async (file: File) => {
    setAvatarBusy(true);
    setAvatarErr(null);
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error(t('imageTooLarge'));
      const up = await api<PresignedUpload>('/api/storage/avatar', {
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
      await qc.invalidateQueries({ queryKey: ['me'] });
      setVersion(Date.now());
      toast.success(t('saved'));
    } catch (e) {
      setAvatarErr(e as Error);
      toast.error((e as Error).message || t('errorOccurred'));
    } finally {
      setAvatarBusy(false);
    }
  };

  const uploadBanner = async (file: File) => {
    setBannerBusy(true);
    setBannerErr(null);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error(t('imageTooLarge'));
      const up = await api<PresignedUpload>('/api/storage/banner', {
        body: { fileName: file.name, mimeType: file.type, fileSizeBytes: file.size },
      });
      const put = await fetch(up.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed: ${put.status}`);
      await api('/api/me', { method: 'PATCH', body: { landingBanner: up.objectKey } });
      await qc.invalidateQueries({ queryKey: ['me'] });
      toast.success(t('saved'));
    } catch (e) {
      setBannerErr(e as Error);
      toast.error((e as Error).message || t('errorOccurred'));
    } finally {
      setBannerBusy(false);
    }
  };

  const removeBanner = useMutation({
    mutationFn: () => api('/api/me', { method: 'PATCH', body: { landingBanner: null } }),
    onSuccess: () => {
      toast.success(t('saved'));
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const save = useMutation({
    mutationFn: () =>
      api('/api/me', {
        method: 'PATCH',
        body: {
          name,
          phoneNumber: phone || undefined,
          subject: user?.role === 'TEACHER' && subject ? subject : undefined,
          ...(user?.role === 'STUDENT'
            ? { dateOfBirth: dateOfBirth || null, gradeId: gradeId || null }
            : {}),
          ...(user?.role === 'TEACHER'
            ? { landingSlug, landingBio, landingPublished, landingTheme: theme }
            : {}),
        },
      }),
    onSuccess: () => {
      toast.success(t('saved'));
      void qc.invalidateQueries({ queryKey: ['session'] });
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
  });

  if (isLoading || !user) return <Loading />;
  const subjectName = me?.user.subjectCategoryId
    ? subjects.find((s) => s.id === me.user.subjectCategoryId)?.name
    : null;
  return (
    <Page
      wide
      title={t('profile')}
      right={
        <Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>
          {t('save')}
        </Button>
      }
    >
      <div className={`grid gap-6 ${user.role === 'TEACHER' ? 'lg:grid-cols-2' : 'max-w-xl'}`}>
        <Card>
          <h2 className="mb-4 text-lg font-bold">{t('accountData')}</h2>
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
              <p className="text-xs text-ink-soft">{t('fileFormats')}</p>
            </div>
          </div>
          {avatarErr && <div className="mb-3"><ErrorBox error={avatarErr} /></div>}
          <p className="mb-4 text-sm text-ink-soft" dir="ltr">{user.email || user.phoneNumber}</p>
          <div className="flex flex-col gap-3">
            <Input label={t('name')} value={name} onChange={(e) => setName(e.target.value)} />
            <Input label={t('phone')} value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
            {user.role === 'STUDENT' && (
              <>
                <Input
                  label={t('dateOfBirth')}
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
                <Select label={t('gradeOptional')} value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
                  <option value="">—</option>
                  {grades.map((g) => <option key={g.id} value={g.id}>{localizeName(g.name, lang)}</option>)}
                </Select>
              </>
            )}
            {user.role === 'TEACHER' && (
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink-soft">{t('specialization')}</span>
                <input
                  className="min-h-12 w-full rounded-xl border border-line bg-white px-4 py-3 outline-none focus:border-primary"
                  list="profile-subjects"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t('specialization')}
                />
                <datalist id="profile-subjects">
                  {subjects.map((c) => <option key={c.id} value={c.name} label={localizeName(c.name, lang)} />)}
                </datalist>
              </label>
            )}
            {save.error && <ErrorBox error={save.error} />}
          </div>
        </Card>

        {user.role === 'TEACHER' && (
          <Card>
            <h2 className="mb-4 text-lg font-bold">{t('landingPage')}</h2>
            <div className="flex flex-col gap-3">
              <Input
                label={t('landingSlug')}
                value={landingSlug}
                onChange={(e) => setLandingSlug(e.target.value.toLowerCase())}
                placeholder={t('landingSlugPlaceholder')}
                dir="ltr"
              />
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-ink-soft">{t('landingBio')}</span>
                <textarea
                  className="w-full rounded-xl border border-line bg-white px-4 py-3"
                  rows={3}
                  maxLength={500}
                  value={landingBio}
                  onChange={(e) => setLandingBio(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={landingPublished}
                  onChange={(e) => setLandingPublished(e.target.checked)}
                />
                {t('publishLanding')}
              </label>
              {landingSlug && (
                <a className="text-sm text-primary underline" href={`/t/${landingSlug}`} target="_blank" rel="noreferrer">
                  {t('viewLanding')}: /t/{landingSlug}
                </a>
              )}

              <div className="mt-2 border-t border-line pt-4">
                <h3 className="mb-3 font-bold">{t('theme')}</h3>
                <div className="flex flex-col gap-3">
                  <Select
                    label={t('themeLayout')}
                    value={theme.layout}
                    onChange={(e) => setTheme({ ...theme, layout: e.target.value as TeacherTheme['layout'] })}
                  >
                    <option value="banner">{t('layoutBanner')}</option>
                    <option value="split">{t('layoutSplit')}</option>
                  </Select>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ColorField
                      label={t('primaryColor')}
                      value={theme.primary}
                      onChange={(primary) => setTheme({ ...theme, primary })}
                    />
                    <ColorField
                      label={t('secondaryColor')}
                      value={theme.secondary}
                      onChange={(secondary) => setTheme({ ...theme, secondary })}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select
                      label={t('arabicFont')}
                      value={theme.arabicFont}
                      onChange={(e) => setTheme({ ...theme, arabicFont: e.target.value as TeacherTheme['arabicFont'] })}
                    >
                      <option value="cairo">{t('fontCairo')}</option>
                      <option value="readex">{t('fontReadex')}</option>
                      <option value="tajawal">{t('fontTajawal')}</option>
                    </Select>
                    <Select
                      label={t('englishFont')}
                      value={theme.englishFont}
                      onChange={(e) => setTheme({ ...theme, englishFont: e.target.value as TeacherTheme['englishFont'] })}
                    >
                      <option value="dm-sans">{t('fontDmSans')}</option>
                      <option value="inter">{t('fontInter')}</option>
                      <option value="cairo">{t('fontCairo')}</option>
                    </Select>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold text-ink-soft">{t('marquee')}</span>
                    <Input
                      value={theme.marquee}
                      maxLength={200}
                      onChange={(e) => setTheme({ ...theme, marquee: e.target.value })}
                      placeholder={t('marqueeHint')}
                    />
                    <span className="mt-1 block text-xs text-ink-soft">{t('marqueeHint')}</span>
                  </label>
                  <div>
                    <span className="mb-1 block text-sm font-semibold text-ink-soft">{t('banner')}</span>
                    {me?.bannerUrl ? (
                      <div className="flex flex-col gap-2">
                        <img src={me.bannerUrl} alt="" className="h-32 w-full rounded-xl border border-line object-cover" />
                        <Button variant="ghost" onClick={() => removeBanner.mutate()} disabled={removeBanner.isPending}>
                          {t('delete')}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-ink-soft">{t('noBanner')}</p>
                    )}
                    <label className="mt-2 inline-block cursor-pointer text-sm font-semibold text-primary hover:underline">
                      {bannerBusy ? '…' : t('uploadBanner')}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadBanner(f);
                        }}
                      />
                    </label>
                    <p className="text-xs text-ink-soft">{t('fileFormats')}</p>
                    {bannerErr && <div className="mt-2"><ErrorBox error={bannerErr} /></div>}
                  </div>
                  <div className="mt-2 border-t border-line pt-4">
                    <ThemeSurface theme={theme}>
                      <ThemeHero
                        theme={theme}
                        bannerUrl={me?.bannerUrl ?? null}
                        name={name || user.name}
                        subject={subjectName ? localizeName(subjectName, lang) : null}
                        bio={landingBio || null}
                      />
                    </ThemeSurface>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Page>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-ink-soft">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-14 cursor-pointer rounded-xl border border-line bg-white p-1"
        />
        <span className="text-sm text-ink-soft" dir="ltr">{value}</span>
      </div>
    </label>
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
