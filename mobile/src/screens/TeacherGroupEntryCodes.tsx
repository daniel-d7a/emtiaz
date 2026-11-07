import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Empty, ErrorBox, Field, Loading, Text, c, s } from '../ui';
import { InfoHint } from '../components/InfoHint';
import type { TeacherEntryCodes } from '../../../shared/api';

export default function TeacherGroupEntryCodes({ groupId }: { groupId: string }) {
  const qc = useQueryClient();
  const [maxUses, setMaxUses] = useState('10');
  const codes = useQuery({
    queryKey: ['teacher-entry-codes', groupId],
    queryFn: () => api<TeacherEntryCodes>(`/api/teacher/groups/${groupId}/entry-codes`),
  });
  const create = useMutation({
    mutationFn: () =>
      api(`/api/teacher/groups/${groupId}/entry-codes`, {
        body: { maxUses: Number(maxUses) },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['teacher-entry-codes', groupId] });
    },
  });

  if (codes.error) return <ErrorBox error={codes.error} />;
  if (!codes.data) return <Loading />;

  return (
    <View>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Text style={[s.h2, { marginBottom: 0 }]}>رموز الدخول</Text>
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
        <Text style={{ color: c.inkSoft, marginBottom: 8 }}>
          يُستهلك الرمز عند انضمام طالب جديد فقط.
        </Text>
        <Field
          label="الحد الأقصى للاستخدامات"
          value={maxUses}
          onChange={setMaxUses}
          keyboardType="number-pad"
          dir="ltr"
        />
        <Btn
          label="إنشاء رمز"
          onPress={() => create.mutate()}
          disabled={Number(maxUses) < 1}
          loading={create.isPending}
        />
        {create.error && <ErrorBox error={create.error} />}
      </Card>

      {codes.data.codes.length === 0 ? (
        <Empty text="لا توجد رموز دخول بعد." />
      ) : (
        codes.data.codes.map((code) => (
          <Card key={code.id}>
            <View style={[s.row, { alignItems: 'flex-start' }]}>
              <Text style={{ fontSize: 20, fontWeight: '700', letterSpacing: 2 }}>{code.code}</Text>
              <Text style={{ color: code.usedUp ? c.danger : c.primary, fontWeight: '700' }}>
                {code.usedUp ? 'مستنفد' : 'متاح'}
              </Text>
            </View>
            <Text style={{ color: c.inkSoft, marginTop: 4 }}>
              الاستخدامات: {code.usedCount} من {code.maxUses}
            </Text>
            {code.uses.map((use) => (
              <Text key={use.studentId} style={{ color: c.inkSoft, marginTop: 4 }}>
                {use.name}
              </Text>
            ))}
          </Card>
        ))
      )}
    </View>
  );
}
