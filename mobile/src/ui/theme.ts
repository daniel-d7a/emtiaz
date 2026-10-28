import { StyleSheet } from 'react-native';
import type { TeacherTheme } from '../../../shared/api';

export const f = {
  regular: 'Cairo_400Regular',
  semiBold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
  latin: 'DMSans_400Regular',
  latinBold: 'DMSans_700Bold',
};

export const c = {
  primary: '#0F766E',
  primaryLight: '#CCFBF1',
  primaryDark: '#134E4A',
  secondary: '#EA580C',
  secondaryLight: '#FFEDD5',
  background: '#FAF8F5',
  card: '#FFFFFF',
  line: '#E7E5E4',
  ink: '#1C1917',
  inkSoft: '#57534E',
  onPrimary: '#FFFFFF',
  danger: '#B91C1C',
  dangerLight: '#FEF2F2',
  dangerLine: '#FECACA',
};

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background, direction: 'rtl' },
  page: {
    flex: 1,
    backgroundColor: c.background,
    padding: 16,
    paddingTop: 16,
    paddingBottom: 48,
    direction: 'rtl',
  },
  pageContent: { padding: 16, paddingBottom: 48, direction: 'rtl' },
  text: { fontFamily: f.regular, color: c.ink, textAlign: 'right', writingDirection: 'rtl' },
  h1: {
    fontFamily: f.bold,
    fontSize: 26,
    fontWeight: '700',
    color: c.primaryDark,
    marginBottom: 16,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  h2: {
    fontFamily: f.bold,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  card: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  label: {
    fontFamily: f.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: c.inkSoft,
    marginBottom: 6,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  input: {
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.card,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: f.regular,
    color: c.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  btn: {
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  btnPrimary: { backgroundColor: c.primary },
  btnText: {
    color: c.onPrimary,
    fontFamily: f.bold,
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.line },
  btnGhostText: {
    color: c.primaryDark,
    fontFamily: f.bold,
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },
  row: {
    direction: 'rtl',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  empty: {
    fontFamily: f.regular,
    color: c.inkSoft,
    textAlign: 'center',
    padding: 20,
  },
  errBox: {
    backgroundColor: c.dangerLight,
    borderWidth: 1,
    borderColor: c.dangerLine,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  errText: {
    color: c.danger,
    fontFamily: f.regular,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  progress: {
    height: 6,
    backgroundColor: c.line,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressFill: { height: 6, backgroundColor: c.primary },
  badge: {
    fontFamily: f.semiBold,
    color: c.secondary,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

export const defaultTeacherTheme: TeacherTheme = {
  layout: 'banner',
  primary: '#0F766E',
  secondary: '#EA580C',
  marquee: '',
  arabicFont: 'cairo',
  englishFont: 'dm-sans',
};

const isHex = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

export function normalizeTeacherTheme(theme: TeacherTheme | null | undefined): TeacherTheme {
  return {
    layout: theme?.layout === 'split' ? 'split' : 'banner',
    primary: isHex(theme?.primary) ? theme.primary : defaultTeacherTheme.primary,
    secondary: isHex(theme?.secondary) ? theme.secondary : defaultTeacherTheme.secondary,
    marquee: typeof theme?.marquee === 'string' ? theme.marquee.slice(0, 200) : '',
    arabicFont:
      theme?.arabicFont === 'readex' || theme?.arabicFont === 'tajawal'
        ? theme.arabicFont
        : 'cairo',
    englishFont:
      theme?.englishFont === 'inter' || theme?.englishFont === 'cairo'
        ? theme.englishFont
        : 'dm-sans',
  };
}
