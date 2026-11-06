import { useState } from 'react';
import { View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, ErrorBox, Loading, Text, c, s } from '../ui';

function parseJoinQr(data: string): { joinCode: string; entryCode?: string } | null {
  const match = data.match(/\/join\/([^/?#]+)(?:\?([^#]*))?/);
  if (!match) return null;
  const entry = (match[2] ?? '').match(/(?:^|&)entry=([^&]+)/);
  return {
    joinCode: decodeURIComponent(match[1]),
    entryCode: entry ? decodeURIComponent(entry[1]) : undefined,
  };
}

export default function ScanJoin({
  onBack,
  onJoined,
}: {
  onBack: () => void;
  onJoined: (groupId: string) => void;
}) {
  const qc = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [scanned, setScanned] = useState(false);

  const scan = async (data: string) => {
    if (busy || scanned) return;
    setScanned(true);
    const parsed = parseJoinQr(data);
    if (!parsed) {
      setError(new Error('رمز QR غير صالح'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ group: { id: string } }>('/api/student/groups/join', {
        body: parsed,
      });
      void qc.invalidateQueries({ queryKey: ['student-groups'] });
      void qc.invalidateQueries({ queryKey: ['student-home'] });
      onJoined(res.group.id);
    } catch (e) {
      setError(e as Error);
      setBusy(false);
    }
  };

  if (!permission) return <Loading />;

  return (
    <View style={s.page}>
      <Btn label="رجوع" onPress={onBack} variant="ghost" />
      <Text style={s.h1}>مسح رمز QR</Text>
      {!permission.granted ? (
        <View style={s.card}>
          <Text style={{ marginBottom: 8 }}>
            نحتاج إذن الكاميرا لمسح رمز انضمام المجموعة.
          </Text>
          <Btn
            label={permission.canAskAgain ? 'السماح بالكاميرا' : 'فعّل الكاميرا من إعدادات الهاتف'}
            onPress={() => void requestPermission()}
            disabled={!permission.canAskAgain}
          />
          <Btn label="إدخال الرمز يدوياً" onPress={onBack} variant="ghost" />
        </View>
      ) : (
        <>
          <View style={{ height: 360, borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={busy || scanned ? undefined : ({ data }) => void scan(data)}
            />
          </View>
          <Text style={{ color: c.inkSoft, textAlign: 'center' }}>
            وجّه الكاميرا إلى رمز QR الخاص بالمجموعة.
          </Text>
          {busy && <Loading />}
          {error && (
            <>
              <ErrorBox error={error} />
              <Btn label="حاول مرة أخرى" onPress={() => { setScanned(false); setError(null); }} />
            </>
          )}
        </>
      )}
    </View>
  );
}
