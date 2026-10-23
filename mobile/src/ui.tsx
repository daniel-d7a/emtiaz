import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export const c = {
  primary: '#0F766E',
  primaryLight: '#CCFBF1',
  primaryDark: '#134E4A',
  secondary: '#EA580C',
  background: '#FAF8F5',
  card: '#FFFFFF',
  line: '#E7E5E4',
  ink: '#1C1917',
  inkSoft: '#78716C',
};

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}

export function Btn({
  label,
  onPress,
  variant,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[s.btn, variant === 'ghost' ? s.btnGhost : s.btnPrimary, disabled && { opacity: 0.5 }]}
    >
      <Text style={variant === 'ghost' ? s.btnGhostText : s.btnText}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChange,
  secure,
  placeholder,
  dir,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  placeholder?: string;
  dir?: 'ltr';
}) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, dir === 'ltr' && { textAlign: 'left', writingDirection: undefined as any }]}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        placeholder={placeholder}
        placeholderTextColor={c.inkSoft}
      />
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return <Text style={s.empty}>{text}</Text>;
}

export function Loading() {
  return <ActivityIndicator style={{ margin: 24 }} color={c.primary} />;
}

export function ErrorBox({ error }: { error: unknown }) {
  return <View style={s.errBox}><Text style={s.errText}>{String((error as Error)?.message ?? error)}</Text></View>;
}

export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.background, padding: 16, paddingTop: 60 },
  h1: { fontSize: 26, fontWeight: '700', color: c.primaryDark, marginBottom: 16 },
  h2: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 16, padding: 16, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: c.inkSoft, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: c.line, backgroundColor: c.card, borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 12 },
  btn: { borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  btnPrimary: { backgroundColor: c.primary },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.line },
  btnGhostText: { color: c.primaryDark, fontWeight: '700', fontSize: 15 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  empty: { color: c.inkSoft, textAlign: 'center', padding: 20 },
  errBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 12, marginVertical: 8 },
  errText: { color: '#B91C1C' },
  progress: { height: 6, backgroundColor: c.line, borderRadius: 3, overflow: 'hidden', marginVertical: 8 },
  progressFill: { height: 6, backgroundColor: c.primary },
  badge: { color: c.secondary, fontWeight: '700', fontSize: 12 },
});
