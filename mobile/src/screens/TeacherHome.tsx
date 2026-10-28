import { ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Empty, ErrorBox, Loading, Text, c, s } from '../ui';
import type { TeacherCourse as Course } from '../../../shared/api';

export default function TeacherHome({
  onOpenGroup,
}: {
  onOpenGroup: (groupId: string) => void;
}) {
  const courses = useQuery({
    queryKey: ['teacher-courses'],
    queryFn: () => api<Course[]>('/api/teacher/courses'),
  });

  if (courses.error) return <View style={s.page}><ErrorBox error={courses.error} /></View>;
  if (!courses.data) return <Loading />;

  return (
    <ScrollView style={s.page}>
      <Text style={s.h1}>مجموعاتي</Text>
      {courses.data.length === 0 && <Empty text="لا توجد مقررات بعد" />}
      {courses.data.map((course) => (
        <Card key={course.id}>
          <Text style={s.h2}>{course.title}</Text>
          <Text style={{ color: c.inkSoft, fontSize: 13 }}>
            {course.analytics.students} طالب · {course.analytics.lessons} درس · تقدم {course.analytics.avgProgress}%
          </Text>
          {course.groups.length === 0 && <Text style={{ color: c.inkSoft, marginTop: 8 }}>لا توجد مجموعات</Text>}
          {course.groups.map((g) => (
            <Card key={g.id}>
              <Text style={{ fontWeight: '700' }}>{g.name}</Text>
              <Text style={{ color: c.inkSoft, fontSize: 13, marginBottom: 8 }}>
                {g.joinCode} · {g.studentCount} طالب
              </Text>
              <Btn label="فتح" onPress={() => onOpenGroup(g.id)} variant="ghost" />
            </Card>
          ))}
        </Card>
      ))}
    </ScrollView>
  );
}
