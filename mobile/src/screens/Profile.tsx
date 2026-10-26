import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, authApi } from '../api';
import { Btn, Card, ErrorBox, Loading, c, s } from '../ui';
import type { MeResponse as Me, PresignedUpload } from '../../../shared/api';

export default function Profile({ onBack, onLogout, onNotifications }: { onBack: () => void; onLogout: () => void; onNotifications?: () => void }) {
  const qc = useQueryClient();
  const [version, setVersion] = useState(0);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/api/me') });

  useEffect(() => {
    if (!me.data) return;
    setName(me.data.user.name);
    setPhone(me.data.user.phoneNumber ?? '');
  }, [me.data]);

  const save = useMutation({
    mutationFn: () => api('/api/me', { method: 'PATCH', body: { name, phoneNumber: phone } }),
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
      const mime = asset.mimeType ?? 'image/jpeg';
      const blob = await (await fetch(asset.uri)).blob();
      const up = await api<PresignedUpload>('/api/storage/avatar', {
        body: {
          fileName: asset.fileName ?? 'avatar.jpg',
          mimeType: mime,
          fileSizeBytes: asset.fileSize ?? blob.size,
        },
      });
      const put = await fetch(up.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mime },
        body: blob,
      });
      if (!put.ok) throw new Error(`Upload failed: ${put.status}`);
      await api('/api/me', { method: 'PATCH', body: { image: up.objectKey } });
    },
    onSuccess: () => {
      setVersion(Date.now());
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const busy = save.isPending || pickAvatar.isPending;
  const error = me.error ?? save.error ?? pickAvatar.error;

  if (me.error) return <View style={s.page}><ErrorBox error={me.error} /><Btn label="رجوع" onPress={onBack} variant="ghost" /></View>;
  if (!me.data) return <Loading />;
  const data = me.data;

  return (
    <ScrollView style={s.page}>
      <Text style={s.h1}>حسابي</Text>
      <Card>
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          {data.avatarUrl ? (
            <Image
              source={{ uri: `${data.avatarUrl}&v=${version}` }}
              style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 10, borderWidth: 1, borderColor: c.line }}
            />
          ) : (
            <View style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primaryLight }}>
              <Text style={{ fontSize: 34, fontWeight: '700', color: c.primary }}>{data.user.name.slice(0, 1)}</Text>
            </View>
          )}
          <Pressable accessibilityRole="button" onPress={() => pickAvatar.mutate()} disabled={busy}>
            <Text style={{ color: c.primary, fontWeight: '700' }}>{pickAvatar.isPending ? '…' : 'تغيير الصورة'}</Text>
          </Pressable>
          <Text style={{ color: c.inkSoft, fontSize: 12, marginTop: 4 }}>PNG/JPG · حتى 2 ميجابايت</Text>
        </View>
        <Text style={{ color: c.inkSoft, marginBottom: 12, textAlign: 'center' }}>{data.user.email || data.user.phoneNumber}</Text>
        <Text style={s.label}>الاسم</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} />
        <Text style={s.label}>الهاتف</Text>
        <TextInput style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        {saved && <Text style={{ color: c.primary, marginBottom: 8 }}>تم الحفظ ✓</Text>}
        {error && <ErrorBox error={error} />}
        <Btn label={save.isPending ? '…' : 'حفظ'} onPress={() => save.mutate()} disabled={busy || !name.trim()} />
        {onNotifications && <Btn label="الإشعارات" onPress={onNotifications} variant="ghost" />}
        <Btn label="رجوع" onPress={onBack} variant="ghost" />
        <Btn label="تسجيل الخروج" onPress={async () => { await authApi.logout(); qc.clear(); onLogout(); }} variant="ghost" />
      </Card>
    </ScrollView>
  );
}
