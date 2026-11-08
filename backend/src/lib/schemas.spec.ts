import { safeHttpUrl, CreateHomeworkDto, UpdateHomeworkDto, SubmitHomeworkDto } from './schemas';

describe('safeHttpUrl and Homework DTOs', () => {
  describe('safeHttpUrl', () => {
    it('accepts valid http and https URLs', () => {
      expect(safeHttpUrl.parse('http://example.com')).toBe('http://example.com');
      expect(safeHttpUrl.parse('https://example.com/path?foo=bar#baz')).toBe(
        'https://example.com/path?foo=bar#baz',
      );
      expect(safeHttpUrl.parse('  https://example.com  ')).toBe('https://example.com');
    });

    it('rejects unsafe protocols and non-URLs', () => {
      expect(() => safeHttpUrl.parse('javascript:alert(1)')).toThrow();
      expect(() => safeHttpUrl.parse('data:text/html;base64,PHNjcmlwdD4=')).toThrow();
      expect(() => safeHttpUrl.parse('ftp://example.com')).toThrow();
      expect(() => safeHttpUrl.parse('not-a-url')).toThrow();
    });
  });

  describe('CreateHomeworkDto url validation', () => {
    it('allows valid http/https URL and null/undefined', () => {
      const valid = CreateHomeworkDto.parse({
        title: 'Math homework',
        url: 'https://docs.google.com/homework',
      });
      expect(valid.url).toBe('https://docs.google.com/homework');

      const nullUrl = CreateHomeworkDto.parse({
        title: 'Math homework',
        url: null,
      });
      expect(nullUrl.url).toBeNull();

      const noUrl = CreateHomeworkDto.parse({
        title: 'Math homework',
      });
      expect(noUrl.url).toBeUndefined();
    });

    it('rejects javascript: URLs in CreateHomeworkDto', () => {
      expect(() =>
        CreateHomeworkDto.parse({
          title: 'Math homework',
          url: 'javascript:alert(document.cookie)',
        }),
      ).toThrow();
    });
  });

  describe('UpdateHomeworkDto url validation', () => {
    it('rejects javascript: URLs in UpdateHomeworkDto', () => {
      expect(() =>
        UpdateHomeworkDto.parse({
          url: 'javascript:alert(document.cookie)',
        }),
      ).toThrow();
    });
  });

  describe('SubmitHomeworkDto url validation', () => {
    it('accepts valid https URL and rejects javascript: URL', () => {
      const valid = SubmitHomeworkDto.parse({
        url: 'https://github.com/student/assignment',
      });
      expect(valid.url).toBe('https://github.com/student/assignment');

      expect(() =>
        SubmitHomeworkDto.parse({
          url: 'javascript:alert(1)',
        }),
      ).toThrow();
    });
  });
});
