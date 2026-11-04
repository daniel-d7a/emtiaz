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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarErr, setAvatarErr] = useState<Error | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerErr, setBannerErr] = useState<Error | null>(null);
  const [removeBanner, setRemoveBanner] = useState(false);
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

  const pickAvatar = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      setAvatarErr(new Error(t('imageTooLarge')));
      return;
    }
    setAvatarErr(null);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const pickBanner = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setBannerErr(new Error(t('imageTooLarge')));
      return;
    }
    setBannerErr(null);
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    setRemoveBanner(false);
  };

  const uploadFile = async (endpoint: string, file: File) => {
    const up = await api<PresignedUpload>(endpoint, {
      body: { fileName: file.name, mimeType: file.type, fileSizeBytes: file.size },
    });
    const put = await fetch(up.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!put.ok) throw new Error(`Upload failed: ${put.status}`);
    return up.objectKey;
  };

  const save = useMutation({
    mutationFn: async () => {
      const image = avatarFile ? await uploadFile('/api/storage/avatar', avatarFile) : undefined;
      const landingBanner = bannerFile
        ? await uploadFile('/api/storage/banner', bannerFile)
        : removeBanner
          ? null
          : undefined;
      return api('/api/me', {
        method: 'PATCH',
        body: {
          name,
          phoneNumber: phone || undefined,
          subject: user?.role === 'TEACHER' && subject ? subject : undefined,
          ...(image ? { image } : {}),
          ...(landingBanner !== undefined ? { landingBanner } : {}),
          ...(user?.role === 'STUDENT'
            ? { dateOfBirth: dateOfBirth || null, gradeId: gradeId || null }
            : {}),
          ...(user?.role === 'TEACHER'
            ? { landingSlug, landingBio, landingPublished, landingTheme: theme }
            : {}),
        },
      });
    },
    onSuccess: () => {
      toast.success(t('saved'));
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
      setAvatarFile(null);
      setAvatarPreview(null);
      setBannerFile(null);
      setBannerPreview(null);
      setRemoveBanner(false);
      setVersion(Date.now());
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
      title={t('profile')}
      right={
        <Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>
          {t('save')}
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="mb-4 text-lg font-bold">{t('accountData')}</h2>
          <div className="mb-4 flex items-center gap-4">
            {avatarPreview || user.image ? (
              <img
                src={avatarPreview ?? `/api/me/avatar?v=${version}`}
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
                {save.isPending ? '…' : t('uploadFile')}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) pickAvatar(f);
                  }}
                />
              </label>
              <p className="text-xs text-ink-soft">{t('fileFormats')}</p>
            </div>
          </div>
          {avatarErr && <div className="mb-3"><ErrorBox error={avatarErr} /></div>}
          <p className="mb-4 text-sm text-ink-soft" dir="ltr">{user.email || user.phoneNumber}</p>
          <div className="grid gap-3 sm:grid-cols-2">
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
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-ink-soft">{t('specialization')}</span>
                <input
                  className="h-10 w-full rounded-xl border border-line bg-white px-3 outline-none focus:border-primary"
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
            {save.error && <div className="sm:col-span-2"><ErrorBox error={save.error} /></div>}
          </div>
        </Card>

        {user.role === 'TEACHER' && (
          <Card>
            <h2 className="mb-4 text-lg font-bold">{t('landingPage')}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label={t('landingSlug')}
                  value={landingSlug}
                  onChange={(e) => setLandingSlug(e.target.value.toLowerCase())}
                  placeholder={t('landingSlugPlaceholder')}
                  dir="ltr"
                />
              </div>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-ink-soft">{t('landingBio')}</span>
                <textarea
                  className="w-full rounded-xl border border-line bg-white px-3 py-2"
                  rows={3}
                  maxLength={500}
                  value={landingBio}
                  onChange={(e) => setLandingBio(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={landingPublished}
                  onChange={(e) => setLandingPublished(e.target.checked)}
                />
                {t('publishLanding')}
              </label>
              {landingSlug && (
                <a className="text-sm text-primary underline sm:col-span-2" href={`/t/${landingSlug}`} target="_blank" rel="noreferrer">
                  {t('viewLanding')}: /t/{landingSlug}
                </a>
              )}

              <div className="mt-2 border-t border-line pt-4 sm:col-span-2">
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
                    {bannerPreview || (me?.bannerUrl && !removeBanner) ? (
                      <div className="flex flex-col gap-2">
                        <img
                          src={bannerPreview ?? me!.bannerUrl!}
                          alt=""
                          className="h-32 w-full rounded-xl border border-line object-cover"
                        />
                        <Button
                          variant="danger"
                          onClick={() => {
                            if (bannerPreview) URL.revokeObjectURL(bannerPreview);
                            setBannerFile(null);
                            setBannerPreview(null);
                            setRemoveBanner(!bannerPreview);
                          }}
                        >
                          {t('delete')}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-ink-soft">{t('noBanner')}</p>
                    )}
                    <label className="mt-2 inline-block cursor-pointer text-sm font-semibold text-primary hover:underline">
                      {save.isPending ? '…' : t('uploadBanner')}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) pickBanner(f);
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
                        bannerUrl={bannerPreview ?? (removeBanner ? null : me?.bannerUrl ?? null)}
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
