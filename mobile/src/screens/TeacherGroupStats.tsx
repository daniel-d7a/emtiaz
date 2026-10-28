import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Card, Empty, ErrorBox, Loading, Text, c, s } from '../ui';
import type { TeacherGroupStats } from '../../../shared/api';

function Bar({ value }: { value: number | null }) {
  const width = Math.max(0, Math.min(100, value ?? 0));
  return (
    <View style={s.progress}>
      <View style={[s.progressFill, { width: `${width}%` }]} />
    </View>
  );
}

export default function TeacherGroupStats({ groupId }: { groupId: string }) {
  const stats = useQuery({
    queryKey: ['teacher-group-stats', groupId],
    queryFn: () => api<TeacherGroupStats>(`/api/teacher/groups/${groupId}/stats`),
  });

  if (stats.error) return <ErrorBox error={stats.error} />;
  if (!stats.data) return <Loading />;
  const data = stats.data;
  const students = [...data.students].sort((a, b) => b.combined - a.combined);
  const hasAttendance = data.attendance.some((row) => row.present > 0);

  return (
    <View>
      <Card>
        <Text style={{ color: c.inkSoft, fontSize: 13 }}>تاريخ البداية</Text>
        <Text style={{ fontWeight: '700', fontSize: 18 }}>{data.startDate.slice(0, 10)}</Text>
      </Card>
      <Card>
        <View style={[s.row, { alignItems: 'flex-start' }]}>
          <Text style={{ fontWeight: '600' }}>الدروس المنجزة</Text>
          <Text style={{ fontWeight: '700' }}>
            {data.lessons.taken}/{data.lessons.total} ({data.lessons.percent}%)
          </Text>
        </View>
        <Bar value={data.lessons.percent} />
      </Card>
      <Card>
        <View style={[s.row, { alignItems: 'flex-start' }]}>
          <Text style={{ fontWeight: '600' }}>الوحدات المنجزة</Text>
          <Text style={{ fontWeight: '700' }}>
            {data.units.taken}/{data.units.total} ({data.units.percent}%)
          </Text>
        </View>
        <Bar value={data.units.percent} />
      </Card>

      <Card>
        <Text style={s.h2}>الحضور حسب الدرس</Text>
        {!hasAttendance && <Empty text="لا يوجد حضور مسجل بعد" />}
        {hasAttendance && data.attendance.map((row) => (
          <View
            key={row.lessonId}
            style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.line }}
          >
            <View style={[s.row, { alignItems: 'flex-start' }]}>
              <View style={{ flexShrink: 1 }}>
                <Text style={{ fontWeight: '600' }}>{row.title}</Text>
                <Text style={{ color: c.inkSoft, fontSize: 11 }}>{row.moduleTitle}</Text>
              </View>
              <Text style={{ fontWeight: '700' }}>
                {row.present}/{row.total} ({row.percent}%)
              </Text>
            </View>
            <Bar value={row.percent} />
          </View>
        ))}
      </Card>

      <Card>
        <Text style={s.h2}>متوسطات الاختبارات</Text>
        {data.quizAverages.length === 0 && <Empty text="لا توجد اختبارات بعد" />}
        {data.quizAverages.map((quiz) => (
          <View
            key={quiz.quizId}
            style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.line }}
          >
            <View style={[s.row, { alignItems: 'flex-start' }]}>
              <View style={{ flexShrink: 1 }}>
                <Text style={{ fontWeight: '600' }}>{quiz.title}</Text>
                <Text style={{ color: c.inkSoft, fontSize: 11 }}>
                  {quiz.contextTitle} · {quiz.attempts} محاولة
                </Text>
              </View>
              <Text style={{ fontWeight: '700' }}>
                {quiz.average === null ? '—' : `${quiz.average}%`}
              </Text>
            </View>
            <Bar value={quiz.average} />
          </View>
        ))}
      </Card>

      {students.length === 0 ? (
        <Card>
          <Empty text="لا يوجد طلاب بعد" />
        </Card>
      ) : (
        <>
          <Card>
            <Text style={s.h2}>الأوائل</Text>
            {students.slice(0, 3).map((student, index) => (
              <View
                key={student.id}
                style={[s.row, { paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }]}
              >
                <Text style={{ fontWeight: '700', color: index === 0 ? c.primary : c.ink }}>
                  {index + 1}. {student.name}
                </Text>
                <Text style={{ fontWeight: '700' }}>{student.combined}%</Text>
              </View>
            ))}
          </Card>
          <Card>
            <Text style={s.h2}>إجماليات الطلاب</Text>
            {students.map((student) => (
              <View
                key={student.id}
                style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }}
              >
                <Text style={{ fontWeight: '600', marginBottom: 4 }}>{student.name}</Text>
                <Text style={{ color: c.inkSoft, fontSize: 12 }}>
                  الدرجات: {student.gradePercent === null ? '—' : `${student.gradePercent}%`} ·
                  الحضور: {student.attendancePercent}% · الإجمالي: {student.combined}%
                </Text>
              </View>
            ))}
          </Card>
        </>
      )}
    </View>
  );
}
