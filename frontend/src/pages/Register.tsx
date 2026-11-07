import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearch, createRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, GraduationCap, HeartHandshake, Sparkles, Users } from 'lucide-react';
import { authApi, onboardingApi, type CategoryItem, type Country, type CourseType, type GradeItem } from '../lib/api';
import { sessionQuery } from '../lib/session';
import { localizeName, useLang } from '../lib/i18n';
import { Badge, Button, Card, ErrorBox, Input, Select } from '../components/ui';
import { ReportProblemButton } from '../components/ReportProblemButton';
import { rootRoute } from '../routes/__root';
import type { AuthRoleSlug } from './Login';

function normalizeRoleSlug(raw?: string, hasJoin?: boolean): AuthRoleSlug {
  if (raw === 'teacher' || raw === 'student' || raw === 'parent') return raw;
  return hasJoin ? 'student' : 'teacher';
}

export default function Register() {
  const params = useParams({ strict: false }) as { role?: string };
  const search = useSearch({ strict: false }) as { join?: string; entry?: string };
  const initialJoin = typeof search?.join === 'string' ? search.join : undefined;
  const initialEntry = typeof search?.entry === 'string' ? search.entry : undefined;

  const [activeRole, setActiveRole] = useState<AuthRoleSlug>(() =>
    normalizeRoleSlug(params?.role, Boolean(initialJoin)),
  );

  useEffect(() => {
    if (params?.role === 'teacher' || params?.role === 'student' || params?.role === 'parent') {
      setActiveRole(params.role);
    }
  }, [params?.role]);

  const isTeacher = activeRole === 'teacher';
  const isParent = activeRole === 'parent';
  const isStudent = activeRole === 'student';

  const { t, lang } = useLang();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1 state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2 state
  const [country, setCountry] = useState<Country>('OM');
  const [phone, setPhone] = useState('');

  // Step 3 Teacher state
  const [courseFocus, setCourseFocus] = useState<CourseType>('ACADEMIC');
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>([]);
  const [customGrade, setCustomGrade] = useState('');
  const [academicSubject, setAcademicSubject] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('');
  const [customTrack, setCustomTrack] = useState('');

  // Step 3 Student state
  const [studentGradeId, setStudentGradeId] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState(initialJoin ?? '');
  const [entryCodeInput, setEntryCodeInput] = useState(initialEntry ?? '');
  const [joinedGroupId, setJoinedGroupId] = useState<string | null>(null);

  // Step 3 Parent state
  const [studentPhoneOrCode, setStudentPhoneOrCode] = useState('');

  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: categories = [] } = useQuery<CategoryItem[]>({
    queryKey: ['onboarding-categories'],
    queryFn: () => onboardingApi.listCategories(),
    enabled: isTeacher,
  });

  const { data: grades = [] } = useQuery<GradeItem[]>({
    queryKey: ['onboarding-grades', country],
    queryFn: () => onboardingApi.listGrades(country),
    enabled: isTeacher || isStudent,
  });

  useEffect(() => {
    document.title = `${t('register')} — ${t('appName')}`;
  }, [t]);

  const selectRole = (nextRole: AuthRoleSlug) => {
    setActiveRole(nextRole);
    setError(null);
    setStep(1);
    void navigate({
      to: '/register/$role',
      params: { role: nextRole },
      search: { join: initialJoin, entry: initialEntry },
    });
  };

  const toggleGrade = (gradeId: string) => {
    setSelectedGradeIds((prev) =>
      prev.includes(gradeId) ? prev.filter((id) => id !== gradeId) : [...prev, gradeId],
    );
  };

  const handleStep1Next = async () => {
    setError(null);
    if (!name.trim()) {
      setError(new Error(t('name')));
      return;
    }
    if (password.length < 8) {
      setError(new Error(t('passwordMin')));
      return;
    }
    const trimmedEmail = email.trim();
    if (isTeacher && !trimmedEmail) {
      setError(new Error(t('emailInvalid')));
      return;
    }
    if (trimmedEmail) {
      setBusy(true);
      try {
        const res = await onboardingApi.checkAvailability({ email: trimmedEmail });
        if (!res.available) {
          setError(
            new Error(
              res.reason?.toLowerCase().includes('already')
                ? t('emailAlreadyRegistered')
                : t('emailInvalid'),
            ),
          );
          return;
        }
      } catch (e) {
        setError(e as Error);
        return;
      } finally {
        setBusy(false);
      }
    }
    setStep(2);
  };

  const handleStep2Next = async () => {
    setError(null);
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setError(new Error(t('phoneInvalid')));
      return;
    }
    setBusy(true);
    try {
      const res = await onboardingApi.checkAvailability({
        phoneNumber: trimmedPhone,
        country,
      });
      if (!res.available) {
        setError(
          new Error(
            res.reason?.toLowerCase().includes('already')
              ? t('phoneAlreadyRegistered')
              : t('invalidPhoneForCountry'),
          ),
        );
        return;
      }
      setStep(3);
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteRegistration = async () => {
    setError(null);
    setBusy(true);
    try {
      if (isTeacher) {
        const customGrades = customGrade.trim() ? [customGrade.trim()] : undefined;
        const subjectValue =
          courseFocus === 'GENERAL'
            ? customTrack.trim() || selectedTrack.trim()
            : academicSubject.trim() || customGrade.trim() || undefined;

        if (courseFocus === 'GENERAL' && !subjectValue) {
          setError(new Error(t('selectGeneralTrack')));
          setBusy(false);
          return;
        }
        if (
          courseFocus === 'ACADEMIC' &&
          !subjectValue &&
          selectedGradeIds.length === 0 &&
          !customGrades?.length
        ) {
          setError(new Error(t('selectYourGrades')));
          setBusy(false);
          return;
        }

        await onboardingApi.registerTeacher({
          name: name.trim(),
          email: email.trim() || undefined,
          password,
          phoneNumber: phone.trim(),
          country,
          courseFocus,
          gradeIds: courseFocus === 'ACADEMIC' ? selectedGradeIds : undefined,
          customGrades: courseFocus === 'ACADEMIC' ? customGrades : undefined,
          subject: subjectValue,
        });
      } else if (isParent) {
        const rawChild = studentPhoneOrCode.trim();
        const isMonitoringCode =
          rawChild.length === 8 && /^[A-Za-z0-9]{8}$/.test(rawChild) && !/^\d{8}$/.test(rawChild);
        await onboardingApi.registerParent({
          name: name.trim(),
          email: email.trim() || undefined,
          password,
          phoneNumber: phone.trim(),
          country,
          monitoringCode: isMonitoringCode ? rawChild.toUpperCase() : undefined,
          studentPhone: rawChild && !isMonitoringCode ? rawChild : undefined,
        });
      } else {
        await onboardingApi.registerStudent({
          name: name.trim(),
          password,
          phoneNumber: phone.trim(),
          email: email.trim() || undefined,
          country,
          gradeId: studentGradeId || undefined,
        });
      }

      const loginIdentifier = isTeacher && email.trim() ? email.trim() : phone.trim();
      await authApi.login(loginIdentifier, password);
      qc.clear();
      await qc.fetchQuery(sessionQuery);

      if (isStudent && joinCodeInput.trim()) {
        try {
          const joined = await onboardingApi.joinByCode(
            joinCodeInput.trim(),
            entryCodeInput.trim() || undefined,
          );
          if (joined?.group?.id) {
            setJoinedGroupId(joined.group.id);
          }
        } catch {
          // Even if the optional join code failed or requires entry on dashboard, account is ready.
        }
      }

      setStep(4);
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  };

  const enterDashboard = () => {
    if (isTeacher) {
      void navigate({ to: '/teacher/dashboard' });
      return;
    }
    if (isParent) {
      void navigate({ to: '/parent/children' });
      return;
    }
    if (joinedGroupId) {
      void navigate({ to: '/student/groups/$groupId', params: { groupId: joinedGroupId } });
      return;
    }
    if (joinCodeInput.trim()) {
      void navigate({
        to: '/join/$joinCode',
        params: { joinCode: joinCodeInput.trim().toUpperCase() },
        search: { entry: entryCodeInput.trim() || undefined },
      });
      return;
    }
    void navigate({ to: '/student/dashboard' });
  };

  const roleTabs: Array<{ slug: AuthRoleSlug; label: string; icon: typeof GraduationCap }> = [
    { slug: 'teacher', label: t('teacherRoleTab'), icon: GraduationCap },
    { slug: 'student', label: t('studentRoleTab'), icon: Users },
    { slug: 'parent', label: t('parentRoleTab'), icon: HeartHandshake },
  ];

  const currentRoleLabel = isTeacher
    ? t('teacherRoleTab')
    : isParent
      ? t('parentRoleTab')
      : t('studentRoleTab');

  return (
    <div className="mx-auto max-w-lg p-4">
      <Card className="mt-8">
        {step < 4 && (
          <>
            <div
              role="tablist"
              aria-label={t('register')}
              className="mb-5 grid grid-cols-3 gap-1.5 rounded-xl bg-background p-1.5"
            >
              {roleTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeRole === tab.slug;
                return (
                  <button
                    key={tab.slug}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => selectRole(tab.slug)}
                    className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition-colors sm:text-sm ${
                      active
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-ink-soft hover:bg-surface hover:text-ink'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-ink-soft">
                <span>
                  {currentRoleLabel} — {t('register')}
                </span>
                <span data-testid="wizard-step-indicator">
                  {t('stepProgress').replace('{step}', String(step))}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2" aria-hidden="true">
                {[1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`h-2 rounded-full transition-colors ${
                      idx <= step ? 'bg-primary' : 'bg-line'
                    }`}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleStep1Next();
            }}
          >
            <h1 className="text-xl font-bold">
              {currentRoleLabel} — {t('wizardStep1Title')}
            </h1>
            <Input
              label={t('name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label={isTeacher ? t('email') : t('emailOptional')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required={isTeacher}
              dir="ltr"
            />
            <Input
              label={t('password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={8}
            />
            {error && <ErrorBox error={error} />}
            <Button type="submit" disabled={busy}>
              {busy ? t('checkingAvailability') : t('next')}
            </Button>
            <p className="text-center text-xs text-ink-soft">
              {t('byRegisteringAgree')}{' '}
              <Link to="/terms" target="_blank" className="font-semibold text-primary underline">
                {t('termsOfService')}
              </Link>{' '}
              {t('and')}{' '}
              <Link to="/privacy" target="_blank" className="font-semibold text-primary underline">
                {t('privacyPolicy')}
              </Link>
            </p>
          </form>
        )}

        {step === 2 && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleStep2Next();
            }}
          >
            <h1 className="text-xl font-bold">
              {currentRoleLabel} — {t('wizardStep2Title')}
            </h1>
            <Select
              label={t('country')}
              value={country}
              onChange={(e) => {
                setCountry(e.target.value as Country);
                setSelectedGradeIds([]);
                setStudentGradeId('');
              }}
            >
              <option value="OM">OM — {t('oman')} (+968)</option>
              <option value="EG">EG — {t('egypt')} (+20)</option>
            </Select>
            <Input
              label={t('phone')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={country === 'EG' ? '010XXXXXXXX' : '94XXXXXX'}
              required
              dir="ltr"
            />
            {error && <ErrorBox error={error} />}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setError(null);
                  setStep(1);
                }}
                disabled={busy}
              >
                {t('previous')}
              </Button>
              <Button type="submit" className="flex-1" disabled={busy}>
                {busy ? t('checkingAvailability') : t('next')}
              </Button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleCompleteRegistration();
            }}
          >
            <h1 className="text-xl font-bold">
              {isTeacher
                ? t('wizardStep3TeacherTitle')
                : isParent
                  ? t('wizardStep3ParentTitle')
                  : t('wizardStep3StudentTitle')}
            </h1>

            {isTeacher && (
              <>
                <div>
                  <span className="mb-1.5 block text-sm font-medium text-ink">
                    {t('courseFocus')}
                  </span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setCourseFocus('ACADEMIC')}
                      className={`rounded-xl border p-3 text-start text-sm font-bold transition-colors ${
                        courseFocus === 'ACADEMIC'
                          ? 'border-primary bg-primary-light text-primary-dark'
                          : 'border-line bg-surface text-ink-soft hover:border-primary/50'
                      }`}
                    >
                      {t('academicFocus')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCourseFocus('GENERAL')}
                      className={`rounded-xl border p-3 text-start text-sm font-bold transition-colors ${
                        courseFocus === 'GENERAL'
                          ? 'border-primary bg-primary-light text-primary-dark'
                          : 'border-line bg-surface text-ink-soft hover:border-primary/50'
                      }`}
                    >
                      {t('generalFocus')}
                    </button>
                  </div>
                </div>

                {courseFocus === 'ACADEMIC' ? (
                  <>
                    <div>
                      <span className="mb-1.5 block text-sm font-medium text-ink">
                        {t('selectYourGrades')} ({country === 'EG' ? t('egypt') : t('oman')})
                      </span>
                      <div className="grid max-h-48 grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border border-line bg-background p-2">
                        {grades.map((g) => {
                          const checked = selectedGradeIds.includes(g.id);
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => toggleGrade(g.id)}
                              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-start text-xs font-semibold transition-colors ${
                                checked
                                  ? 'border-primary bg-primary text-white'
                                  : 'border-line bg-surface text-ink hover:border-primary'
                              }`}
                            >
                              <span>{localizeName(g, lang)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <Input
                      label={t('customGradePlaceholder')}
                      value={customGrade}
                      onChange={(e) => setCustomGrade(e.target.value)}
                      placeholder={t('customGradePlaceholder')}
                    />
                    <Input
                      label={t('subject')}
                      value={academicSubject}
                      onChange={(e) => setAcademicSubject(e.target.value)}
                      placeholder={t('academicSubjectPlaceholder')}
                    />
                  </>
                ) : (
                  <>
                    <Select
                      label={t('selectGeneralTrack')}
                      value={selectedTrack}
                      onChange={(e) => setSelectedTrack(e.target.value)}
                    >
                      <option value="">{t('choose')}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.nameEn || c.name}>
                          {localizeName(c, lang)}
                        </option>
                      ))}
                    </Select>
                    <Input
                      label={t('customTrackPlaceholder')}
                      value={customTrack}
                      onChange={(e) => setCustomTrack(e.target.value)}
                      placeholder={t('customTrackPlaceholder')}
                    />
                  </>
                )}
              </>
            )}

            {isStudent && (
              <>
                <Select
                  label={t('studentGradeOptional')}
                  value={studentGradeId}
                  onChange={(e) => setStudentGradeId(e.target.value)}
                >
                  <option value="">{t('choose')}</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {localizeName(g, lang)}
                    </option>
                  ))}
                </Select>
                <Input
                  label={t('groupJoinCodeOptional')}
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  placeholder={t('enterCodePlaceholder')}
                  dir="ltr"
                />
                {joinCodeInput.trim() && (
                  <Input
                    label={t('entryCodeOptional')}
                    value={entryCodeInput}
                    onChange={(e) => setEntryCodeInput(e.target.value)}
                    placeholder="ENTRY123"
                    dir="ltr"
                  />
                )}
              </>
            )}

            {isParent && (
              <Input
                label={t('parentChildPhoneOrCodeOptional')}
                value={studentPhoneOrCode}
                onChange={(e) => setStudentPhoneOrCode(e.target.value)}
                placeholder={country === 'EG' ? '010XXXXXXXX / ABCD2345' : '94XXXXXX / ABCD2345'}
                dir="ltr"
              />
            )}

            {error && <ErrorBox error={error} />}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setError(null);
                  setStep(2);
                }}
                disabled={busy}
              >
                {t('previous')}
              </Button>
              <Button type="submit" className="flex-1" disabled={busy}>
                {busy ? t('loading') : t('completeRegistration')}
              </Button>
            </div>
            <p className="text-center text-xs text-ink-soft">
              {t('byRegisteringAgree')}{' '}
              <Link to="/terms" target="_blank" className="font-semibold text-primary underline">
                {t('termsOfService')}
              </Link>{' '}
              {t('and')}{' '}
              <Link to="/privacy" target="_blank" className="font-semibold text-primary underline">
                {t('privacyPolicy')}
              </Link>
            </p>
          </form>
        )}

        {step === 4 && (
          <div className="flex flex-col items-center gap-4 py-4 text-center" data-testid="wizard-step-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-primary">
              <CheckCircle2 size={36} />
            </div>
            <Badge tone="primary">
              <Sparkles size={14} className="inline me-1" />
              {currentRoleLabel}
            </Badge>
            <h1 className="text-2xl font-bold">
              {t('welcome')} {name}!
            </h1>
            <p className="text-base font-semibold text-ink">{t('wizardStep4Title')}</p>
            <p className="text-sm text-ink-soft">
              {isTeacher
                ? t('congratsTeacherSummary')
                : isParent
                  ? t('congratsParentSummary')
                  : t('congratsStudentSummary')}
            </p>
            <Button type="button" onClick={enterDashboard} className="w-full">
              {t('enterDashboard')}
            </Button>
          </div>
        )}

        {step < 4 && (
          <p className="mt-5 border-t border-line pt-4 text-center text-sm text-ink-soft">
            {t('alreadyHaveAccount')}{' '}
            <Link
              to="/login/$role"
              params={{ role: activeRole }}
              search={{ join: initialJoin, entry: initialEntry }}
              className="font-bold text-primary underline"
            >
              {t('login')}
            </Link>
          </p>
        )}

        <div className="mt-4 flex justify-center">
          <ReportProblemButton context={`register-${activeRole}-step-${step}`} />
        </div>
      </Card>
    </div>
  );
}

const validateRegisterSearch = (s: Record<string, unknown>): { join?: string; entry?: string } => ({
  join: typeof s.join === 'string' ? s.join : undefined,
  entry: typeof s.entry === 'string' ? s.entry : undefined,
});

export const registerIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  validateSearch: validateRegisterSearch,
  component: Register,
});

export const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register/$role',
  validateSearch: validateRegisterSearch,
  component: Register,
});
