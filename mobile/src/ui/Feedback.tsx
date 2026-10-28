import { ActivityIndicator, View } from 'react-native';
import { Text } from './Text';
import { c, s } from './theme';

function messageFor(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  if (raw === 'Upload failed') return 'تعذر رفع الملف. تحقق من الاتصال وحجم الملف.';
  if (/network request failed|failed to fetch|timeout/i.test(raw)) {
    return 'تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.';
  }
  const status = (error as { status?: number })?.status;
  if (status === 400) return 'تحقق من البيانات المدخلة وحاول مرة أخرى.';
  if (status === 401) return 'انتهت جلستك. سجّل الدخول من جديد.';
  if (status === 403) return 'ليس لديك صلاحية لهذا الإجراء.';
  if (status === 404) return 'العنصر المطلوب غير موجود.';
  if (status === 413) return 'الملف أكبر من الحد المسموح.';
  if (status === 429) return 'محاولات كثيرة. حاول بعد قليل.';
  if (status && status >= 500) return 'حدث خطأ في الخادم. حاول لاحقًا.';
  if (/[\u0600-\u06FF]/.test(raw)) return raw;
  return 'تعذر إكمال الطلب. حاول مرة أخرى.';
}

export function Empty({ text }: { text: string }) {
  return <Text style={s.empty}>{text}</Text>;
}

export function Loading() {
  return (
    <View style={{ flex: 1, minHeight: 160, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background }}>
      <ActivityIndicator style={{ margin: 24 }} color={c.primary} />
    </View>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <View accessibilityRole="alert" style={s.errBox}>
      <Text style={s.errText}>{messageFor(error)}</Text>
    </View>
  );
}
