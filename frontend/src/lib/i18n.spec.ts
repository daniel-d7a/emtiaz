import { renderHook, act } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LanguageProvider, useLang } from './i18n';

describe('i18n', () => {
  afterEach(() => localStorage.clear());

  it('t() returns Arabic (default) and English per key', () => {
    const { result } = renderHook(() => useLang(), { wrapper: LanguageProvider });
    expect(result.current.t('login')).toContain('تسجيل');
    act(() => result.current.setLang('en'));
    expect(result.current.t('login')).toBe('Log in');
  });
});
