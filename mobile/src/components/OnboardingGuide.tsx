import { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Card, MiniBtn, Text, c, s } from '../ui';
import type { MeResponse } from '../../../shared/api';

const seenTourUsers = new Set<string>();

export type OnboardingGuideProps = {
  role: 'TEACHER' | 'STUDENT' | 'PARENT';
  completedSteps?: boolean[];
  onPrimaryAction?: () => void;
};

export function OnboardingGuide({
  role,
  completedSteps = [],
  onPrimaryAction,
}: OnboardingGuideProps) {
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api<MeResponse>('/api/me'),
  });
  const [collapsed, setCollapsed] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const userId = me.data?.user?.id;
  const onboardingCompletedAt =
    me.data?.onboardingCompletedAt ?? me.data?.user?.onboardingCompletedAt ?? null;

  const completeTour = useMutation({
    mutationFn: () =>
      api('/api/me', {
        method: 'PATCH',
        body: { onboardingCompleted: true },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
  });

  useEffect(() => {
    if (!userId) return;
    if (onboardingCompletedAt) return;
    if (seenTourUsers.has(userId)) return;
    setStepIndex(0);
    setTourOpen(true);
  }, [userId, onboardingCompletedAt]);

  const handleCloseTour = () => {
    setTourOpen(false);
    if (userId) seenTourUsers.add(userId);
    if (userId && !onboardingCompletedAt && !completeTour.isPending) {
      completeTour.mutate();
    }
  };

  const tourTitle =
    role === 'TEACHER'
      ? 'مرحباً بك في استوديو المعلم'
      : role === 'STUDENT'
        ? 'مرحباً بك في منصة امتياز'
        : 'مرحباً بك في بوابة ولي الأمر';

  const tourSteps =
    role === 'TEACHER'
      ? [
          {
            title: '١. أنشئ مقررك الرئيسي',
            body: 'ابدأ بإنشاء المقرر وإضافة الوحدات والدروس والملفات والاختبارات القصيرة في مكان واحد.',
          },
          {
            title: '٢. أنشئ مجموعة (دفعة طلاب)',
            body: 'افتح المقرر وأنشئ مجموعة لتحديد المواعيد وجدولة فتح الدروس وتسجيل الحضور والدرجات.',
          },
          {
            title: '٣. شارك رمز الانضمام ورموز الدخول',
            body: 'انسخ رابط المجموعة أو ولّد رموز دخول محدودة الاستخدام وشاركها مع طلابك عبر واتساب.',
          },
        ]
      : role === 'STUDENT'
        ? [
            {
              title: '١. احصل على رمز المجموعة من معلمك',
              body: 'اطلب من معلمك رمز المجموعة (ورمز الدخول الإضافي إن كان مطلوباً).',
            },
            {
              title: '٢. انضم إلى مجموعتك بضغطة واحدة',
              body: 'أدخل الرمز في بطاقة «رمز مجموعة» في لوحتك الرئيسية لتظهر دروسك فوراً.',
            },
            {
              title: '٣. ادرس الدروس وحل الاختبارات',
              body: 'تصفح الوحدات، حمّل الملخصات، وأكمل الاختبارات القصيرة لمتابعة تقدمك ومعدلك.',
            },
          ]
        : [
            {
              title: '١. احصل على رمز متابعة الطالب',
              body: 'ستجد رمز المتابعة المكون من ٨ خانات (ورمز QR) داخل صفحة «الملف الشخصي» في حساب ابنك الطالب.',
            },
            {
              title: '٢. اربط حساب ابنك',
              body: 'أدخل رمز المتابعة في الحقل المخصص أعلى الصفحة أو امسح رمز QR لربط حساب ابنك فوراً.',
            },
            {
              title: '٣. تابع الحضور والدرجات والتقارير',
              body: 'اطلع في أي وقت على نسبة حضور ابنك، درجاته في الاختبارات، والتقارير الشهرية المرسلة من المعلمين.',
            },
          ];

  const checklistItems: Array<{ label: string; done: boolean }> =
    role === 'TEACHER'
      ? [
          { label: 'إنشاء مقررك الدراسي الأول وإضافة الوحدات والدروس', done: Boolean(completedSteps[0]) },
          { label: 'إنشاء مجموعة (شعبة) لطلابك داخل المقرر', done: Boolean(completedSteps[1]) },
          { label: 'توليد رموز الدخول ومشاركة رابط المجموعة عبر واتساب', done: Boolean(completedSteps[2]) },
        ]
      : role === 'STUDENT'
        ? [
            { label: 'اطلب رمز المجموعة (ورمز الدخول) من معلمك', done: Boolean(completedSteps[0]) },
            { label: 'انضم إلى مجموعتك الدراسية من لوحة التحكم', done: Boolean(completedSteps[1]) },
            { label: 'افتح دروسك وأكمل الاختبارات القصيرة', done: Boolean(completedSteps[2]) },
          ]
        : [
            { label: 'ربط حساب ابنك الطالب باستخدام رمز المتابعة', done: Boolean(completedSteps[0]) },
            { label: 'متابعة الحضور والدرجات والتقارير الشهرية', done: Boolean(completedSteps[1]) },
          ];

  const doneCount = checklistItems.filter((item) => item.done).length;
  const allDone = doneCount === checklistItems.length;
  const currentTourStep = tourSteps[stepIndex] ?? tourSteps[0];
  const isLastStep = stepIndex >= tourSteps.length - 1;

  return (
    <>
      {!allDone && (
      <Card>
        <View style={s.row}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 16, color: c.primaryDark }}>
              كيف أبدأ؟
            </Text>
            <Text style={s.badge}>
              {doneCount}/{checklistItems.length}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <MiniBtn
              label="دليل المنصة"
              tone="ghost"
              onPress={() => {
                setStepIndex(0);
                setTourOpen(true);
              }}
            />
            <MiniBtn
              label={collapsed ? 'عرض' : 'إخفاء'}
              tone="ghost"
              onPress={() => setCollapsed((v) => !v)}
            />
          </View>
        </View>

        {!collapsed && (
          <View style={{ marginTop: 10, gap: 8 }}>
            {checklistItems.map((item, idx) => (
              <View
                key={idx}
                style={[
                  s.row,
                  {
                    backgroundColor: c.background,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: c.line,
                    padding: 10,
                  },
                ]}
              >
                <Text
                  style={{
                    flexShrink: 1,
                    fontWeight: '600',
                    color: item.done ? c.inkSoft : c.ink,
                    textDecorationLine: item.done ? 'line-through' : 'none',
                  }}
                >
                  {item.done ? '✓ ' : `${idx + 1}. `}
                  {item.label}
                </Text>
                {idx === 0 && !item.done && onPrimaryAction ? (
                  <MiniBtn label="ابدأ" tone="primary" onPress={onPrimaryAction} />
                ) : null}
              </View>
            ))}
          </View>
        )}
      </Card>
      )}

      <Modal
        visible={tourOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCloseTour}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(28, 25, 23, 0.45)',
            justifyContent: 'center',
            padding: 20,
            direction: 'rtl',
          }}
        >
          <View style={[s.card, { marginBottom: 0 }]}>
            <Text style={[s.h2, { color: c.primaryDark }]}>{tourTitle}</Text>
            <View
              style={{
                backgroundColor: c.background,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.line,
                padding: 12,
                marginTop: 4,
                marginBottom: 14,
              }}
            >
              <Text style={{ fontWeight: '700', fontSize: 15, marginBottom: 4 }}>
                {currentTourStep.title}
              </Text>
              <Text style={{ color: c.inkSoft, fontSize: 14, lineHeight: 22 }}>
                {currentTourStep.body}
              </Text>
            </View>

            <View style={s.row}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {tourSteps.map((_, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => setStepIndex(idx)}
                    style={{
                      width: idx === stepIndex ? 18 : 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: idx === stepIndex ? c.primary : c.line,
                    }}
                  />
                ))}
                <Text style={{ color: c.inkSoft, fontSize: 12, fontWeight: '700' }}>
                  {stepIndex + 1} / {tourSteps.length}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                {stepIndex > 0 ? (
                  <MiniBtn
                    label="السابق"
                    tone="ghost"
                    onPress={() => setStepIndex((i) => Math.max(0, i - 1))}
                  />
                ) : null}
                {!isLastStep ? (
                  <MiniBtn
                    label="التالي"
                    tone="primary"
                    onPress={() => setStepIndex((i) => Math.min(tourSteps.length - 1, i + 1))}
                  />
                ) : (
                  <MiniBtn label="حسناً" tone="primary" onPress={handleCloseTour} />
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
