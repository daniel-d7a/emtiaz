import { describe, expect, it, beforeEach } from 'vitest';
import { applyPageMeta } from './meta';

describe('applyPageMeta', () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta property="og:title" content="Base"><meta name="description" content="Base" />';
    document.title = 'Base';
  });

  it('updates existing tags and restores them on cleanup', () => {
    const cleanup = applyPageMeta({
      title: 'Teacher page',
      description: 'Teacher description',
      image: '/avatar.png',
      type: 'profile',
      locale: 'ar',
    });

    expect(document.title).toBe('Teacher page');
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Teacher page');
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      `${window.location.origin}/avatar.png`,
    );
    expect(document.querySelector('meta[property="og:locale"]')?.getAttribute('content')).toBe('ar_OM');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(window.location.href);

    cleanup();

    expect(document.title).toBe('Base');
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Base');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Base');
    expect(document.querySelector('meta[property="og:image"]')).toBeNull();
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  });
});
