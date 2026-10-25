import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api, authApi } from './api';
import { Btn, Card, ErrorBox, Loading, c, s } from './ui';

type Me = {
  user: { id: string; name: string; email: string; phoneNumber?: string | null; image?: string | null };
  avatarUrl: string | null;
};

export default function Profile({ onBack, onLogout }: { onBack: () => void; onLogout: () => void }) {
  const [me, setMe] = useState<Me | null>(null);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);

  const load = () => {
    api<Me>('/api/me').then((data) => {
      setMe(data);
      setName(data.user.name);
      setPhone(data.user.phoneNumber ?? '');
    }).catch(setError);
  };

  useEffect(() => {
    load();
  }, []);

  if (!me) return <Loading />;

  const pickAvatar = async () => {
    setBusy(true);
    setError(null);
    try {
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
      const up = await api<{ objectKey: string; uploadUrl: string }>('/api/storage/avatar', {
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
      const fresh = await api<Me>('/api/me');
      setMe(fresh);
      setVersion(Date.now());
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api('/api/me', { method: 'PATCH', body: { name, phoneNumber: phone } });
      setSaved(true);
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={s.page}>
      <Text style={s.h1}>حسابي</Text>
      <Card>
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          {me.avatarUrl ? (
            <Image
              source={{ uri: `${me.avatarUrl}&v=${version}` }}
              style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 10, borderWidth: 1, borderColor: c.line }}
            />
          ) : (
            <View style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primaryLight }}>
              <Text style={{ fontSize: 34, fontWeight: '700', color: c.primary }}>{me.user.name.slice(0, 1)}</Text>
            </View>
          )}
          <Pressable onPress={pickAvatar} disabled={busy}>
            <Text style={{ color: c.primary, fontWeight: '700' }}>{busy ? '…' : 'تغيير الصورة'}</Text>
          </Pressable>
          <Text style={{ color: c.inkSoft, fontSize: 12, marginTop: 4 }}>PNG/JPG · حتى 2 ميجابايت</Text>
        </View>
        <Text style={{ color: c.inkSoft, marginBottom: 12, textAlign: 'center' }}>{me.user.email || me.user.phoneNumber}</Text>
        <Text style={s.label}>الاسم</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} />
        <Text style={s.label}>الهاتف</Text>
        <TextInput style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        {saved && <Text style={{ color: c.primary, marginBottom: 8 }}>تم الحفظ ✓</Text>}
        {error && <ErrorBox error={error} />}
        <Btn label={busy ? '…' : 'حفظ'} onPress={save} disabled={busy || !name.trim()} />
        <Btn label="رجوع" onPress={onBack} variant="ghost" />
        <Btn label="تسجيل الخروج" onPress={async () => { await authApi.logout(); onLogout(); }} variant="ghost" />
      </Card>
    </ScrollView>
  );
}
