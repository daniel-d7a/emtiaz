import {
  serializeInboxItem,
  serializePublicTeacher,
  serializeStudentAttachment,
  serializeTeacherSummary,
  serializeUser,
} from './serializers';

const date = new Date('2026-01-01T00:00:00.000Z');

describe('response serializers', () => {
  it('keeps only contract user fields', () => {
    const user = serializeUser({
      id: 'u1',
      name: 'Aisha',
      email: 'aisha@test.om',
      emailVerified: true,
      phoneNumber: null,
      phoneNumberVerified: null,
      image: 'avatars/u1/x.png',
      role: 'STUDENT',
      country: 'OM',
      adminRoleId: 'role-1',
      landingSlug: null,
      landingBio: null,
      landingBanner: 'banners/u1/x.png',
      landingTheme: null,
      landingPublished: false,
      isTopTeacher: true,
      isActive: true,
      monitoringCode: 'ABCDEFGH',
      dateOfBirth: null,
      subjectCategoryId: null,
      gradeId: null,
      createdAt: date,
      updatedAt: date,
      deletedAt: null,
    } as any);

    expect(user.createdAt).toBe(date.toISOString());
    expect(user.monitoringCode).toBe('ABCDEFGH');
    expect(user.isTopTeacher).toBe(true);
    expect(user).not.toHaveProperty('adminRoleId');
    expect(user).not.toHaveProperty('image');
    expect(user).not.toHaveProperty('landingBanner');
    expect(user).not.toHaveProperty('deletedAt');
  });

  it('hides storage keys and inbox ownership', () => {
    const attachment = serializeStudentAttachment({
      id: 'a1',
      lessonId: 'l1',
      groupId: null,
      title: 'Worksheet',
      r2ObjectKey: 'courses/c/lessons/l/x.pdf',
      url: null,
      fileType: 'PDF',
      fileSizeBytes: 10,
      mimeType: 'application/pdf',
      createdAt: date,
    });
    expect(attachment).not.toHaveProperty('r2ObjectKey');

    const item = serializeInboxItem({
      id: 'n1',
      userId: 'u1',
      type: 'SYSTEM',
      message: 'Hello',
      readAt: null,
      createdAt: date,
    });
    expect(item).toEqual({
      id: 'n1',
      type: 'SYSTEM',
      message: 'Hello',
      readAt: null,
      createdAt: date.toISOString(),
    });
    expect(item).not.toHaveProperty('userId');
  });

  it('serializes public teacher and teacher summary with isTopTeacher', () => {
    const pub = serializePublicTeacher({
      name: 'Salim',
      email: 'salim@test.om',
      phoneNumber: '+96890000001',
      bio: 'Physics guru',
      subject: 'Physics',
      avatarUrl: '/api/public/teachers/salim/avatar',
      theme: null,
      bannerUrl: null,
      isTopTeacher: true,
    });
    expect(pub.isTopTeacher).toBe(true);
    expect(pub.name).toBe('Salim');

    const summary = serializeTeacherSummary({
      id: 't1',
      name: 'Salim',
      landingSlug: 'salim-physics',
      image: '/api/public/teachers/salim-physics/avatar',
      subject: 'Physics',
      landingBio: 'Bio',
      isTopTeacher: true,
    });
    expect(summary).toEqual({
      id: 't1',
      name: 'Salim',
      landingSlug: 'salim-physics',
      image: '/api/public/teachers/salim-physics/avatar',
      subject: 'Physics',
      landingBio: 'Bio',
      isTopTeacher: true,
    });
  });
});
