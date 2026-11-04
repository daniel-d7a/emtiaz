import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { authApi } from '../api';
import { Btn, ErrorBox, Field, Text, c, s } from '../ui';

export default function ChangePassword({ onDone }: { onDone: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submit = async () => {
    setError(null);
    if (newPassword !== confirmPassword) {
      setError(new Error('كلمتا المرور غير متطابقتين'));
      return;
    }
    setBusy(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      onDone();
    } catch (e) {
      setError(e as Error);
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
        <Text style={s.h1}>تغيير كلمة المرور</Text>
        <Text style={{ color: c.inkSoft, marginBottom: 16 }}>
          يجب تغيير كلمة المرور المؤقتة قبل المتابعة.
        </Text>
        <Field label="كلمة المرور الحالية" value={currentPassword} onChange={setCurrentPassword} secure />
        <Field label="كلمة المرور الجديدة" value={newPassword} onChange={setNewPassword} secure />
        <Field label="تأكيد كلمة المرور" value={confirmPassword} onChange={setConfirmPassword} secure />
        {error && <ErrorBox error={error} />}
        <Btn label="حفظ" onPress={submit} loading={busy} />
      </View>
    </ScrollView>
  );
}
