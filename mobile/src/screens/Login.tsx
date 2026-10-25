import { useState } from 'react';
import { Text, View } from 'react-native';
import { authApi } from '../api';
import { Btn, ErrorBox, Field, s } from '../ui';

export default function Login({ onIn }: { onIn: (user: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.login(email.trim(), password);
      onIn(res);
    } catch (e: any) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.page}>
      <Text style={s.h1}>امتياز</Text>
      <Text style={{ color: '#78716C', marginBottom: 16 }}>منصة تعلّم بسيطة للمعلمين والطلبة في سلطنة عُمان</Text>
      <Field label="البريد الإلكتروني" value={email} onChange={setEmail} placeholder="you@example.com" />
      <Field label="كلمة المرور" value={password} onChange={setPassword} secure />
      {error && <ErrorBox error={error} />}
      <Btn label={busy ? '…' : 'تسجيل الدخول'} onPress={submit} />
      <Text style={{ color: '#78716C', textAlign: 'center', marginTop: 20 }}>
        لا تملك حسابًا؟ سجّل عبر الموقع ثم انتقل إلى التطبيق
      </Text>
    </View>
  );
}
