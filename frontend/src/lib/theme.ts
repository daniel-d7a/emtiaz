import type { CSSProperties } from 'react';
import type { TeacherTheme } from '../../../shared/api';

export const defaultTheme: TeacherTheme = {
  layout: 'banner',
  primary: '#0F766E',
  secondary: '#EA580C',
  marquee: '',
  arabicFont: 'cairo',
  englishFont: 'dm-sans',
};

const fonts = {
  cairo: '"Parastoo", "Cairo", "Readex Pro", sans-serif',
  parastoo: '"Parastoo", "Cairo", "Readex Pro", sans-serif',
  readex: '"Parastoo", "Readex Pro", sans-serif',
  tajawal: '"Parastoo", "Tajawal", sans-serif',
  'dm-sans': '"DM Sans", sans-serif',
  inter: '"Inter", "DM Sans", sans-serif',
} as const;

const isHex = (v: unknown): v is string =>
  typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

/** Unknown or hand-edited values fall back to the DESIGN.md defaults. */
export function normalizeTheme(theme: TeacherTheme | null | undefined): TeacherTheme {
  return {
    layout: theme?.layout === 'split' ? 'split' : 'banner',
    primary: isHex(theme?.primary) ? theme.primary : defaultTheme.primary,
    secondary: isHex(theme?.secondary) ? theme.secondary : defaultTheme.secondary,
    marquee: typeof theme?.marquee === 'string' ? theme.marquee.slice(0, 200) : '',
    arabicFont:
      theme?.arabicFont && theme.arabicFont in fonts
        ? theme.arabicFont
        : defaultTheme.arabicFont,
    englishFont:
      theme?.englishFont && theme.englishFont in fonts
        ? theme.englishFont
        : defaultTheme.englishFont,
  };
}

export function themeStyle(theme: TeacherTheme, lang: 'ar' | 'en'): CSSProperties {
  const t = normalizeTheme(theme);
  return {
    '--color-primary': t.primary,
    '--color-primary-dark': `color-mix(in srgb, ${t.primary} 75%, black)`,
    '--color-primary-light': `color-mix(in srgb, ${t.primary} 16%, white)`,
    '--color-secondary': t.secondary,
    '--color-secondary-light': `color-mix(in srgb, ${t.secondary} 16%, white)`,
    fontFamily: fonts[lang === 'ar' ? t.arabicFont : t.englishFont],
  } as CSSProperties;
}
