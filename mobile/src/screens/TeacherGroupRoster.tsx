import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Choice, Empty, ErrorBox, Field, Loading, MiniBtn, Text, c, s } from '../ui';
import type {
  StudentSearchResult,
  TeacherCourse,
  TeacherRoster,
} from '../../../shared/api';

export default function TeacherGroupRoster({ groupId }: { groupId: string }) {
  const qc = useQueryClient();
  const [phone, setPhone] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [bulk, setBulk] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [announceMessage, setAnnounceMessage] = useState('');
  const [moveTarget, setMoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [moveTo, setMoveTo] = useState('');
  const roster = useQuery({
    queryKey: ['teacher-roster', groupId],
    queryFn: () => api<TeacherRoster>(`/api/teacher/groups/${groupId}/roster`),
  });
  const courses = useQuery({
    queryKey: ['teacher-courses'],
    queryFn: () => api<TeacherCourse[]>('/api/teacher/courses'),
  });
  const search = useQuery({
    queryKey: ['teacher-student-search', searchPhone],
    queryFn: () =>
      api<StudentSearchResult[]>(
        `/api/teacher/students/search?phone=${encodeURIComponent(searchPhone)}`,
      ),
    enabled: searchPhone.replace(/\D/g, '').length >= 4,
  });
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['teacher-roster', groupId] });
    void qc.invalidateQueries({ queryKey: ['teacher-courses'] });
    void qc.invalidateQueries({ queryKey: ['teacher-stats'] });
  };
  const addStudent = useMutation({
    mutationFn: (student: StudentSearchResult) =>
      api(`/api/teacher/groups/${groupId}/roster/bulk`, {
        body: {
          students: [{ name: student.name, phoneNumber: student.phoneNumber ?? '' }],
        },
      }),
    onSuccess: () => {
      setPhone('');
      setSearchPhone('');
      invalidate();
    },
  });
  const addBulk = useMutation({
    mutationFn: () =>
      api<Array<{ created: boolean; enrolled: boolean }>>(
        `/api/teacher/groups/${groupId}/roster/bulk`,
        {
          body: {
            students: bulk
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [name, phoneNumber] = line.split(/[,\t]/).map((part) => part.trim());
                return { name, phoneNumber };
              })
              .filter((student) => student.name && student.phoneNumber),
          },
        },
      ),
    onSuccess: (result) => {
      setBulk('');
      setBulkMessage(
        `تم تسجيل ${result.filter((item) => item.enrolled).length} طالب، منهم ${result.filter((item) => item.created).length} جديد`,
      );
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: (studentId: string) =>
      api(`/api/teacher/groups/${groupId}/students/${studentId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
  const move = useMutation({
    mutationFn: () =>
      api(`/api/teacher/groups/${groupId}/students/${moveTarget?.id}/move`, {
        body: { toGroupId: moveTo },
      }),
    onSuccess: () => {
      setMoveTarget(null);
      setMoveTo('');
      invalidate();
    },
  });
  const announce = useMutation({
    mutationFn: () =>
      api<{ sent: number }>(`/api/teacher/groups/${groupId}/announce`, {
        body: { message: announcement.trim() },
      }),
    onSuccess: (result) => {
      setAnnouncement('');
      setAnnounceMessage(`تم إرسال الإعلان إلى ${result.sent} طالب`);
    },
  });

  if (roster.error || courses.error) {
    return <ErrorBox error={roster.error ?? courses.error} />;
  }
  if (!roster.data) return <Loading />;
  const data = roster.data;
  const siblingGroups =
    courses.data
      ?.find((course) => course.id === data.group.courseId)
      ?.groups.filter((group) => group.id !== groupId) ?? [];
  const enrolled = new Set(data.students.map((student) => student.studentId));
  const error =
    addStudent.error ??
    addBulk.error ??
    remove.error ??
    move.error ??
    announce.error ??
    search.error;

  return (
    <View>
      <Card>
        <Text style={s.h2}>إعلان للمجموعة</Text>
        <Field
          label="الرسالة"
          value={announcement}
          onChange={(value) => {
            setAnnouncement(value);
            setAnnounceMessage('');
          }}
          multiline
          maxLength={1000}
        />
        {announceMessage ? (
          <Text style={{ color: c.primary, marginBottom: 8 }}>{announceMessage}</Text>
        ) : null}
        <Btn
          label="إرسال الإعلان"
          onPress={() => announce.mutate()}
          loading={announce.isPending}
          disabled={!announcement.trim()}
        />
      </Card>

      <Card>
        <Text style={s.h2}>إضافة طالب</Text>
        <Field
          label="ابحث برقم الهاتف"
          value={phone}
          onChange={setPhone}
          keyboardType="phone-pad"
          dir="ltr"
          placeholder="9xxx xxxx"
        />
        <Btn
          label="بحث"
          variant="ghost"
          onPress={() => setSearchPhone(phone.trim())}
          disabled={phone.replace(/\D/g, '').length < 4}
        />
        <Text style={{ color: c.inkSoft, fontSize: 12, marginBottom: 8 }}>
          ابحث برقم هاتف الطالب المسجل في المنصة.
        </Text>
        {search.isLoading ? <Loading /> : null}
        {search.data?.length === 0 ? <Empty text="لا توجد نتائج" /> : null}
        {search.data?.map((student) => (
          <View
            key={student.id}
            style={[s.row, { paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }]}
          >
            <View style={{ flexShrink: 1 }}>
              <Text style={{ fontWeight: '600' }}>{student.name}</Text>
              <Text style={{ color: c.inkSoft, fontSize: 12 }}>{student.phoneNumber}</Text>
            </View>
            <MiniBtn
              label={enrolled.has(student.id) ? 'مسجل' : student.phoneNumber ? 'إضافة' : 'بدون هاتف'}
              disabled={enrolled.has(student.id) || !student.phoneNumber || addStudent.isPending}
              onPress={() => addStudent.mutate(student)}
            />
          </View>
        ))}
      </Card>

      <Card>
        <Text style={s.h2}>الطلاب ({data.students.length})</Text>
        {data.students.length === 0 && <Empty text="لا يوجد طلاب بعد" />}
        {data.students.map((student) => (
          <View
            key={student.studentId}
            style={[s.row, { paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }]}
          >
            <View style={{ flexShrink: 1 }}>
              <Text style={{ fontWeight: '600' }}>{student.name}</Text>
              <Text style={{ color: c.inkSoft, fontSize: 12 }}>
                {student.phoneNumber ?? 'بدون هاتف'} · {student.progress}% (
                {student.completedLessons}/{student.totalLessons})
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {siblingGroups.length > 0 ? (
                <MiniBtn
                  label="نقل"
                  onPress={() => {
                    setMoveTarget({ id: student.studentId, name: student.name });
                    setMoveTo('');
                  }}
                />
              ) : null}
              <MiniBtn
                label="إزالة"
                tone="danger"
                onPress={() =>
                  Alert.alert(
                    'إلغاء الوصول',
                    `هل تريد إزالة "${student.name}" من المجموعة؟`,
                    [
                      { text: 'إلغاء', style: 'cancel' },
                      {
                        text: 'إزالة',
                        style: 'destructive',
                        onPress: () => remove.mutate(student.studentId),
                      },
                    ],
                  )
                }
              />
            </View>
          </View>
        ))}
      </Card>

      {moveTarget ? (
        <Card>
          <Text style={s.h2}>نقل {moveTarget.name}</Text>
          <Choice
            label="إلى مجموعة"
            value={moveTo}
            onChange={setMoveTo}
            options={siblingGroups.map((group) => ({ value: group.id, label: group.name }))}
          />
          <View style={[s.row, { marginBottom: 8 }]}>
            <Btn
              label="نقل"
              onPress={() => move.mutate()}
              loading={move.isPending}
              disabled={!moveTo}
            />
            <Btn
              label="إلغاء"
              variant="ghost"
              onPress={() => {
                setMoveTarget(null);
                setMoveTo('');
              }}
            />
          </View>
        </Card>
      ) : null}

      <Card>
        <Text style={s.h2}>إضافة جماعية</Text>
        <Field
          label="كل سطر: الاسم، رقم الهاتف"
          value={bulk}
          onChange={(value) => {
            setBulk(value);
            setBulkMessage('');
          }}
          multiline
          placeholder={'علي سالم، 91234567\nفاطمة سالم، 92345678'}
        />
        {bulkMessage ? <Text style={{ color: c.primary, marginBottom: 8 }}>{bulkMessage}</Text> : null}
        <Btn
          label="إضافة الطلاب"
          onPress={() => addBulk.mutate()}
          loading={addBulk.isPending}
          disabled={!bulk.trim()}
        />
      </Card>

      {error && <ErrorBox error={error} />}
    </View>
  );
}
