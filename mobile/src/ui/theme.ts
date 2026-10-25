import { StyleSheet } from 'react-native';

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
