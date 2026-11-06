import { useEffect, useState } from 'react';
import { Image, ScrollView, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, authApi, deleteUploadedObject, uploadFile } from '../api';
import { Btn, Card, ErrorBox, Loading, Text, c, f, s } from '../ui';
import TeacherLandingFields from './TeacherLandingFields';
import type { MeResponse as Me, PresignedUpload } from '../../../shared/api';

export default function Profile({ onBack, onLogout }: { onBack?: () => void; onLogout: () => void }) {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/api/me') });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Array<{ id: string; name: string }>>('/api/categories'),
    enabled: me.data?.user.role === 'TEACHER',
  });

  useEffect(() => {
    if (!me.data) return;
    setName(me.data.user.name);
    setPhone(me.data.user.phoneNumber ?? '');
  }, [me.data]);

  useEffect(() => {
    if (!me.data || !categories.data) return;
    const category = me.data.user.subjectCategoryId
      ? categories.data.find((item) => item.id === me.data?.user.subjectCategoryId)
      : null;
    setSubject(category?.name ?? '');
  }, [me.data?.user.subjectCategoryId, categories.data]);

  const save = useMutation({
    mutationFn: () =>
      api('/api/me', {
        method: 'PATCH',
        body: {
          name,
          phoneNumber: phone,
          ...(me.data?.user.role === 'TEACHER' && subject.trim()
            ? { subject: subject.trim() }
            : {}),
        },
      }),
    onSuccess: () => {
      setSaved(true);
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const pickAvatar = useMutation({
    mutationFn: async () => {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      const size = asset.fileSize ?? new File(asset.uri).size;
      if (!size) throw new Error('تعذر قراءة حجم الصورة.');
      if (size > 2 * 1024 * 1024) throw new Error('حجم الصورة يجب ألا يتجاوز 2 ميجابايت.');
      const mime = asset.mimeType ?? 'image/jpeg';
      const up = await api<PresignedUpload>('/api/storage/avatar', {
        body: {
          fileName: asset.fileName ?? 'avatar.jpg',
          mimeType: mime,
          fileSizeBytes: size,
        },
      });
      await uploadFile(up.uploadUrl, asset.uri, mime);
      try {
        await api('/api/me', { method: 'PATCH', body: { image: up.objectKey } });
      } catch (error) {
        await deleteUploadedObject(up.objectKey);
        throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const busy = save.isPending || pickAvatar.isPending || loggingOut;
  const error = me.error ?? save.error ?? pickAvatar.error;

  if (me.error) {
    return (
      <View style={s.page}>
        <ErrorBox error={me.error} />
        {onBack && <Btn label="رجوع" onPress={onBack} variant="ghost" />}
      </View>
    );
  }
  if (!me.data) return <Loading />;
  const data = me.data;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pageContent} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>حسابي</Text>
      <Card>
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          {data.avatarUrl ? (
            <Image
              source={{ uri: data.avatarUrl }}
              style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 10, borderWidth: 1, borderColor: c.line }}
            />
          ) : (
            <View style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primaryLight }}>
              <Text style={{ fontSize: 34, fontWeight: '700', color: c.primary }}>{data.user.name.slice(0, 1)}</Text>
            </View>
          )}
          {data.user.role !== 'PARENT' && (
            <>
              <Btn
                label="تغيير الصورة"
                variant="ghost"
                onPress={() => pickAvatar.mutate()}
                loading={pickAvatar.isPending}
                disabled={busy}
              />
              <Text style={{ color: c.inkSoft, fontSize: 12, marginTop: 4 }}>PNG/JPG · حتى 2 ميجابايت</Text>
            </>
          )}
        </View>
        <Text
          style={{
            color: c.inkSoft,
            marginBottom: 12,
            textAlign: 'center',
            fontFamily: f.latin,
            writingDirection: 'ltr',
          }}
        >
          {data.user.email || data.user.phoneNumber}
        </Text>
        <Text style={s.label}>الاسم</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={(v) => {
            setName(v);
            setSaved(false);
          }}
          editable={!busy}
        />
        <Text style={s.label}>الهاتف</Text>
        <TextInput
          style={s.input}
          value={phone}
          onChangeText={(v) => {
            setPhone(v);
            setSaved(false);
          }}
          keyboardType="phone-pad"
          editable={!busy}
        />
        {data.user.role === 'TEACHER' ? (
          <>
            <Text style={s.label}>التخصص</Text>
            <TextInput
              style={s.input}
              value={subject}
              onChangeText={(value) => {
                setSubject(value);
                setSaved(false);
              }}
              placeholder="مثال: الرياضيات"
              placeholderTextColor={c.inkSoft}
              editable={!busy}
            />
          </>
        ) : null}
        {saved && <Text style={{ color: c.primary, marginBottom: 8 }}>تم الحفظ ✓</Text>}
        {error && <ErrorBox error={error} />}
        <Btn
          label="حفظ"
          onPress={() => save.mutate()}
          loading={save.isPending}
          disabled={busy || !name.trim()}
        />
        {onBack && <Btn label="رجوع" onPress={onBack} variant="ghost" />}
        <Btn
          label="تسجيل الخروج"
          onPress={async () => {
            setLoggingOut(true);
            try {
              await authApi.logout();
            } finally {
              qc.clear();
              setLoggingOut(false);
              onLogout();
            }
          }}
          loading={loggingOut}
          variant="ghost"
        />
      </Card>
      {data.user.role === 'TEACHER' ? <TeacherLandingFields me={data} /> : null}
    </ScrollView>
  );
}
