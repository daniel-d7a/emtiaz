import { useEffect, useState } from 'react';
import { Alert, Share, Switch, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Empty, ErrorBox, Field, Loading, MiniBtn, Text, c, s } from '../ui';
import { InfoHint } from '../components/InfoHint';
import type { Group, TeacherGradebook, TeacherPacing } from '../../../shared/api';

export default function TeacherGroupSettings({ groupId }: { groupId: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [days, setDays] = useState('');
  const [time, setTime] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [requiresEntryCode, setRequiresEntryCode] = useState(true);
  const [columnTitle, setColumnTitle] = useState('');
  const pacing = useQuery({
    queryKey: ['teacher-pacing', groupId],
    queryFn: () => api<TeacherPacing>(`/api/teacher/groups/${groupId}/pacing`),
  });
  const gradebook = useQuery({
    queryKey: ['teacher-gradebook', groupId],
    queryFn: () => api<TeacherGradebook>(`/api/teacher/groups/${groupId}/gradebook`),
  });

  useEffect(() => {
    const group = pacing.data?.group;
    if (!group) return;
    setName(group.name);
    setDays(group.days ?? '');
    setTime(group.time ?? '');
    setJoinCode(group.joinCode);
    setWhatsappMessage(group.whatsappMessage ?? '');
    setIsActive(group.isActive);
    setRequiresEntryCode(group.requiresEntryCode);
  }, [pacing.data?.group]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['teacher-pacing', groupId] });
    void qc.invalidateQueries({ queryKey: ['teacher-courses'] });
    void qc.invalidateQueries({ queryKey: ['teacher-roster', groupId] });
  };
  const save = useMutation({
    mutationFn: () =>
      api<Group>(`/api/teacher/groups/${groupId}`, {
        method: 'PATCH',
        body: {
          name: name.trim(),
          days: days.trim() || null,
          time: time.trim() || null,
          joinCode: joinCode.trim(),
          whatsappMessage: whatsappMessage.trim() || null,
          isActive,
          requiresEntryCode,
        },
      }),
    onSuccess: invalidate,
  });
  const addColumn = useMutation({
    mutationFn: () =>
      api(`/api/teacher/groups/${groupId}/gradebook/columns`, {
        body: { title: columnTitle.trim() },
      }),
    onSuccess: () => {
      setColumnTitle('');
      void qc.invalidateQueries({ queryKey: ['teacher-gradebook', groupId] });
    },
  });
  const removeColumn = useMutation({
    mutationFn: (columnId: string) =>
      api(`/api/teacher/groups/${groupId}/gradebook/columns/${columnId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['teacher-gradebook', groupId] }),
  });

  if (pacing.error) return <ErrorBox error={pacing.error} />;
  if (!pacing.data) return <Loading />;

  return (
    <View>
      <Card>
        <Text style={s.h2}>إعدادات المجموعة</Text>
        <Field label="اسم المجموعة" value={name} onChange={setName} maxLength={120} />
        <Field label="الأيام" value={days} onChange={setDays} placeholder="مثال: الأحد والثلاثاء" maxLength={200} />
        <Field label="الوقت" value={time} onChange={setTime} placeholder="مثال: 5:00 مساءً" maxLength={120} />
        <Field label="رمز الانضمام" value={joinCode} onChange={setJoinCode} dir="ltr" maxLength={32} />
        <View style={[s.row, { paddingVertical: 6, marginBottom: 8 }]}>
          <Text style={{ fontWeight: '600' }}>المجموعة نشطة</Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: c.line, true: c.primary }}
            ios_backgroundColor={c.line}
          />
        </View>
        <View style={[s.row, { paddingVertical: 6, marginBottom: 8 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontWeight: '600' }}>يتطلب رمز دخول</Text>
            <InfoHint
              title="رمز المجموعة ورموز الدخول"
              steps={[
                {
                  title: '١. رمز المجموعة العام',
                  body: 'لكل مجموعة رمز انضمام ثابت يحدد المجموعة التي يريد الطالب التسجيل فيها.',
                },
                {
                  title: '٢. اشتراط رمز الدخول',
                  body: 'عند تفعيل هذا الخيار، لن يتمكن أي طالب جديد من الانضمام إلا إذا أدخل رمز دخول صالحاً بالإضافة لرمز المجموعة.',
                },
                {
                  title: '٣. رموز الدخول محدودة الاستخدام',
                  body: 'يمكنك توليد رموز دخول بعدد استخدامات محدد ومتابعة من استخدم كل رمز.',
                },
              ]}
            />
          </View>
          <Switch
            value={requiresEntryCode}
            onValueChange={setRequiresEntryCode}
            trackColor={{ false: c.line, true: c.primary }}
            ios_backgroundColor={c.line}
          />
        </View>
        <Field
          label="رسالة واتساب"
          value={whatsappMessage}
          onChange={setWhatsappMessage}
          multiline
          maxLength={500}
          placeholder="رسالة تُرسل مع رمز الانضمام"
        />
        <Text style={{ color: c.inkSoft, fontSize: 12, marginBottom: 8 }}>
          رمز الانضمام الحالي: {joinCode.trim() || '—'}
        </Text>
        <View style={[s.row, { marginBottom: 8 }]}>
          <Btn
            label="حفظ الإعدادات"
            onPress={() => save.mutate()}
            loading={save.isPending}
            disabled={!joinCode.trim()}
          />
          <Btn
            label="مشاركة الرمز"
            variant="ghost"
            onPress={() =>
              void Share.share({
                message: `${whatsappMessage.trim() || 'انضم إلى مجموعتنا'}\nرمز الانضمام: ${joinCode.trim()}`,
              })
            }
          />
        </View>
        {save.error && <ErrorBox error={save.error} />}
      </Card>

      <Card>
        <Text style={s.h2}>أعمدة الدرجات</Text>
        {gradebook.error && <ErrorBox error={gradebook.error} />}
        {gradebook.isLoading && <Loading />}
        {gradebook.data?.manualColumns.length === 0 && <Empty text="لا توجد أعمدة بعد" />}
        {gradebook.data?.manualColumns.map((column) => (
          <View
            key={column.id}
            style={[s.row, { paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }]}
          >
            <Text style={{ fontWeight: '600' }}>{column.title}</Text>
            <MiniBtn
              label="حذف"
              tone="danger"
              onPress={() =>
                Alert.alert('حذف العمود', `هل تريد حذف "${column.title}" وكل درجاته؟`, [
                  { text: 'إلغاء', style: 'cancel' },
                  {
                    text: 'حذف',
                    style: 'destructive',
                    onPress: () => removeColumn.mutate(column.id),
                  },
                ])
              }
            />
          </View>
        ))}
        <Field label="عمود جديد" value={columnTitle} onChange={setColumnTitle} maxLength={120} />
        <Btn
          label="إضافة عمود"
          onPress={() => addColumn.mutate()}
          loading={addColumn.isPending}
          disabled={!columnTitle.trim()}
        />
        {addColumn.error && <ErrorBox error={addColumn.error} />}
        {removeColumn.error && <ErrorBox error={removeColumn.error} />}
      </Card>
    </View>
  );
}
