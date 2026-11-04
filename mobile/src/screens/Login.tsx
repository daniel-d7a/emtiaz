import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ApiError, authApi } from '../api';
import { Btn, ErrorBox, Field, Text, c, s } from '../ui';

export default function Login({ onIn }: { onIn: (user: any) => void }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.login(identifier.trim(), password);
      onIn(res);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? new Error('رقم الهاتف أو كلمة المرور غير صحيحة.')
          : (e as Error),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={[s.pageContent, { flexGrow: 1, justifyContent: 'center' }]}
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <Text style={s.h1}>امتياز</Text>
        <Text style={{ color: c.inkSoft, marginBottom: 16 }}>
          منصة تعلّم بسيطة للمعلمين والطلبة في سلطنة عُمان
        </Text>
        <Field
          label="رقم الهاتف أو البريد الإلكتروني"
          value={identifier}
          onChange={setIdentifier}
          placeholder="+968…"
          dir="ltr"
        />
        <Field label="كلمة المرور" value={password} onChange={setPassword} secure />
        {error && <ErrorBox error={error} />}
        <Btn label="تسجيل الدخول" onPress={submit} loading={busy} />
        <Text style={{ color: c.inkSoft, textAlign: 'center', marginTop: 20 }}>
          لا تملك حسابًا؟ سجّل عبر الموقع ثم انتقل إلى التطبيق
        </Text>
      </View>
    </ScrollView>
  );
}
