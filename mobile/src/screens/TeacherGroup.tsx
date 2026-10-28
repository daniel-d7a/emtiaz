import { useState } from 'react';
import { Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, uploadFile } from '../api';
import { Btn, Card, Empty, ErrorBox, Loading, Text, c, s } from '../ui';
import type { PresignedUpload, TeacherPacing as Pacing, TeacherRoster as Roster } from '../../../shared/api';

export default function TeacherGroup({ groupId, onBack }: { groupId: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [announceMsg, setAnnounceMsg] = useState('');
  const [materialLesson, setMaterialLesson] = useState<string | null>(null);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialBusy, setMaterialBusy] = useState(false);
  const [materialMsg, setMaterialMsg] = useState('');
  const [materialError, setMaterialError] = useState<Error | null>(null);
  const pacing = useQuery({
    queryKey: ['teacher-pacing', groupId],
    queryFn: () => api<Pacing>(`/api/teacher/groups/${groupId}/pacing`),
  });
  const roster = useQuery({
    queryKey: ['teacher-roster', groupId],
    queryFn: () => api<Roster>(`/api/teacher/groups/${groupId}/roster`),
  });
  const toggle = useMutation({
    mutationFn: (v: { lessonId: string; isUnlocked: boolean }) =>
      api(`/api/teacher/groups/${groupId}/lessons/${v.lessonId}/access`, {
        method: 'PATCH',
        body: { isUnlocked: v.isUnlocked },
      }),
    onMutate: (v) => setBusyId(v.lessonId),
    onSettled: () => {
      setBusyId(null);
      void qc.invalidateQueries({ queryKey: ['teacher-pacing', groupId] });
    },
  });

  const announce = useMutation({
    mutationFn: () =>
      api<{ sent: number }>(`/api/teacher/groups/${groupId}/announce`, {
        method: 'POST',
        body: { message: announcement },
      }),
    onSuccess: (res) => {
      setAnnouncement('');
      setAnnounceMsg(`تم إرسال الإعلان إلى ${res.sent} طالب`);
    },
  });

  const uploadMaterial = async () => {
    if (!materialLesson || !pacing.data) return;
    setMaterialError(null);
    setMaterialMsg('');
    try {
      const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      const fileSizeBytes = asset.size ?? new File(asset.uri).size ?? 0;
      if (!fileSizeBytes) throw new Error('تعذر قراءة حجم الملف.');
      if (fileSizeBytes > 100 * 1024 * 1024) throw new Error('حجم الملف يجب ألا يتجاوز 100 ميجابايت.');
      setMaterialBusy(true);
      const mimeType = asset.mimeType ?? 'application/octet-stream';
      const up = await api<PresignedUpload>('/api/storage/presigned-upload', {
        body: {
          courseId: pacing.data.group.courseId,
          lessonId: materialLesson,
          fileName: asset.name,
          mimeType,
          fileSizeBytes,
        },
      });
      await uploadFile(up.uploadUrl, asset.uri, mimeType);
      await api('/api/storage/attachments', {
        body: {
          lessonId: materialLesson,
          title: materialTitle.trim() || asset.name,
          objectKey: up.objectKey,
          mimeType,
          fileSizeBytes,
        },
      });
      setMaterialTitle('');
      setMaterialMsg('تمت إضافة المادة.');
    } catch (error) {
      setMaterialError(error as Error);
    } finally {
      setMaterialBusy(false);
    }
  };

  const error = pacing.error ?? roster.error ?? toggle.error ?? announce.error;
  if (error) {
    return (
      <View style={s.page}>
        <ErrorBox error={error} />
        <Btn label="رجوع" onPress={onBack} variant="ghost" />
      </View>
    );
  }
  if (!pacing.data) return <Loading />;

  return (
    <ScrollView style={s.page} keyboardShouldPersistTaps="handled">
      <Btn label="رجوع" variant="ghost" onPress={onBack} />
      <Text style={s.h1}>{pacing.data.group.name}</Text>
      <Text style={{ color: c.inkSoft, marginBottom: 12 }}>
        رمز المجموعة: {pacing.data.group.joinCode}
      </Text>
      <Card>
        <Text style={s.h2}>إعلان للمجموعة</Text>
        <TextInput
          value={announcement}
          onChangeText={(v) => {
            setAnnouncement(v);
            setAnnounceMsg('');
          }}
          placeholder="اكتب رسالة للطلاب..."
          placeholderTextColor={c.inkSoft}
          multiline
          style={[s.input, { minHeight: 88, textAlignVertical: 'top' }]}
        />
        {announceMsg ? <Text style={{ color: c.primary, marginBottom: 4 }}>{announceMsg}</Text> : null}
        <Btn
          label="إرسال"
          onPress={() => announce.mutate()}
          loading={announce.isPending}
          disabled={!announcement.trim()}
        />
      </Card>
      <Card>
        <Text style={s.h2}>إضافة مادة</Text>
        <Text style={s.label}>اختر الدرس</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {pacing.data.lessons.map((l) => {
            const selected = materialLesson === l.id;
            return (
              <Pressable
                key={l.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setMaterialLesson(l.id)}
                style={{
                  minHeight: 44,
                  justifyContent: 'center',
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: selected ? c.primary : c.line,
                  backgroundColor: selected ? c.primaryLight : c.card,
                }}
              >
                <Text style={{ color: selected ? c.primaryDark : c.ink, fontWeight: '600' }}>
                  {l.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {pacing.data.lessons.length === 0 && <Empty text="لا توجد دروس بعد" />}
        <Text style={s.label}>عنوان المادة (اختياري)</Text>
        <TextInput
          value={materialTitle}
          onChangeText={setMaterialTitle}
          placeholder="مثال: ملزمة الوحدة الأولى"
          placeholderTextColor={c.inkSoft}
          style={s.input}
        />
        {materialError && <ErrorBox error={materialError} />}
        {materialMsg ? <Text style={{ color: c.primary, marginBottom: 4 }}>{materialMsg}</Text> : null}
        <Btn
          label="اختيار ملف ورفعه"
          onPress={uploadMaterial}
          loading={materialBusy}
          disabled={!materialLesson || pacing.data.lessons.length === 0}
        />
      </Card>
      <Card>
        <Text style={s.h2}>فتح الدروس</Text>
        {pacing.data.lessons.length === 0 && <Empty text="لا توجد دروس بعد" />}
        {pacing.data.lessons.map((l) => (
          <View key={l.id} style={[s.row, { paddingVertical: 6 }]}>
            <View style={{ flexShrink: 1 }}>
              <Text style={{ fontWeight: '600' }}>{l.title}</Text>
              <Text style={{ color: c.inkSoft, fontSize: 12 }}>
                {l.unlocked ? 'مفتوح' : 'مقفل'}
                {l.overridden ? ' · تخصيص للمجموعة' : ''}
              </Text>
            </View>
            <Switch
              value={l.unlocked}
              disabled={busyId === l.id}
              onValueChange={(v) => toggle.mutate({ lessonId: l.id, isUnlocked: v })}
              trackColor={{ false: c.line, true: c.primary }}
              ios_backgroundColor={c.line}
            />
          </View>
        ))}
      </Card>
      <Card>
        <Text style={s.h2}>الطلاب ({roster.data?.students.length ?? 0})</Text>
        {roster.data?.students.length === 0 && <Empty text="لا يوجد طلاب بعد" />}
        {roster.data?.students.map((st) => (
          <View key={st.studentId} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.line }}>
            <Text style={{ fontWeight: '600' }}>{st.name}</Text>
            <Text style={{ color: c.inkSoft, fontSize: 13 }}>
              {st.progress}% ({st.completedLessons}/{st.totalLessons}) · {st.phoneNumber ?? '—'}
            </Text>
          </View>
        ))}
      </Card>
      <Btn label="رجوع" onPress={onBack} variant="ghost" />
    </ScrollView>
  );
}
