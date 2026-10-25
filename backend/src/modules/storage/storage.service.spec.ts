import { StorageService } from './storage.service';

describe('StorageService helpers', () => {
  it('builds namespaced object keys and strips unsafe filename characters', () => {
    const key = StorageService.buildObjectKey('course-1', 'lesson-2', '../../My File (final).pdf');
    expect(key).toMatch(/^courses\/course-1\/lessons\/lesson-2\/[0-9a-f-]{36}-\.\._\.\._My_File__final_\.pdf$/);
  });

  it('builds avatar keys under the user prefix', () => {
    const key = StorageService.buildAvatarKey('user-9', 'pic.png');
    expect(key).toMatch(/^avatars\/user-9\/[0-9a-f-]{36}-pic\.png$/);
  });

  it('maps mime types to attachment types', () => {
    expect(StorageService.fileTypeFor('application/pdf')).toBe('PDF');
    expect(StorageService.fileTypeFor('image/png')).toBe('IMAGE');
    expect(StorageService.fileTypeFor('audio/mpeg')).toBe('AUDIO');
    expect(StorageService.fileTypeFor('video/mp4')).toBe('VIDEO');
    expect(StorageService.fileTypeFor('application/zip')).toBe('ARCHIVE');
    expect(StorageService.fileTypeFor('application/msword')).toBe('DOC');
    expect(StorageService.fileTypeFor(undefined)).toBe('PDF');
  });
});
