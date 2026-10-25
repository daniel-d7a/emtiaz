import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { api } from './api';
import { Btn, Card, Empty, ErrorBox, Loading, s } from './ui';

type Group = { id: string; name: string; joinCode: string };
type Course = { id: string; title: string; groups: Group[] };

export default function TeacherHome({
  onOpenGroup,
  onProfile,
}: {
  onOpenGroup: (groupId: string) => void;
  onProfile: () => void;
}) {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    api('/api/teacher/courses').then(setCourses).catch(setError);
  }, []);

  if (error) return <View style={s.page}><ErrorBox error={error} /></View>;
  if (!courses) return <Loading />;

  return (
    <ScrollView style={s.page}>
      <View style={s.row}>
        <Text style={s.h1}>مجموعاتي</Text>
        <Btn label="حسابي" onPress={onProfile} variant="ghost" />
      </View>
      {courses.length === 0 && <Empty text="لا توجد مقررات بعد" />}
      {courses.map((course) => (
        <Card key={course.id}>
          <Text style={s.h2}>{course.title}</Text>
          {course.groups.length === 0 && <Text style={{ color: '#78716C' }}>لا توجد مجموعات</Text>}
          {course.groups.map((g) => (
            <View key={g.id} style={s.row}>
              <View>
                <Text style={{ fontWeight: '700' }}>{g.name}</Text>
                <Text style={{ color: '#78716C', fontSize: 13 }}>{g.joinCode}</Text>
              </View>
              <Btn label="فتح" onPress={() => onOpenGroup(g.id)} variant="ghost" />
            </View>
          ))}
        </Card>
      ))}
    </ScrollView>
  );
}
