import { useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  ApiError,
  authApi,
  onboardingApi,
  publicApi,
  type CategoryItem,
  type Country,
  type CourseType,
  type GradeItem,
} from '../api';
import { Btn, Card, Choice, ErrorBox, Field, Text, c, s } from '../ui';

type RoleSlug = 'teacher' | 'student' | 'parent';

export function ReportProblemMobileBtn({ context, user }: { context: string; user?: { name?: string; role?: string; phoneNumber?: string | null } | null }) {
  const { data: support } = useQuery({
    queryKey: ['public-support'],
    queryFn: () => publicApi.support(),
    staleTime: 60_000,
  });

  const openWhatsapp = () => {
    const raw = support?.supportWhatsapp || support?.whatsapp || '+96890000000';
    const digits = raw.replace(/\D/g, '');
    const lines = [
      'مرحباً إدارة منصة امتياز، أود الإبلاغ عن مشكلة أو إرسال ملاحظة:',
      `الشاشة: ${context}`,
      ...(user?.name ? [`المستخدم: ${user.name} (${user.role ?? ''})`] : []),
      ...(user?.phoneNumber ? [`الهاتف: ${user.phoneNumber}`] : []),
    ];
    void Linking.openURL(`https://wa.me/${digits}?text=${encodeURIComponent(lines.join('\n'))}`);
  };

  return (
    <Btn
      label="الإبلاغ عن مشكلة / اقتراح (واتساب)"
      variant="ghost"
      onPress={openWhatsapp}
    />
  );
}

export default function Login({ onIn }: { onIn: (user: any) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<RoleSlug>('teacher');

  // Login state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Multi-step register state
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [country, setCountry] = useState<Country>('OM');
  const [phone, setPhone] = useState('');
  const [courseFocus, setCourseFocus] = useState<CourseType>('ACADEMIC');
  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>([]);
  const [customGrade, setCustomGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [studentGradeId, setStudentGradeId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [entryCode, setEntryCode] = useState('');
  const [studentPhoneOrCode, setStudentPhoneOrCode] = useState('');
  const [createdSession, setCreatedSession] = useState<any>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';
  const isParent = role === 'parent';

  const { data: grades = [] } = useQuery<GradeItem[]>({
    queryKey: ['onboarding-grades', country],
    queryFn: () => onboardingApi.listGrades(country),
    enabled: mode === 'register' && (isTeacher || isStudent),
  });

  const { data: categories = [] } = useQuery<CategoryItem[]>({
    queryKey: ['onboarding-categories'],
    queryFn: () => onboardingApi.listCategories(),
    enabled: mode === 'register' && isTeacher,
  });

  const submitLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.login(identifier.trim(), password);
      onIn(res);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? new Error('رقم الهاتف أو كلمة المرور غير صحيحة.')
          : (e as Error),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleStep1 = async () => {
    setError(null);
    if (!name.trim()) {
      setError(new Error('يرجى إدخال الاسم الكامل.'));
      return;
    }
    if (regPassword.length < 8) {
      setError(new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل.'));
      return;
    }
    if (isTeacher && !regEmail.trim()) {
      setError(new Error('البريد الإلكتروني مطلوب للمعلم.'));
      return;
    }
    if (regEmail.trim()) {
      setBusy(true);
      try {
        const check = await onboardingApi.checkAvailability({ email: regEmail.trim() });
        if (!check.available) {
          setError(new Error('البريد الإلكتروني مسجل مسبقاً أو غير صالح.'));
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

  const handleStep2 = async () => {
    setError(null);
    if (!phone.trim()) {
      setError(new Error('يرجى إدخال رقم الهاتف.'));
      return;
    }
    setBusy(true);
    try {
      const check = await onboardingApi.checkAvailability({
        phoneNumber: phone.trim(),
        country,
      });
      if (!check.available) {
        setError(
          new Error(
            check.reason?.toLowerCase().includes('already')
              ? 'رقم الهاتف مسجل مسبقاً.'
              : 'رقم الهاتف غير صالح للدولة المختارة.',
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

  const handleStep3 = async () => {
    setError(null);
    setBusy(true);
    try {
      if (isTeacher) {
        const customGrades = customGrade.trim() ? [customGrade.trim()] : undefined;
        await onboardingApi.registerTeacher({
          name: name.trim(),
          email: regEmail.trim() || undefined,
          password: regPassword,
          phoneNumber: phone.trim(),
          country,
          courseFocus,
          gradeIds: courseFocus === 'ACADEMIC' ? selectedGradeIds : undefined,
          customGrades: courseFocus === 'ACADEMIC' ? customGrades : undefined,
          subject: subject.trim() || customGrade.trim() || undefined,
        });
      } else if (isParent) {
        const raw = studentPhoneOrCode.trim();
        const isCode = raw.length === 8 && !/^\d{8}$/.test(raw);
        await onboardingApi.registerParent({
          name: name.trim(),
          email: regEmail.trim() || undefined,
          password: regPassword,
          phoneNumber: phone.trim(),
          country,
          monitoringCode: isCode ? raw.toUpperCase() : undefined,
          studentPhone: raw && !isCode ? raw : undefined,
        });
      } else {
        await onboardingApi.registerStudent({
          name: name.trim(),
          password: regPassword,
          phoneNumber: phone.trim(),
          email: regEmail.trim() || undefined,
          country,
          gradeId: studentGradeId || undefined,
        });
      }

      const loginId = isTeacher && regEmail.trim() ? regEmail.trim() : phone.trim();
      const res = await authApi.login(loginId, regPassword, country);
      if (isStudent && joinCode.trim()) {
        try {
          await onboardingApi.joinByCode(joinCode.trim(), entryCode.trim() || undefined);
        } catch {
          // Join code can also be entered from student dashboard.
        }
      }
      setCreatedSession(res);
      setStep(4);
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  };

  const toggleGrade = (id: string) => {
    setSelectedGradeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={[s.pageContent, { flexGrow: 1, justifyContent: 'center' }]}
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <Text style={s.h1}>امتياز</Text>
        <Text style={{ color: c.inkSoft, marginBottom: 14 }}>
          منصة التعلّم للمعلمين والطلبة وأولياء الأمور في عُمان ومصر
        </Text>

        {step < 4 && (
          <Choice<RoleSlug>
            label="اختر نوع الحساب"
            value={role}
            onChange={(nextRole) => {
              setRole(nextRole);
              setError(null);
              setStep(1);
            }}
            options={[
              { value: 'teacher', label: 'المعلّم' },
              { value: 'student', label: 'الطالب' },
              { value: 'parent', label: 'وليّ الأمر' },
            ]}
          />
        )}

        {mode === 'login' ? (
          <Card>
            <Text style={s.h2}>
              تسجيل الدخول — {isTeacher ? 'المعلّم' : isParent ? 'وليّ الأمر' : 'الطالب'}
            </Text>
            <Field
              label="رقم الهاتف أو البريد الإلكتروني"
              value={identifier}
              onChange={setIdentifier}
              placeholder="+968… / +20…"
              dir="ltr"
            />
            <Field label="كلمة المرور" value={password} onChange={setPassword} secure />
            {error && <ErrorBox error={error} />}
            <Btn label="تسجيل الدخول" onPress={submitLogin} loading={busy} />
            <Btn
              label="إنشاء حساب جديد"
              variant="ghost"
              onPress={() => {
                setError(null);
                setStep(1);
                setMode('register');
              }}
            />
          </Card>
        ) : (
          <Card>
            {step < 4 && (
              <Text style={{ color: c.primary, fontWeight: '700', marginBottom: 8 }}>
                الخطوة {step} من 3 — {isTeacher ? 'المعلّم' : isParent ? 'وليّ الأمر' : 'الطالب'}
              </Text>
            )}

            {step === 1 && (
              <>
                <Text style={s.h2}>بيانات الحساب</Text>
                <Field label="الاسم الكامل" value={name} onChange={setName} />
                <Field
                  label={isTeacher ? 'البريد الإلكتروني' : 'البريد الإلكتروني (اختياري)'}
                  value={regEmail}
                  onChange={setRegEmail}
                  dir="ltr"
                />
                <Field label="كلمة المرور (8 أحرف على الأقل)" value={regPassword} onChange={setRegPassword} secure />
                {error && <ErrorBox error={error} />}
                <Btn label="التالي" onPress={handleStep1} loading={busy} />
              </>
            )}

            {step === 2 && (
              <>
                <Text style={s.h2}>الدولة ورقم الهاتف</Text>
                <Choice<Country>
                  label="الدولة"
                  value={country}
                  onChange={(nextCountry) => {
                    setCountry(nextCountry);
                    setSelectedGradeIds([]);
                    setStudentGradeId('');
                  }}
                  options={[
                    { value: 'OM', label: 'سلطنة عُمان (+968)' },
                    { value: 'EG', label: 'مصر (+20)' },
                  ]}
                />
                <Field
                  label="رقم الهاتف"
                  value={phone}
                  onChange={setPhone}
                  placeholder={country === 'EG' ? '010XXXXXXXX' : '94XXXXXX'}
                  dir="ltr"
                />
                {error && <ErrorBox error={error} />}
                <Btn label="التالي" onPress={handleStep2} loading={busy} />
                <Btn label="السابق" variant="ghost" onPress={() => setStep(1)} disabled={busy} />
              </>
            )}

            {step === 3 && (
              <>
                <Text style={s.h2}>
                  {isTeacher
                    ? 'تركيز التدريس والصفوف'
                    : isParent
                      ? 'ربط حساب الابن (اختياري)'
                      : 'الصف الدراسي والانضمام لمجموعة'}
                </Text>

                {isTeacher && (
                  <>
                    <Choice<CourseType>
                      label="تركيز التدريس"
                      value={courseFocus}
                      onChange={setCourseFocus}
                      options={[
                        { value: 'ACADEMIC', label: 'مقررات أكاديمية (مناهج)' },
                        { value: 'GENERAL', label: 'مقررات عامة / مهارات' },
                      ]}
                    />
                    {courseFocus === 'ACADEMIC' ? (
                      <>
                        <Text style={s.label}>اختر الصفوف التي تدرّسها</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                          {grades.map((g) => {
                            const selected = selectedGradeIds.includes(g.id);
                            return (
                              <Pressable
                                key={g.id}
                                onPress={() => toggleGrade(g.id)}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 8,
                                  borderRadius: 10,
                                  borderWidth: 1,
                                  borderColor: selected ? c.primary : c.line,
                                  backgroundColor: selected ? c.primaryLight : c.card,
                                }}
                              >
                                <Text style={{ color: selected ? c.primaryDark : c.ink, fontSize: 12, fontWeight: '600' }}>
                                  {g.nameAr || g.name}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                        <Field label="صف مخصص (اختياري)" value={customGrade} onChange={setCustomGrade} />
                        <Field label="المادة الدراسية" value={subject} onChange={setSubject} />
                      </>
                    ) : (
                      <>
                        <Text style={s.label}>اختر المسار العام أو اكتب تخصصك</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                          {categories.slice(0, 12).map((cat) => {
                            const val = cat.nameEn || cat.name;
                            const selected = subject === val;
                            return (
                              <Pressable
                                key={cat.id}
                                onPress={() => setSubject(val)}
                                style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 8,
                                  borderRadius: 10,
                                  borderWidth: 1,
                                  borderColor: selected ? c.primary : c.line,
                                  backgroundColor: selected ? c.primaryLight : c.card,
                                }}
                              >
                                <Text style={{ color: selected ? c.primaryDark : c.ink, fontSize: 12, fontWeight: '600' }}>
                                  {cat.nameAr || cat.name}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                        <Field label="المسار / التخصص" value={subject} onChange={setSubject} />
                      </>
                    )}
                  </>
                )}

                {isStudent && (
                  <>
                    <Text style={s.label}>الصف الدراسي (اختياري)</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {grades.map((g) => {
                        const selected = studentGradeId === g.id;
                        return (
                          <Pressable
                            key={g.id}
                            onPress={() => setStudentGradeId(selected ? '' : g.id)}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 8,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: selected ? c.primary : c.line,
                              backgroundColor: selected ? c.primaryLight : c.card,
                            }}
                          >
                            <Text style={{ color: selected ? c.primaryDark : c.ink, fontSize: 12, fontWeight: '600' }}>
                              {g.nameAr || g.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <Field
                      label="رمز الانضمام للمجموعة (اختياري)"
                      value={joinCode}
                      onChange={setJoinCode}
                      placeholder="OM123456"
                      dir="ltr"
                    />
                    {joinCode.trim() ? (
                      <Field
                        label="رمز الدخول الإضافي (إن طُلب)"
                        value={entryCode}
                        onChange={setEntryCode}
                        placeholder="ENTRY123"
                        dir="ltr"
                      />
                    ) : null}
                  </>
                )}

                {isParent && (
                  <Field
                    label="رقم هاتف الطالب أو رمز المتابعة (اختياري)"
                    value={studentPhoneOrCode}
                    onChange={setStudentPhoneOrCode}
                    placeholder="94XXXXXX / ABCD2345"
                    dir="ltr"
                  />
                )}

                {error && <ErrorBox error={error} />}
                <Btn label="إكمال التسجيل" onPress={handleStep3} loading={busy} />
                <Btn label="السابق" variant="ghost" onPress={() => setStep(2)} disabled={busy} />
              </>
            )}

            {step === 4 && (
              <>
                <Text style={s.h2}>تهانينا {name}! تم إنشاء حسابك بنجاح 🎉</Text>
                <Text style={{ color: c.inkSoft, marginBottom: 14 }}>
                  {isTeacher
                    ? 'تم تجهيز استوديو المعلم الخاص بك على الخطة المجانية.'
                    : isParent
                      ? 'تم تفعيل حساب ولي الأمر لمتابعة أبنائك.'
                      : 'تم تفعيل حسابك كطالب، يمكنك الآن البدء بالدراسة.'}
                </Text>
                <Btn
                  label="الدخول إلى لوحة التحكم"
                  onPress={() => createdSession && onIn(createdSession)}
                />
              </>
            )}

            {step < 4 && (
              <Btn
                label="لديك حساب بالفعل؟ تسجيل الدخول"
                variant="ghost"
                onPress={() => {
                  setError(null);
                  setMode('login');
                }}
              />
            )}
          </Card>
        )}

        <View style={{ marginTop: 12 }}>
          <ReportProblemMobileBtn context={`mobile-${mode}-${role}-step-${step}`} />
        </View>
      </View>
    </ScrollView>
  );
}
