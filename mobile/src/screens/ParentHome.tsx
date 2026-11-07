import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, parentApi } from '../api';
import { Btn, Card, Empty, ErrorBox, Field, Loading, Text, c, s } from '../ui';
import { InfoHint } from '../components/InfoHint';
import { OnboardingGuide } from '../components/OnboardingGuide';
import type { ParentChild as Child, ParentChildHomeworkDto, StudentGrades as Grades } from '../../../shared/api';

export default function ParentHome() {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [open, setOpen] = useState<string | null>(null);
  const children = useQuery({
    queryKey: ['parent-students'],
    queryFn: () => api<Child[]>('/api/parent/students'),
  });
  const link = useMutation({
    mutationFn: (overrideCode?: string) => {
      const target = (typeof overrideCode === 'string' ? overrideCode : code).trim().toUpperCase();
      return api('/api/parent/link', { body: { monitoringCode: target } });
    },
    onSuccess: () => {
      setCode('');
      setScanning(false);
      void qc.invalidateQueries({ queryKey: ['parent-students'] });
    },
  });
  const unlink = useMutation({
    mutationFn: (studentId: string) =>
      api(`/api/parent/students/${studentId}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['parent-students'] }),
  });

  const onBarcodeScanned = ({ data }: { data: string }) => {
    if (link.isPending) return;
    const raw = data.trim().toUpperCase();
    const match = raw.match(/[A-Z0-9]{8}/);
    const resolvedCode = match ? match[0] : raw;
    if (resolvedCode.length === 8) {
      setCode(resolvedCode);
      setScanning(false);
      link.mutate(resolvedCode);
    }
  };

  return (
    <ScrollView style={s.page} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>أبنائي</Text>
      <OnboardingGuide
        role="PARENT"
        completedSteps={[
          (children.data?.length ?? 0) > 0,
          Boolean(children.data?.some((child) => child.groups.length > 0 || child.reports.length > 0)),
        ]}
      />
      {scanning ? (
        <Card>
          <Text style={s.h2}>مسح رمز QR للطالب</Text>
          <Text style={{ color: c.inkSoft, marginBottom: 12 }}>
            وجّه الكاميرا نحو رمز QR الظاهر في ملف الطالب الشخصي.
          </Text>
          {!permission?.granted ? (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ marginBottom: 8 }}>نحتاج إذن الكاميرا لمسح الرمز.</Text>
              <Btn
                label={permission?.canAskAgain ? 'السماح بالكاميرا' : 'فعّل الكاميرا من إعدادات الهاتف'}
                onPress={() => void requestPermission()}
                disabled={!permission?.canAskAgain}
              />
            </View>
          ) : (
            <View style={{ height: 280, borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={onBarcodeScanned}
              />
            </View>
          )}
          <Btn label="إلغاء المسح" variant="ghost" onPress={() => setScanning(false)} />
        </Card>
      ) : (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={[s.h2, { marginBottom: 0 }]}>ربط حساب الطالب</Text>
            <InfoHint
              title="ربط حساب الابن برمز المتابعة"
              hint="افتح الملف الشخصي في حساب ابنك (الطالب) لنسخ رمز المتابعة المكون من ٨ خانات أو مسح رمز QR، ثم أدخله هنا لمتابعة حضوره ودرجاته."
            />
          </View>
          <Field
            label="رمز متابعة الطالب"
            value={code}
            onChange={(v) => setCode(v.toUpperCase())}
            dir="ltr"
            placeholder="مثال: ABCD2345"
            maxLength={8}
          />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Btn
                label="ربط الطالب"
                onPress={() => link.mutate()}
                disabled={code.trim().length !== 8}
                loading={link.isPending}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Btn
                label="مسح QR"
                variant="ghost"
                onPress={() => setScanning(true)}
              />
            </View>
          </View>
          {link.error && <ErrorBox error={link.error} />}
        </Card>
      )}
      {unlink.error && <ErrorBox error={unlink.error} />}
      {children.isLoading ? <Loading /> : children.error ? <ErrorBox error={children.error} /> : (
        <>
          {children.data?.map((child) => (
            <Card key={child.id}>
              <Text style={s.h2}>{child.name}</Text>
              <Text style={{ color: c.inkSoft, marginBottom: 8 }}>{child.email}</Text>
              <Btn
                label="فصل الطالب"
                variant="ghost"
                loading={unlink.isPending && unlink.variables === child.id}
                onPress={() =>
                  Alert.alert(
                    'فصل الطالب',
                    `هل تريد فصل ${child.name}؟ ستحتاج إلى ربطه مرة أخرى لعرض تقدمه.`,
                    [
                      { text: 'إلغاء', style: 'cancel' },
                      {
                        text: 'فصل',
                        style: 'destructive',
                        onPress: () => unlink.mutate(child.id),
                      },
                    ],
                  )
                }
              />
              {child.groups.map((g) => {
                const key = `${child.id}:${g.group.id}`;
                return (
                  <View key={key} style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 8, marginTop: 8 }}>
                    <Text style={{ fontWeight: '700' }}>{g.course.title}</Text>
                    <Text style={{ color: c.inkSoft, fontSize: 12 }}>
                      {g.group.name} · {g.teacher.name}
                    </Text>
                    <View style={s.progress}>
                      <View style={[s.progressFill, { width: `${Math.min(100, Math.max(0, g.progress))}%` }]} />
                    </View>
                    <Text style={{ color: c.inkSoft, fontSize: 12 }}>التقدم: {g.progress}%</Text>
                    <View style={[s.row, { justifyContent: 'flex-start', marginTop: 4 }]}>
                      <Text style={{ color: c.inkSoft, fontSize: 12 }}>
                        الحضور: {g.attendance.present}/{g.attendance.total} ({g.attendance.percent}%)
                      </Text>
                      <Text style={{ color: c.inkSoft, fontSize: 12 }}>المعدل: {g.averageGrade}%</Text>
                    </View>
                    <Btn
                      label={open === key ? 'إخفاء الدرجات' : 'عرض الدرجات'}
                      variant="ghost"
                      onPress={() => setOpen(open === key ? null : key)}
                    />
                    {open === key && <ChildGrades studentId={child.id} groupId={g.group.id} />}
                  </View>
                );
              })}
              {child.groups.length === 0 && <Empty text="لا مجموعات بعد" />}

              {/* Homework Section */}
              <View style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 12, marginTop: 12 }}>
                <Text style={[s.h2, { fontSize: 16 }]}>الواجبات المنزلية</Text>
                <ChildHomeworkList studentId={child.id} />
              </View>

              <Text style={[s.label, { marginTop: 12 }]}>التقارير المرسلة</Text>
              {child.reports.length === 0 ? (
                <Empty text="لا تقارير مرسلة بعد" />
              ) : (
                child.reports.map((report) => (
                  <View key={report.id} style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: 8, marginTop: 8 }}>
                    <Text style={{ color: c.inkSoft, fontSize: 12 }}>
                      {new Date(report.createdAt).toLocaleDateString('ar-OM')}
                    </Text>
                    <Text>{report.message}</Text>
                  </View>
                ))
              )}
            </Card>
          ))}
          {children.data?.length === 0 && <Empty text="اربط طالبًا برقم هاتفه لعرض تقدمه" />}
        </>
      )}
    </ScrollView>
  );
}

function ChildGrades({ studentId, groupId }: { studentId: string; groupId: string }) {
  const grades = useQuery({
    queryKey: ['parent-grades', studentId, groupId],
    queryFn: () => api<Grades>(`/api/parent/students/${studentId}/groups/${groupId}/grades`),
  });
  if (grades.isLoading) return <Loading />;
  if (grades.error) return <ErrorBox error={grades.error} />;
  if (!grades.data) return null;
  return (
    <View style={{ marginTop: 8 }}>
      {grades.data.quizzes.map((q) => (
        <Text key={q.quizId} style={{ marginBottom: 4 }}>
          {q.title}: {q.score}/{q.maxScore}
        </Text>
      ))}
      {grades.data.manual.map((m) => (
        <Text key={m.columnId} style={{ marginBottom: 4 }}>
          {m.title}: {m.score ?? '—'}/{m.maxScore}
        </Text>
      ))}
      {grades.data.quizzes.length + grades.data.manual.length === 0 && <Empty text="لا درجات بعد" />}
    </View>
  );
}

function ChildHomeworkList({ studentId }: { studentId: string }) {
  const homework = useQuery({
    queryKey: ['parent-homework', studentId],
    queryFn: () => parentApi.getChildHomework(studentId),
  });

  if (homework.isLoading) return <Loading />;
  if (homework.error) return <ErrorBox error={homework.error} />;
  if (!homework.data || homework.data.length === 0) {
    return <Empty text="لا توجد واجبات مسندة لهذا الطالب بعد" />;
  }

  return (
    <View style={{ marginTop: 4 }}>
      {homework.data.map((hw: ParentChildHomeworkDto) => {
        const sub = hw.submission;
        const isGraded = sub?.status === 'GRADED';
        const isRevisionRequested = sub?.status === 'REVISION_REQUESTED';
        return (
          <View
            key={hw.id}
            style={{
              backgroundColor: '#FAFAF9',
              borderColor: hw.isUrgent ? '#FECACA' : c.line,
              borderWidth: 1,
              borderRadius: 12,
              padding: 12,
              marginTop: 8,
            }}
          >
            {/* Urgent warning pill */}
            {hw.isUrgent && (
              <View
                style={{
                  backgroundColor: '#FEF2F2',
                  borderColor: '#FECACA',
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  alignSelf: 'flex-start',
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: '#B91C1C', fontSize: 12, fontWeight: '700' }}>
                  ⚠️ موعد التسليم قريب أو متأخر
                </Text>
              </View>
            )}

            {/* Group Name & Homework Title */}
            <Text style={{ color: c.inkSoft, fontSize: 11, marginBottom: 2 }}>{hw.groupName}</Text>
            <View style={[s.row, { alignItems: 'flex-start' }]}>
              <Text style={{ fontWeight: '700', fontSize: 15, flexShrink: 1, marginBottom: 4 }}>
                {hw.title}
              </Text>
              <Text style={{ color: c.inkSoft, fontSize: 12, fontWeight: '600' }}>
                {hw.maxScore} درجة
              </Text>
            </View>

            {/* Instructions */}
            {hw.instructions ? (
              <Text style={{ color: c.ink, fontSize: 13, lineHeight: 18, marginBottom: 6 }}>
                {hw.instructions}
              </Text>
            ) : null}

            {/* Status badge */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 }}>
              {!sub ? (
                <View
                  style={{
                    backgroundColor: '#F3F4F6',
                    borderColor: '#E5E7EB',
                    borderWidth: 1,
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#4B5563' }}>لم يسلم</Text>
                </View>
              ) : isGraded ? (
                <View
                  style={{
                    backgroundColor: '#DCFCE7',
                    borderColor: '#86EFAC',
                    borderWidth: 1,
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534' }}>
                    مكتمل ومصحح ({sub.score ?? 0}/{hw.maxScore})
                  </Text>
                </View>
              ) : isRevisionRequested ? (
                <View
                  style={{
                    backgroundColor: '#FEF2F2',
                    borderColor: '#FECACA',
                    borderWidth: 1,
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#B91C1C' }}>
                    مطلوب تعديل
                  </Text>
                </View>
              ) : sub.isLate ? (
                <View
                  style={{
                    backgroundColor: '#FFEDD5',
                    borderColor: '#FDBA74',
                    borderWidth: 1,
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#EA580C' }}>
                    تم التسليم (متأخر)
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    backgroundColor: '#CCFBF1',
                    borderColor: '#99F6E4',
                    borderWidth: 1,
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0F766E' }}>
                    تم التسليم
                  </Text>
                </View>
              )}
            </View>

            {/* Due date */}
            {hw.dueDate && (
              <Text style={{ color: c.inkSoft, fontSize: 12, marginTop: 4 }}>
                موعد التسليم:{' '}
                {new Date(hw.dueDate).toLocaleDateString('ar-OM', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}

            {/* Score if graded */}
            {isGraded && (
              <Text style={{ color: '#166534', fontWeight: '700', fontSize: 13, marginTop: 4 }}>
                الدرجة المحصلة: {sub.score ?? 0} من {hw.maxScore}
              </Text>
            )}

            {/* Teacher Feedback */}
            {sub?.teacherFeedback ? (
              <View
                style={{
                  backgroundColor: '#FFFBEB',
                  borderColor: '#FDE68A',
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 8,
                  marginTop: 6,
                }}
              >
                <Text style={{ fontWeight: '700', color: '#92400E', fontSize: 12, marginBottom: 2 }}>
                  ملاحظات المعلم:
                </Text>
                <Text style={{ color: '#78350F', fontSize: 13, lineHeight: 18 }}>
                  {sub.teacherFeedback}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
