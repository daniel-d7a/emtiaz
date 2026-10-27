import { describe, expect, it } from 'vitest';
import { defaultTheme, normalizeTheme } from './theme';

describe('normalizeTheme', () => {
  it('falls back for missing and unknown values', () => {
    expect(normalizeTheme(null)).toEqual(defaultTheme);
    expect(
      normalizeTheme({
        layout: 'weird' as never,
        primary: 'teal',
        secondary: '#12345',
        marquee: 7 as never,
        arabicFont: 'comic' as never,
        englishFont: 'comic' as never,
      }),
    ).toEqual(defaultTheme);
  });

  it('keeps valid overrides', () => {
    expect(
      normalizeTheme({
        layout: 'split',
        primary: '#1D4ED8',
        secondary: '#B45309',
        marquee: 'Hello',
        arabicFont: 'tajawal',
        englishFont: 'inter',
      }),
    ).toMatchObject({ layout: 'split', primary: '#1D4ED8', marquee: 'Hello' });
  });
});
