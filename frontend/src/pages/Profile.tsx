import { useEffect, useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, QrCode, Sparkles } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { api, teacherApi, type SessionUser } from '../lib/api';
import { formatDateTime, localizeName, useLang } from '../lib/i18n';
import { Badge, Button, Card, ErrorBox, IconButton, InfoHint, Input, Loading, Page, Progress, Select } from '../components/ui';
import { ThemeHero, ThemeSurface } from '../components/TeacherTheme';
import { TeacherPlansModal } from '../components/TeacherPlansModal';
import { normalizeTheme } from '../lib/theme';
import { deleteUploadedObject, uploadFile } from '../lib/upload';
import type { CategoryItem, Country, CourseType, GradeItem, MeResponse, TeacherTheme } from '../../../shared/api';

function MonitoringCodeQr({ value }: { value: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width: 180, margin: 1 })
      .then((url) => active && setSrc(url))
      .catch(() => active && setSrc(''));
    return () => {
      active = false;
    };
  }, [value]);
  if (!src) return null;
  return (
    <img
      src={src}
      width={180}
      height={180}
      alt="QR Code"
      className="rounded-xl border border-line bg-white p-2 shadow-sm"
    />
  );
}

export default function Profile() {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(sessionQuery);
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<MeResponse>('/api/me'),
  });
  const user: SessionUser | null = data?.user ?? null;
  const [version, setVersion] = useState(0);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarErr, setAvatarErr] = useState<Error | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerErr, setBannerErr] = useState<Error | null>(null);
  const [removeBanner, setRemoveBanner] = useState(false);
  const [name, setName] = useState('');
  const [country, setCountry] = useState<Country>('OM');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [courseFocus, setCourseFocus] = useState<CourseType>('ACADEMIC');
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>([]);
  const [customGradeInput, setCustomGradeInput] = useState('');
  const [customGrades, setCustomGrades] = useState<string[]>([]);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [landingSlug, setLandingSlug] = useState('');
  const [landingBio, setLandingBio] = useState('');
  const [landingPublished, setLandingPublished] = useState(false);
  const [theme, setTheme] = useState<TeacherTheme>(normalizeTheme(null));
  const [init, setInit] = useState(false);
  const [landingInit, setLandingInit] = useState(false);

  const { data: subjects = [] } = useQuery<CategoryItem[]>({
    queryKey: ['categories'],
    queryFn: () => api('/api/onboarding/categories'),
    enabled: user?.role === 'TEACHER',
  });
  const { data: grades = [] } = useQuery<GradeItem[]>({
    queryKey: ['grades-list', country],
    queryFn: () => api(`/api/onboarding/grades?country=${country}`),
    enabled: user?.role === 'STUDENT' || user?.role === 'TEACHER',
  });

  if (user && !init) {
    setName(user.name);
    setCountry(user.country ?? 'OM');
    setPhone(user.phoneNumber ?? '');
    setCourseFocus(user.courseFocus ?? 'ACADEMIC');
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
    setCourseFocus(me.courseFocus ?? me.user.courseFocus ?? 'ACADEMIC');
    setSelectedGradeIds((me.taughtGrades ?? me.user.taughtGrades ?? []).map((g) => g.id));
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

  const save = useMutation({
    mutationFn: async () => {
      let image: string | undefined;
      let landingBanner: string | null | undefined;
      try {
        image = avatarFile ? await uploadFile('/api/storage/avatar', avatarFile) : undefined;
        landingBanner = bannerFile
          ? await uploadFile('/api/storage/banner', bannerFile)
          : removeBanner
            ? null
            : undefined;
        return await api('/api/me', {
          method: 'PATCH',
          body: {
            name,
            country,
            phoneNumber: phone || undefined,
            subject: user?.role === 'TEACHER' && subject ? subject : undefined,
            ...(image ? { image } : {}),
            ...(landingBanner !== undefined ? { landingBanner } : {}),
            ...(user?.role === 'STUDENT'
              ? { dateOfBirth: dateOfBirth || null, gradeId: gradeId || null }
              : {}),
            ...(user?.role === 'TEACHER'
              ? {
                  courseFocus,
                  gradeIds: selectedGradeIds,
                  customGrades: customGrades.length ? customGrades : undefined,
                  landingSlug,
                  landingBio,
                  landingPublished,
                  landingTheme: theme,
                }
              : {}),
          },
        });
      } catch (error) {
        await Promise.all([deleteUploadedObject(image), deleteUploadedObject(landingBanner)]);
        throw error;
      }
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
  const subjectItem = me?.user.subjectCategoryId
    ? subjects.find((s) => s.id === me.user.subjectCategoryId)
    : null;
  const subjectName = subjectItem ? localizeName(subjectItem, lang) : null;
  const toggleGrade = (id: string) => {
    setSelectedGradeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };
  const addCustomGrade = () => {
    const trimmed = customGradeInput.trim();
    if (!trimmed) return;
    if (!customGrades.includes(trimmed)) {
      setCustomGrades((prev) => [...prev, trimmed]);
    }
    setCustomGradeInput('');
  };
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
            <Select label={t('country')} value={country} onChange={(e) => setCountry(e.target.value as Country)}>
              <option value="OM">{t('oman')} (+968)</option>
              <option value="EG">{t('egypt')} (+20)</option>
            </Select>
            <Input
              label={t('phone')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={country === 'EG' ? '010XXXXXXXX' : '94XXXXXX'}
              dir="ltr"
            />
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
                  {grades.map((g) => <option key={g.id} value={g.id}>{localizeName(g, lang)}</option>)}
                </Select>
              </>
            )}
            {user.role === 'TEACHER' && (
              <>
                <Select
                  label={t('courseFocus')}
                  value={courseFocus}
                  onChange={(e) => setCourseFocus(e.target.value as CourseType)}
                >
                  <option value="ACADEMIC">{t('academicFocus')}</option>
                  <option value="GENERAL">{t('generalFocus')}</option>
                </Select>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm font-semibold text-ink-soft">
                    {t('specialization')} {subjectName ? `(${subjectName})` : ''}
                  </span>
                  <input
                    className="h-10 w-full rounded-xl border border-line bg-white px-3 outline-none focus:border-primary"
                    list="profile-subjects"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={subjectName ?? t('specialization')}
                  />
                  <datalist id="profile-subjects">
                    {subjects.map((c) => (
                      <option
                        key={c.id}
                        value={localizeName(c, lang)}
                        label={c.nameEn && c.nameAr ? `${c.nameAr} — ${c.nameEn}` : localizeName(c, lang)}
                      />
                    ))}
                  </datalist>
                </label>
                <div className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-ink-soft">{t('taughtGrades')}</span>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {grades.map((g) => {
                      const active = selectedGradeIds.includes(g.id);
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => toggleGrade(g.id)}
                          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                            active
                              ? 'border-primary bg-primary text-white'
                              : 'border-line bg-white text-ink hover:border-primary'
                          }`}
                        >
                          {localizeName(g, lang)}
                        </button>
                      );
                    })}
                    {customGrades.map((cg) => (
                      <button
                        key={cg}
                        type="button"
                        onClick={() => setCustomGrades((prev) => prev.filter((item) => item !== cg))}
                        className="rounded-xl border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        {cg} ×
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="h-10 grow rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-primary"
                      value={customGradeInput}
                      onChange={(e) => setCustomGradeInput(e.target.value)}
                      placeholder={t('customGradePlaceholder')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomGrade();
                        }
                      }}
                    />
                    <Button type="button" variant="ghost" onClick={addCustomGrade} disabled={!customGradeInput.trim()}>
                      {t('add')}
                    </Button>
                  </div>
                </div>
              </>
            )}
            {save.error && <div className="sm:col-span-2"><ErrorBox error={save.error} /></div>}
          </div>
        </Card>

        {user.role === 'STUDENT' && (
          <Card>
            <div className="mb-2 flex items-center gap-2">
              <QrCode className="text-primary" size={22} />
              <h2 className="text-lg font-bold">{t('monitoringCode')}</h2>
            </div>
            <p className="mb-4 text-sm text-ink-soft">{t('monitoringCodeStudentHint')}</p>
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              {me?.user.monitoringCode && <MonitoringCodeQr value={me.user.monitoringCode} />}
              <div className="flex flex-col items-center gap-2 sm:items-start">
                <span className="text-xs font-semibold text-ink-soft">{t('yourMonitoringCode')}</span>
                <div className="flex items-center gap-2">
                  <code className="rounded-xl border border-line bg-background px-4 py-2 font-mono text-2xl font-bold tracking-widest text-primary">
                    {me?.user.monitoringCode ?? '—'}
                  </code>
                  {me?.user.monitoringCode && (
                    <IconButton
                      label={t('copyCode')}
                      onClick={() => {
                        void navigator.clipboard.writeText(me.user.monitoringCode!);
                        toast.success(t('copied'));
                      }}
                    >
                      <Copy size={18} />
                    </IconButton>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {user.role === 'TEACHER' && <TeacherEntitlementsCard user={user} />}

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

function TeacherEntitlementsCard({
  user,
}: {
  user: SessionUser;
}) {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const [promoInput, setPromoInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const { data: entitlements, isLoading } = useQuery({
    queryKey: ['teacher-entitlements'],
    queryFn: () => teacherApi.getEntitlements(),
  });

  const redeemMutation = useMutation({
    mutationFn: (code: string) => teacherApi.redeemCode(code),
    onSuccess: (res) => {
      toast.success(res.message);
      setPromoInput('');
      qc.invalidateQueries({ queryKey: ['teacher-entitlements'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to redeem code');
    },
  });

  const activateMutation = useMutation({
    mutationFn: (giftId: string) => teacherApi.activateSavedGift(giftId),
    onSuccess: (res) => {
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ['teacher-entitlements'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to activate gift');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (giftId: string) => teacherApi.deleteSavedGift(giftId),
    onSuccess: () => {
      toast.success(lang === 'ar' ? 'تم حذف الهدية المحفوظة' : 'Saved gift deleted');
      qc.invalidateQueries({ queryKey: ['teacher-entitlements'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete gift');
    },
  });

  if (isLoading) {
    return (
      <Card>
        <Loading />
      </Card>
    );
  }

  if (!entitlements) return null;

  const { activePlan, usage, currency, supportWhatsapp, savedGifts = [], referral } = entitlements;
  const planName = lang === 'ar' ? activePlan.nameAr : activePlan.nameEn;

  const toneMap: Record<string, 'neutral' | 'primary' | 'secondary' | 'danger'> = {
    ACTIVE: 'primary',
    TRIAL: 'secondary',
    FREE: 'neutral',
    EXPIRED: 'danger',
  };
  const statusLabelMap: Record<string, string> = {
    ACTIVE: t('planStatusActive'),
    TRIAL: t('planStatusTrial'),
    FREE: t('planStatusFree'),
    EXPIRED: t('planStatusExpired'),
  };

  const studentPct = activePlan.maxStudents
    ? Math.min(100, Math.round((usage.activeStudentCount / activePlan.maxStudents) * 100))
    : 0;

  const formatStorage = (bytes: number | null) => {
    if (bytes == null) return t('unlimited');
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const storagePct = activePlan.maxStorageBytes
    ? Math.min(100, Math.round((usage.usedStorageBytes / activePlan.maxStorageBytes) * 100))
    : 0;

  const cleanPhone = (supportWhatsapp ?? '').replace(/\D/g, '');
  const msg =
    lang === 'ar'
      ? `مرحبًا امتياز، أود ترقية خطتي كمعلم.\nالاسم: ${user.name}\nالهاتف: ${user.phoneNumber ?? user.email}\nالخطة الحالية: ${planName}\nالعملة: ${currency}`
      : `Hello Emtiaz, I would like to upgrade my teacher plan.\nName: ${user.name}\nContact: ${user.phoneNumber ?? user.email}\nCurrent Plan: ${planName}\nCurrency: ${currency}`;
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}` : null;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{t('entitlementsAndPlans')}</h2>
            <InfoHint
              title={t('hintEntitlementsTitle')}
              steps={[
                { title: t('hintEntitlementsStep1Title'), body: t('hintEntitlementsStep1Body') },
                { title: t('hintEntitlementsStep2Title'), body: t('hintEntitlementsStep2Body') },
                { title: t('hintEntitlementsStep3Title'), body: t('hintEntitlementsStep3Body') },
              ]}
            />
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm font-semibold text-ink-soft">{t('activePlan')}:</span>
            <span className="font-bold text-ink">{planName}</span>
            <Badge tone={toneMap[activePlan.status] ?? 'neutral'}>
              {statusLabelMap[activePlan.status] ?? activePlan.status}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            {activePlan.endsAt
              ? `${t('expiresOn')}: ${formatDateTime(activePlan.endsAt, lang)}`
              : t('noExpiration')}
          </p>
        </div>
        <Button
          onClick={() => setPlansModalOpen(true)}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary-dark"
        >
          <Sparkles size={16} />
          <span>{t('upgradeOrViewPlans')}</span>
        </Button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-background p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-ink-soft">{t('activeStudentsUsage')}</span>
            <span className="font-bold">
              {usage.activeStudentCount} / {activePlan.maxStudents ?? t('unlimited')}
            </span>
          </div>
          <Progress value={studentPct} />
        </div>

        <div className="rounded-xl border border-line bg-background p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-ink-soft">{t('storageUsage')}</span>
            <span className="font-bold">
              {formatStorage(usage.usedStorageBytes)} / {formatStorage(activePlan.maxStorageBytes)}
            </span>
          </div>
          <Progress value={storagePct} />
        </div>
      </div>

      {/* Promo / Referral Code Redemption */}
      <div className="mt-6 border-t border-line pt-4">
        <h3 className="text-sm font-bold text-ink mb-2">{t('redeemPromoCode')}</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!promoInput.trim()) return;
            redeemMutation.mutate(promoInput.trim());
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            placeholder={t('enterPromoCodePlaceholder')}
            className="flex-1 rounded-xl border border-line bg-white px-3 h-11 text-sm uppercase outline-none focus:border-primary font-mono"
            disabled={redeemMutation.isPending}
          />
          <Button
            type="submit"
            variant="primary"
            className="!min-h-11 !py-2 !px-4 text-sm"
            disabled={!promoInput.trim() || redeemMutation.isPending}
          >
            {redeemMutation.isPending ? '...' : t('redeemButton')}
          </Button>
        </form>
      </div>

      {/* 3-Slot Saved Gifts Inventory */}
      <div className="mt-6 border-t border-line pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-ink">{t('savedGifts')}</h3>
            <InfoHint
              title={t('hintEntitlementsTitle')}
              steps={[
                { title: t('hintEntitlementsStep1Title'), body: t('hintEntitlementsStep1Body') },
                { title: t('hintEntitlementsStep2Title'), body: t('hintEntitlementsStep2Body') },
                { title: t('hintEntitlementsStep3Title'), body: t('hintEntitlementsStep3Body') },
              ]}
            />
          </div>
          <span className="text-xs text-ink-soft font-semibold">
            {t('giftSlotsUsed').replace('{count}', String(savedGifts.length))}
          </span>
        </div>

        {savedGifts.length === 0 ? (
          <p className="text-xs text-ink-soft py-2">{t('noSavedGifts')}</p>
        ) : (
          <div className="space-y-3">
            {savedGifts.map((gift) => {
              const isLowerTier = activePlan.tierRank > gift.tierRank;
              const giftPlanName = lang === 'ar' ? gift.planNameAr : gift.planNameEn;
              return (
                <div
                  key={gift.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-background p-3"
                >
                  <div className="flex items-center gap-2">
                    <Badge tone="secondary">
                      {t('giftDaysBonus').replace('{n}', String(gift.durationDays))}
                    </Badge>
                    <div>
                      <span className="font-bold text-sm text-ink">{giftPlanName}</span>
                      <span className="text-xs text-ink-soft ml-2 mr-2">({gift.source})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end">
                      <Button
                        type="button"
                        variant="primary"
                        className="!min-h-9 !py-1 !px-3 text-xs"
                        disabled={isLowerTier || activateMutation.isPending}
                        onClick={() => activateMutation.mutate(gift.id)}
                      >
                        {t('activateGift')}
                      </Button>
                      {isLowerTier && (
                        <span className="text-[11px] text-secondary mt-1">
                          {t('alreadyOnHigherPlan')}
                        </span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="!min-h-9 !py-1 !px-3 text-xs text-danger hover:text-danger hover:border-danger"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(gift.id)}
                    >
                      {t('deleteGift')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Teacher Referral Program Card */}
      <div className="mt-6 border-t border-line pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-ink">{t('teacherReferralProgram')}</h3>
          {referral?.referralCode && (
            <span className="text-xs text-ink-soft font-semibold">
              {t('referralsProgress')
                .replace('{used}', String(referral.usedCount))
                .replace('{max}', String(referral.maxReferrals))}
            </span>
          )}
        </div>

        {referral?.referralCode ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div>
                <span className="text-xs font-semibold text-ink-soft block mb-1">
                  {t('yourReferralCode')}
                </span>
                <span className="font-mono text-xl font-bold tracking-wider text-primary">
                  {referral.referralCode}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="!min-h-10 !py-2 !px-4 text-xs font-bold"
                  onClick={() => {
                    navigator.clipboard.writeText(referral.referralCode!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? t('copiedCode') : t('copyCode')}
                </Button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    t('referralShareMessage').replace('{code}', referral.referralCode),
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-700"
                >
                  {t('shareViaWhatsapp')}
                </a>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-ink-soft">
                <span>{t('referralsProgress').replace('{used}', String(referral.usedCount)).replace('{max}', String(referral.maxReferrals))}</span>
                <span>{Math.round((referral.usedCount / referral.maxReferrals) * 100)}%</span>
              </div>
              <Progress value={Math.min(100, (referral.usedCount / referral.maxReferrals) * 100)} />
            </div>

            {/* Referrals list */}
            <div className="mt-3">
              <h4 className="text-xs font-bold text-ink mb-2">{t('recentReferrals')}</h4>
              {referral.referrals.length === 0 ? (
                <p className="text-xs text-ink-soft py-1">{t('noReferralsYet')}</p>
              ) : (
                <div className="space-y-2">
                  {referral.referrals.map((r, i) => {
                    const statusTone =
                      r.status === 'REWARDED'
                        ? 'primary'
                        : r.status === 'DROPPED_FULL_INVENTORY'
                          ? 'danger'
                          : 'secondary';
                    const statusText =
                      r.status === 'REWARDED'
                        ? t('referralStatusRewarded')
                        : r.status === 'DROPPED_FULL_INVENTORY'
                          ? t('referralStatusDropped')
                          : t('referralStatusPending');
                    return (
                      <div
                        key={i}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-background p-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink">{r.takerName}</span>
                          <span className="text-ink-soft">
                            ({formatDateTime(r.createdAt, lang)})
                          </span>
                        </div>
                        <Badge tone={statusTone}>{statusText}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-line bg-background p-4 text-center">
            <p className="text-xs text-ink-soft mb-3">{t('referralUpgradePrompt')}</p>
            <Button
              onClick={() => setPlansModalOpen(true)}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-primary px-4 text-xs font-bold text-white transition hover:bg-primary-dark"
            >
              <Sparkles size={14} />
              <span>{t('upgradeOrViewPlans')}</span>
            </Button>
          </div>
        )}
      </div>

      <TeacherPlansModal
        open={plansModalOpen}
        onOpenChange={setPlansModalOpen}
        user={user}
        activePlan={activePlan}
        currency={currency}
        supportWhatsapp={supportWhatsapp}
        upgradeOptions={entitlements.upgradeOptions}
        customPlanPrompt={entitlements.customPlanPrompt}
      />
    </Card>
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
