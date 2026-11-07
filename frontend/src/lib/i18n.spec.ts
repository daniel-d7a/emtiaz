import { renderHook, act } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  formatDateTime,
  formatDays,
  getWeekdayOptions,
  LanguageProvider,
  localizeName,
  parseDays,
  serializeDays,
  useLang,
} from './i18n';

describe('i18n', () => {
  afterEach(() => localStorage.clear());

  it('t() returns Arabic (default) and English per key', () => {
    const { result } = renderHook(() => useLang(), { wrapper: LanguageProvider });
    expect(result.current.t('login')).toContain('تسجيل');
    expect(result.current.t('platformGuide')).toBe('دليل المنصة');
    expect(result.current.t('hintCoursesVsGroupsTitle')).toContain('المقررات');
    act(() => result.current.setLang('en'));
    expect(result.current.t('login')).toBe('Log in');
    expect(result.current.t('platformGuide')).toBe('Platform Guide');
    expect(result.current.t('hintCoursesVsGroupsTitle')).toContain('Courses');
  });
});

describe('localizeName', () => {
  it('translates known taxonomy names', () => {
    expect(localizeName('Physics', 'ar')).toBe('الفيزياء');
    expect(localizeName('Physics', 'en')).toBe('Physics');
  });

  it('leaves unknown names untouched', () => {
    expect(localizeName('Advanced Robotics', 'ar')).toBe('Advanced Robotics');
  });
});

describe('formatDateTime', () => {
  it('formats dates for the active language', () => {
    const value = '2026-10-27T10:30:00Z';
    expect(formatDateTime(value, 'ar')).toContain('2026');
    expect(formatDateTime(value, 'ar')).not.toBe(formatDateTime(value, 'en'));
  });
});

describe('group days normalization and translation', () => {
  it('normalizes Arabic, full English, and short English day strings', () => {
    expect(parseDays('الأحد, الثلاثاء')).toEqual(['Sun', 'Tue']);
    expect(parseDays('الأحد، الأربعاء')).toEqual(['Sun', 'Wed']);
    expect(parseDays('Tuesday, Sunday')).toEqual(['Sun', 'Tue']);
    expect(serializeDays(['Tue', 'Sun'])).toBe('Sun, Tue');
  });

  it('translates group days into the active language regardless of how they were created', () => {
    expect(formatDays('الأحد, الثلاثاء', 'en')).toBe('Sunday, Tuesday');
    expect(formatDays('Sunday, Tuesday', 'ar')).toBe('الأحد، الثلاثاء');
    expect(formatDays('Sun, Tue', 'ar')).toBe('الأحد، الثلاثاء');
    expect(formatDays('Sun, Tue', 'en')).toBe('Sunday, Tuesday');
  });

  it('returns canonical weekday keys with localized labels for options', () => {
    const ar = getWeekdayOptions('ar');
    const en = getWeekdayOptions('en');
    expect(ar[0]).toEqual({ value: 'Sun', label: 'الأحد' });
    expect(en[0]).toEqual({ value: 'Sun', label: 'Sunday' });
  });
});
