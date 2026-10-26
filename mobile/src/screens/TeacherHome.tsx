import { ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Empty, ErrorBox, Loading, s } from '../ui';
import type { TeacherCourse as Course } from '../../../shared/api';

export default function TeacherHome({
  onOpenGroup,
  onProfile,
}: {
  onOpenGroup: (groupId: string) => void;
  onProfile: () => void;
}) {
  const courses = useQuery({
    queryKey: ['teacher-courses'],
    queryFn: () => api<Course[]>('/api/teacher/courses'),
  });

  if (courses.error) return <View style={s.page}><ErrorBox error={courses.error} /></View>;
  if (!courses.data) return <Loading />;

  return (
    <ScrollView style={s.page}>
      <View style={s.row}>
        <Text style={s.h1}>مجموعاتي</Text>
        <Btn label="حسابي" onPress={onProfile} variant="ghost" />
      </View>
      {courses.data.length === 0 && <Empty text="لا توجد مقررات بعد" />}
      {courses.data.map((course) => (
        <Card key={course.id}>
          <Text style={s.h2}>{course.title}</Text>
          <Text style={{ color: '#78716C', fontSize: 13 }}>
            {course.analytics.students} طالب · {course.analytics.lessons} درس · تقدم {course.analytics.avgProgress}%
          </Text>
          {course.groups.length === 0 && <Text style={{ color: '#78716C' }}>لا توجد مجموعات</Text>}
          {course.groups.map((g) => (
            <View key={g.id} style={s.row}>
              <View>
                <Text style={{ fontWeight: '700' }}>{g.name}</Text>
                <Text style={{ color: '#78716C', fontSize: 13 }}>{g.joinCode} · {g.studentCount} طالب</Text>
              </View>
              <Btn label="فتح" onPress={() => onOpenGroup(g.id)} variant="ghost" />
            </View>
          ))}
        </Card>
      ))}
    </ScrollView>
  );
}
