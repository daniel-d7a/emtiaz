import { Image, Pressable, ScrollView, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Empty, ErrorBox, Loading, Text, c, s } from '../ui';
import { InfoHint } from '../components/InfoHint';
import { OnboardingGuide } from '../components/OnboardingGuide';
import type { MeResponse, TeacherCourse, TeacherStats } from '../../../shared/api';

export default function TeacherHome({
  onOpenCourse,
  onOpenCurriculum,
  onOpenGroup,
  onNewCourse,
}: {
  onOpenCourse: (courseId: string) => void;
  onOpenCurriculum: (courseId: string) => void;
  onOpenGroup: (groupId: string) => void;
  onNewCourse: () => void;
}) {
  const qc = useQueryClient();
  const courses = useQuery({
    queryKey: ['teacher-courses'],
    queryFn: () => api<TeacherCourse[]>('/api/teacher/courses'),
  });
  const stats = useQuery({
    queryKey: ['teacher-stats'],
    queryFn: () => api<TeacherStats>('/api/teacher/stats'),
  });
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<MeResponse>('/api/me') });
  const publish = useMutation({
    mutationFn: (course: TeacherCourse) =>
      api(`/api/teacher/courses/${course.id}`, {
        method: 'PATCH',
        body: { isPublished: !course.isPublished },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['teacher-courses'] });
      void qc.invalidateQueries({ queryKey: ['teacher-stats'] });
    },
  });

  const error = courses.error ?? stats.error ?? me.error;
  if (error) return <View style={s.page}><ErrorBox error={error} /></View>;
  if (!courses.data) return <Loading />;

  const sections = (['ACADEMIC', 'GENERAL'] as const).map((type) => ({
    type,
    title: type === 'ACADEMIC' ? 'المقررات الدراسية' : 'الدورات العامة',
    courses: courses.data.filter((course) => course.courseType === type),
  }));

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pageContent}>
      {me.data?.bannerUrl ? (
        <Image
          source={{ uri: me.data.bannerUrl }}
          style={{ width: '100%', height: 128, borderRadius: 16, marginBottom: 12 }}
        />
      ) : null}
      <Text style={s.h1}>مساحتي</Text>
      <OnboardingGuide
        role="TEACHER"
        completedSteps={[
          (stats.data?.curricula ?? 0) > 0,
          (stats.data?.groups ?? 0) > 0,
          (stats.data?.uniqueStudents ?? 0) > 0,
        ]}
        onPrimaryAction={onNewCourse}
      />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'المناهج', value: stats.data?.curricula ?? 0 },
          { label: 'المجموعات', value: stats.data?.groups ?? 0 },
          { label: 'الطلاب', value: stats.data?.uniqueStudents ?? 0 },
        ].map((item) => (
          <View key={item.label} style={[s.card, { flex: 1, marginBottom: 0, padding: 12 }]}>
            <Text style={{ color: c.inkSoft, fontSize: 12 }}>{item.label}</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: c.primaryDark }}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={[s.row, { marginBottom: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[s.h2, { marginBottom: 0 }]}>المقررات</Text>
          <InfoHint
            title="المقررات مقابل المجموعات"
            steps={[
              {
                title: '١. المقرر الرئيسي',
                body: 'المقرر يحتوي على المنهج الكامل من وحدات ودروس ومواد واختبارات، وتبنيه مرة واحدة فقط.',
              },
              {
                title: '٢. المجموعات (دفعات الطلاب)',
                body: 'داخل كل مقرر يمكنك إنشاء عدة مجموعات بمواعيد ورموز انضمام مستقلة لكل شعبة أو دفعة.',
              },
              {
                title: '٣. تحكم مستقل لكل مجموعة',
                body: 'كل مجموعة لها جدولة محتوى وسجل حضور ودرجات خاص بها دون تكرار رفع الدروس.',
              },
            ]}
          />
        </View>
        <Btn label="مقرر جديد" onPress={onNewCourse} />
      </View>

      {courses.data.length === 0 && <Empty text="لا توجد مقررات بعد" />}
      {publish.error && <ErrorBox error={publish.error} />}
      {sections.map((section) => (
        <View key={section.type} style={{ marginBottom: 16 }}>
          <Text style={[s.label, { fontSize: 14 }]}>{section.title}</Text>
          {section.courses.length === 0 ? (
            <Text style={{ color: c.inkSoft, paddingVertical: 8 }}>لا توجد مقررات في هذا القسم</Text>
          ) : (
            section.courses.map((course) => (
              <Card key={course.id}>
                {course.imageUrl ? (
                  <Image
                    source={{ uri: course.imageUrl }}
                    style={{ width: '100%', height: 120, borderRadius: 12, marginBottom: 10 }}
                  />
                ) : null}
                <View style={[s.row, { alignItems: 'flex-start' }]}>
                  <Text style={[s.h2, { flexShrink: 1, marginBottom: 0 }]}>{course.title}</Text>
                  <Text style={s.badge}>
                    {course.courseType === 'ACADEMIC' ? 'دراسي' : 'عام'} ·{' '}
                    {course.isPublished ? 'منشور' : 'موقوف'}
                  </Text>
                </View>
                <Text style={{ color: c.inkSoft, fontSize: 13, marginTop: 6 }}>
                  {course.analytics.groups} مجموعة · {course.analytics.students} طالب ·{' '}
                  {course.analytics.lessons} درس · تقدم {course.analytics.avgProgress}%
                </Text>
                <Text style={{ color: c.inkSoft, fontSize: 13, marginTop: 4 }}>
                  آخر درس: {course.latestLesson?.title ?? 'لا يوجد'}
                </Text>
                <View style={[s.row, { marginTop: 8 }]}>
                  <Btn
                    label="فتح"
                    variant="ghost"
                    onPress={() => onOpenCourse(course.id)}
                  />
                  <Btn
                    label="المنهج"
                    variant="ghost"
                    onPress={() => onOpenCurriculum(course.id)}
                  />
                  <Btn
                    label={course.isPublished ? 'إيقاف' : 'نشر'}
                    variant="ghost"
                    onPress={() => publish.mutate(course)}
                    loading={publish.isPending}
                  />
                </View>
                {course.groups.length === 0 ? (
                  <Text style={{ color: c.inkSoft, marginTop: 8 }}>لا توجد مجموعات</Text>
                ) : (
                  <View style={{ marginTop: 8 }}>
                    {course.groups.map((group) => (
                      <Pressable
                        key={group.id}
                        onPress={() => onOpenGroup(group.id)}
                        style={{
                          paddingVertical: 8,
                          borderTopWidth: 1,
                          borderTopColor: c.line,
                        }}
                      >
                        <Text style={{ fontWeight: '600' }}>{group.name}</Text>
                        <Text style={{ color: c.inkSoft, fontSize: 12 }}>
                          {group.joinCode} · {group.studentCount} طالب · تقدم {group.progress}%
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </Card>
            ))
          )}
        </View>
      ))}
    </ScrollView>
  );
}
