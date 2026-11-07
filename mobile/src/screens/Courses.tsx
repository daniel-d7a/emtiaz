import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Empty, ErrorBox, Loading, Text, c, s } from '../ui';
import { InfoHint } from '../components/InfoHint';
import { OnboardingGuide } from '../components/OnboardingGuide';
import type { StudentGroup as Group, StudentHome } from '../../../shared/api';

export default function Courses({
  onOpen,
  onBrowse,
  onScan,
}: {
  onOpen: (groupId: string) => void;
  onBrowse: () => void;
  onScan: () => void;
}) {
  const qc = useQueryClient();
  const [joinCode, setJoin] = useState('');
  const [entryCode, setEntry] = useState('');
  const home = useQuery({
    queryKey: ['student-home'],
    queryFn: () => api<StudentHome>('/api/student/home'),
  });
  const groups = useQuery({
    queryKey: ['student-groups'],
    queryFn: () => api<Group[]>('/api/student/groups'),
  });
  const join = useMutation({
    mutationFn: () =>
      api('/api/student/groups/join', {
        body: {
          joinCode: joinCode.trim(),
          entryCode: entryCode.trim() || undefined,
        },
      }),
    onSuccess: () => {
      setJoin('');
      setEntry('');
      void qc.invalidateQueries({ queryKey: ['student-groups'] });
      void qc.invalidateQueries({ queryKey: ['student-home'] });
    },
  });

  const error = home.error ?? groups.error;
  if (error) return <View style={s.page}><ErrorBox error={error} /></View>;
  if (!home.data || !groups.data) return <Loading />;

  const stats = home.data.stats;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pageContent} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>الرئيسية</Text>
      <OnboardingGuide
        role="STUDENT"
        completedSteps={[
          stats.activeGroups > 0,
          stats.activeGroups > 0,
          stats.lessonsDone > 0,
        ]}
      />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'المجموعات', value: stats.activeGroups },
          { label: 'دروس مكتملة', value: stats.lessonsDone },
          { label: 'المعدل', value: `${stats.averageGrade}%` },
        ].map((item) => (
          <View key={item.label} style={[s.card, { flex: 1, marginBottom: 0, padding: 12 }]}>
            <Text style={{ color: c.inkSoft, fontSize: 12 }}>{item.label}</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: c.primaryDark }}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={[s.row, { marginBottom: 8 }]}>
        <Text style={s.h2}>أحدث المقررات</Text>
        <Btn label="تصفح المقررات" variant="ghost" onPress={onBrowse} />
      </View>
      {home.data.latestCourses.length === 0 && <Empty text="لا توجد مجموعات بعد" />}
      {home.data.latestCourses.map((g) => (
        <Card key={g.group.id}>
          <Text style={s.h2}>{g.course.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <Text style={{ color: c.inkSoft }}>
              {g.group.name} · {g.teacher.name}
            </Text>
            {g.teacher.isTopTeacher && (
              <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A' }}>
                <Text style={{ color: '#D97706', fontSize: 10, fontWeight: '700' }}>⭐ معلّم متميّز</Text>
              </View>
            )}
          </View>
          <View style={s.progress}>
            <View
              style={[s.progressFill, { width: `${Math.min(100, Math.max(0, g.progress))}%` }]}
            />
          </View>
          <Text style={{ color: c.inkSoft, fontSize: 12 }}>التقدم: {Math.round(g.progress)}%</Text>
          <Btn label="افتح" onPress={() => onOpen(g.group.id)} />
        </Card>
      ))}

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Text style={[s.h2, { marginBottom: 0 }]}>رمز مجموعة</Text>
          <InfoHint
            title="كيف تنضم إلى مجموعة معلمك؟"
            steps={[
              {
                title: '١. اطلب رمز المجموعة من معلمك',
                body: 'يرسل لك المعلم رمز المجموعة (مثل OM123456) أو رابط انضمام مباشر عبر واتساب.',
              },
              {
                title: '٢. أدخل رمز الدخول الإضافي (إن طُلب)',
                body: 'إذا كانت المجموعة مقفلة برمز دخول، سيُزودك المعلم برمز دخول مكون من ٨ خانات لإدخاله في الحقل الثاني.',
              },
              {
                title: '٣. ابدأ الدراسة وحل الاختبارات',
                body: 'بمجرد الانضمام ستظهر المجموعة في لوحتك لفتح الدروس، تحميل المرفقات، وحل الاختبارات القصيرة.',
              },
            ]}
          />
        </View>
        <Text style={{ color: c.inkSoft, marginBottom: 8 }}>مثال OM123456</Text>
        <TextInput
          style={s.input}
          value={joinCode}
          onChangeText={setJoin}
          placeholder="OM… "
          autoCapitalize="characters"
          placeholderTextColor={c.inkSoft}
        />
        <TextInput
          style={s.input}
          value={entryCode}
          onChangeText={setEntry}
          placeholder="رمز الدخول (إن وجد)"
          autoCapitalize="characters"
          placeholderTextColor={c.inkSoft}
          maxLength={8}
        />
        {join.error && <ErrorBox error={join.error} />}
        <Btn
          label="انضم"
          onPress={() => joinCode.trim() && join.mutate()}
          disabled={!joinCode.trim()}
          loading={join.isPending}
        />
        <Btn label="مسح رمز QR" variant="ghost" onPress={onScan} />
      </Card>

      <Text style={s.h2}>مقرراتي</Text>
      {groups.data.length === 0 && <Empty text="لا توجد مجموعات بعد" />}
      {groups.data.map((g) => (
        <Card key={g.group.id}>
          <Text style={s.h2}>{g.course.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <Text style={{ color: c.inkSoft }}>
              {g.group.name} · {g.teacher.name}
            </Text>
            {g.teacher.isTopTeacher && (
              <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A' }}>
                <Text style={{ color: '#D97706', fontSize: 10, fontWeight: '700' }}>⭐ معلّم متميّز</Text>
              </View>
            )}
          </View>
          <View style={s.progress}>
            <View
              style={[s.progressFill, { width: `${Math.min(100, Math.max(0, g.progress))}%` }]}
            />
          </View>
          <Text style={{ color: c.inkSoft, fontSize: 12 }}>التقدم: {Math.round(g.progress)}%</Text>
          <Btn label="افتح" onPress={() => onOpen(g.group.id)} />
        </Card>
      ))}
    </ScrollView>
  );
}
