import { useEffect, useState } from 'react';
import { Image, Switch, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, uploadFile } from '../api';
import { Btn, Card, Choice, ErrorBox, Field, Text, c, s } from '../ui';
import { normalizeTeacherTheme } from '../ui/theme';
import type { MeResponse, PresignedUpload, TeacherTheme } from '../../../shared/api';

const hex = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

export default function TeacherLandingFields({ me }: { me: MeResponse }) {
  const qc = useQueryClient();
  const [landingSlug, setLandingSlug] = useState('');
  const [landingBio, setLandingBio] = useState('');
  const [landingPublished, setLandingPublished] = useState(false);
  const [theme, setTheme] = useState<TeacherTheme>(normalizeTeacherTheme(null));
  const [saved, setSaved] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [bannerError, setBannerError] = useState<Error | null>(null);

  useEffect(() => {
    setLandingSlug(me.user.landingSlug ?? '');
    setLandingBio(me.user.landingBio ?? '');
    setLandingPublished(me.user.landingPublished);
    setTheme(normalizeTeacherTheme(me.user.landingTheme));
  }, [me.user.landingSlug, me.user.landingBio, me.user.landingPublished, me.user.landingTheme]);

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['me'] });
  const save = useMutation({
    mutationFn: () =>
      api('/api/me', {
        method: 'PATCH',
        body: {
          landingSlug: landingSlug.trim().toLowerCase(),
          landingBio: landingBio.trim(),
          landingPublished,
          landingTheme: {
            ...theme,
            primary: theme.primary.toUpperCase(),
            secondary: theme.secondary.toUpperCase(),
            marquee: theme.marquee.trim(),
          },
        },
      }),
    onSuccess: () => {
      setSaved(true);
      invalidate();
    },
  });
  const removeBanner = useMutation({
    mutationFn: () =>
      api('/api/me', { method: 'PATCH', body: { landingBanner: null } }),
    onSuccess: invalidate,
  });

  const uploadBanner = async () => {
    setBannerError(null);
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 6],
        quality: 0.8,
      });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      const size = asset.fileSize ?? new File(asset.uri).size;
      if (!size) throw new Error('تعذر قراءة حجم الصورة.');
      if (size > 5 * 1024 * 1024) throw new Error('حجم الصورة يجب ألا يتجاوز 5 ميجابايت.');
      setBannerBusy(true);
      const mime = asset.mimeType ?? 'image/jpeg';
      const up = await api<PresignedUpload>('/api/storage/banner', {
        body: {
          fileName: asset.fileName ?? 'banner.jpg',
          mimeType: mime,
          fileSizeBytes: size,
        },
      });
      await uploadFile(up.uploadUrl, asset.uri, mime);
      await api('/api/me', { method: 'PATCH', body: { landingBanner: up.objectKey } });
      invalidate();
    } catch (error) {
      setBannerError(error as Error);
    } finally {
      setBannerBusy(false);
    }
  };

  const validColors = hex(theme.primary) && hex(theme.secondary);
  const validSlug =
    !landingSlug.trim() || /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(landingSlug.trim());

  return (
    <Card>
      <Text style={s.h2}>صفحة الهبوط</Text>
      <Field
        label="الرابط المختصر"
        value={landingSlug}
        onChange={(value) => {
          setLandingSlug(value.toLowerCase());
          setSaved(false);
        }}
        dir="ltr"
        placeholder="your-name"
        maxLength={40}
      />
      <Field
        label="نبذة تعريفية"
        value={landingBio}
        onChange={(value) => {
          setLandingBio(value);
          setSaved(false);
        }}
        multiline
        maxLength={500}
      />
      <View style={[s.row, { paddingVertical: 6, marginBottom: 8 }]}>
        <Text style={{ fontWeight: '600' }}>نشر الصفحة</Text>
        <Switch
          value={landingPublished}
          onValueChange={(value) => {
            setLandingPublished(value);
            setSaved(false);
          }}
          trackColor={{ false: c.line, true: c.primary }}
          ios_backgroundColor={c.line}
        />
      </View>
      {landingSlug ? (
        <Text style={{ color: c.primary, fontSize: 13, marginBottom: 8 }}>
          الرابط العام: /t/{landingSlug}
        </Text>
      ) : null}

      <Text style={s.label}>التصميم</Text>
      <Choice
        value={theme.layout}
        onChange={(layout) => setTheme({ ...theme, layout })}
        options={[
          { value: 'banner', label: 'بانر' },
          { value: 'split', label: 'مقسّم' },
        ]}
      />
      <Field
        label="اللون الأساسي"
        value={theme.primary}
        onChange={(primary) => {
          setTheme({ ...theme, primary });
          setSaved(false);
        }}
        dir="ltr"
        placeholder="#0F766E"
      />
      <Field
        label="اللون الثانوي"
        value={theme.secondary}
        onChange={(secondary) => {
          setTheme({ ...theme, secondary });
          setSaved(false);
        }}
        dir="ltr"
        placeholder="#EA580C"
      />
      <Choice
        label="خط العناوين العربية"
        value={theme.arabicFont}
        onChange={(arabicFont) => setTheme({ ...theme, arabicFont })}
        options={[
          { value: 'cairo', label: 'Cairo' },
          { value: 'readex', label: 'Readex' },
          { value: 'tajawal', label: 'Tajawal' },
        ]}
      />
      <Choice
        label="الخط اللاتيني"
        value={theme.englishFont}
        onChange={(englishFont) => setTheme({ ...theme, englishFont })}
        options={[
          { value: 'dm-sans', label: 'DM Sans' },
          { value: 'inter', label: 'Inter' },
          { value: 'cairo', label: 'Cairo' },
        ]}
      />
      <Field
        label="الشريط المتحرك"
        value={theme.marquee}
        onChange={(marquee) => {
          setTheme({ ...theme, marquee });
          setSaved(false);
        }}
        maxLength={200}
        placeholder="نص قصير يظهر أعلى الصفحة"
      />

      <Text style={s.label}>صورة البانر</Text>
      {me.bannerUrl ? (
        <Image
          source={{ uri: me.bannerUrl }}
          style={{ width: '100%', height: 120, borderRadius: 12, marginBottom: 8 }}
        />
      ) : (
        <Text style={{ color: c.inkSoft, fontSize: 13, marginBottom: 8 }}>لا توجد صورة بانر</Text>
      )}
      <Btn
        label={me.bannerUrl ? 'تغيير البانر' : 'رفع بانر'}
        variant="ghost"
        onPress={() => void uploadBanner()}
        loading={bannerBusy}
      />
      {me.bannerUrl ? (
        <Btn
          label="حذف البانر"
          variant="ghost"
          onPress={() => removeBanner.mutate()}
          loading={removeBanner.isPending}
        />
      ) : null}
      <Text style={{ color: c.inkSoft, fontSize: 12 }}>PNG/JPG · حتى 5 ميجابايت</Text>
      {!validSlug ? (
        <Text style={s.errText}>الرابط المختصر يجب أن يكون 3–40 حرفًا إنجليزيًا أو رقمًا أو شرطة.</Text>
      ) : null}
      {!validColors ? (
        <Text style={s.errText}>اللون يجب أن يكون بصيغة #RRGGBB.</Text>
      ) : null}
      {saved && <Text style={{ color: c.primary, marginBottom: 8 }}>تم حفظ صفحة الهبوط</Text>}
      {bannerError && <ErrorBox error={bannerError} />}
      {removeBanner.error && <ErrorBox error={removeBanner.error} />}
      {save.error && <ErrorBox error={save.error} />}
      <Btn
        label="حفظ صفحة الهبوط"
        onPress={() => save.mutate()}
        loading={save.isPending}
        disabled={!validColors || !validSlug}
      />
    </Card>
  );
}
