import { renderHook, act } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { formatDateTime, LanguageProvider, localizeName, useLang } from './i18n';

describe('i18n', () => {
  afterEach(() => localStorage.clear());

  it('t() returns Arabic (default) and English per key', () => {
    const { result } = renderHook(() => useLang(), { wrapper: LanguageProvider });
    expect(result.current.t('login')).toContain('تسجيل');
    act(() => result.current.setLang('en'));
    expect(result.current.t('login')).toBe('Log in');
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
