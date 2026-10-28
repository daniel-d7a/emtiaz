import type {
  AdminAuditEntry,
  AdminCourseRow,
  AdminDeliveredReport,
  AdminGroupRow,
  AdminNotification,
  AdminParentChild,
  AdminParentLink,
  AdminParentProfile,
  AdminParentReport,
  AdminParentRow,
  AdminRole,
  AdminStudentGroup,
  AdminStudentProfile,
  AdminStudentRow,
  AdminTeacherRow,
  AdminUser,
  Attachment,
  Course,
  Group,
  InboxItem,
  Lesson,
  ManualGradeColumn,
  MeResponse,
  Module,
  PublicCourseCard,
  PublicCoursePage,
  PublicSupport,
  PublicTeacher,
  Quiz,
  QuizAttempt,
  QuizQuestion,
  StudentAttachment,
  TeacherQuizQuestion,
  User,
} from '../../shared/api';
import type {
  adminRoles,
  courses,
  grades,
  groups,
  inboxNotifications,
  lessonAttachments,
  lessons,
  manualGradeColumns,
  modules,
  notifications,
  quizAttempts,
  quizQuestions,
  quizzes,
  users,
} from '../db/schema';

type UserRow = typeof users.$inferSelect;
type CourseRow = typeof courses.$inferSelect;
type GroupRow = typeof groups.$inferSelect;
type ModuleRow = typeof modules.$inferSelect;
type LessonRow = typeof lessons.$inferSelect;
type AttachmentRow = typeof lessonAttachments.$inferSelect;
type QuizRow = typeof quizzes.$inferSelect;
type QuizQuestionRow = typeof quizQuestions.$inferSelect;
type QuizAttemptRow = typeof quizAttempts.$inferSelect;
type ManualGradeColumnRow = typeof manualGradeColumns.$inferSelect;
type InboxRow = typeof inboxNotifications.$inferSelect;
type NotificationRow = typeof notifications.$inferSelect;
type AdminRoleRow = typeof adminRoles.$inferSelect;
type GradeRow = typeof grades.$inferSelect;

const iso = (value: Date) => value.toISOString();
const isoOrNull = (value: Date | null) => (value ? value.toISOString() : null);

/** The shared User contract. Storage keys and role internals stay out. */
export function serializeUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    phoneNumber: row.phoneNumber,
    phoneNumberVerified: row.phoneNumberVerified,
    role: row.role,
    landingSlug: row.landingSlug,
    landingBio: row.landingBio,
    landingTheme: row.landingTheme,
    landingPublished: row.landingPublished,
    isActive: row.isActive,
    dateOfBirth: row.dateOfBirth,
    subjectCategoryId: row.subjectCategoryId,
    gradeId: row.gradeId,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function serializeMe(
  row: UserRow,
  avatarUrl: string | null,
  bannerUrl: string | null,
): MeResponse {
  return { user: serializeUser(row), avatarUrl, bannerUrl };
}

export function serializeCourse(row: CourseRow): Course {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    courseType: row.courseType,
    teacherId: row.teacherId,
    gradeId: row.gradeId,
    semester: row.semester,
    categoryId: row.categoryId,
    image: row.image,
    previewUrl: row.previewUrl,
    isPublished: row.isPublished,
    createdAt: iso(row.createdAt),
  };
}

export function serializeGroup(row: GroupRow): Group {
  return {
    id: row.id,
    courseId: row.courseId,
    name: row.name,
    joinCode: row.joinCode,
    days: row.days,
    time: row.time,
    whatsappMessage: row.whatsappMessage,
    unlockAllByDefault: row.unlockAllByDefault,
    isActive: row.isActive,
    createdAt: iso(row.createdAt),
  };
}

export function serializeModule(row: ModuleRow): Module {
  return {
    id: row.id,
    courseId: row.courseId,
    title: row.title,
    displayOrder: row.displayOrder,
  };
}

export function serializeLesson(row: LessonRow): Lesson {
  return {
    id: row.id,
    moduleId: row.moduleId,
    title: row.title,
    content: row.content,
    displayOrder: row.displayOrder,
    createdAt: iso(row.createdAt),
  };
}

/** Teacher-facing attachments keep the object key; it is part of their contract. */
export function serializeAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    lessonId: row.lessonId,
    groupId: row.groupId,
    title: row.title,
    r2ObjectKey: row.r2ObjectKey,
    url: row.url,
    fileType: row.fileType,
    fileSizeBytes: row.fileSizeBytes,
    mimeType: row.mimeType,
    createdAt: iso(row.createdAt),
  };
}

export function serializeStudentAttachment(row: AttachmentRow): StudentAttachment {
  return {
    id: row.id,
    lessonId: row.lessonId,
    groupId: row.groupId,
    title: row.title,
    url: row.url,
    fileType: row.fileType,
    fileSizeBytes: row.fileSizeBytes,
    mimeType: row.mimeType,
    createdAt: iso(row.createdAt),
  };
}

export function serializeQuiz(row: QuizRow): Quiz {
  return {
    id: row.id,
    lessonId: row.lessonId,
    moduleId: row.moduleId,
    courseId: row.courseId,
    title: row.title,
    displayOrder: row.displayOrder,
  };
}

export function serializeQuizQuestion(row: QuizQuestionRow, imageUrl: string | null): QuizQuestion {
  return {
    id: row.id,
    questionType: row.questionType,
    prompt: row.prompt,
    imageUrl,
    options: row.options,
    points: row.points,
  };
}

export function serializeTeacherQuizQuestion(
  row: QuizQuestionRow,
  imageUrl: string | null,
): TeacherQuizQuestion {
  return {
    ...serializeQuizQuestion(row, imageUrl),
    imageKey: row.imageKey,
    correctAnswer: row.correctAnswer,
  };
}

export function serializeQuizAttempt(row: QuizAttemptRow): QuizAttempt {
  return {
    id: row.id,
    quizId: row.quizId,
    studentId: row.studentId,
    groupId: row.groupId,
    score: row.score,
    maxScore: row.maxScore,
    answersJson: row.answersJson as Record<string, string>,
    submittedAt: iso(row.submittedAt),
  };
}

export function serializeManualGradeColumn(row: ManualGradeColumnRow): ManualGradeColumn {
  return {
    id: row.id,
    groupId: row.groupId,
    title: row.title,
    maxScore: row.maxScore,
    displayOrder: row.displayOrder,
    createdAt: iso(row.createdAt),
  };
}

export function serializeInboxItem(row: InboxRow): InboxItem {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    readAt: isoOrNull(row.readAt),
    createdAt: iso(row.createdAt),
  };
}

/** Admin notification feed: no recipient phone/email. */
export function serializeAdminNotification(row: NotificationRow): AdminNotification {
  return {
    id: row.id,
    channel: row.channel,
    type: row.type,
    message: row.message,
    status: row.status,
    createdAt: iso(row.createdAt),
  };
}

export function serializeAdminDeliveredReport(row: NotificationRow): AdminDeliveredReport {
  return {
    id: row.id,
    channel: row.channel,
    type: row.type,
    message: row.message,
    status: row.status,
    createdAt: iso(row.createdAt),
  };
}

export function serializeAdminRole(row: AdminRoleRow): AdminRole {
  return {
    id: row.id,
    name: row.name,
    permissions: row.permissions as AdminRole['permissions'],
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function serializeAdminUser(row: {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  adminRoleId: string | null;
  adminRoleName: string | null;
  createdAt: Date;
}): AdminUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    isActive: row.isActive,
    adminRoleId: row.adminRoleId,
    adminRoleName: row.adminRoleName,
    createdAt: iso(row.createdAt),
  };
}

export function serializeAdminTeacherRow(row: {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: User['role'];
  isActive: boolean;
  createdAt: Date;
  deletedAt: Date | null;
  landingSlug: string | null;
  landingPublished: boolean;
  subjectCategoryId: string | null;
  subject: { id: string | null; name: string | null } | null;
  courseCount: number;
  groupCount: number;
  uniqueStudentCount: number;
}): AdminTeacherRow {
  return {
    ...row,
    createdAt: iso(row.createdAt),
    deletedAt: isoOrNull(row.deletedAt),
  };
}

export function serializeAdminStudentRow(row: {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  gradeId: string | null;
  isActive: boolean;
  createdAt: Date;
  deletedAt: Date | null;
  enrollments: AdminStudentRow['enrollments'];
}): AdminStudentRow {
  return {
    ...row,
    createdAt: iso(row.createdAt),
    deletedAt: isoOrNull(row.deletedAt),
  };
}

export function serializeAdminStudentProfile(row: {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  gradeId: string | null;
  gradeName: string | null;
  isActive: boolean;
  createdAt: Date;
  deletedAt: Date | null;
  parents: AdminStudentProfile['parents'];
  groups: Array<Omit<AdminStudentGroup, 'joinedAt'> & { joinedAt: Date }>;
  quiz: AdminStudentProfile['quiz'];
}): AdminStudentProfile {
  return {
    ...row,
    createdAt: iso(row.createdAt),
    deletedAt: isoOrNull(row.deletedAt),
    groups: row.groups.map((group) => ({ ...group, joinedAt: iso(group.joinedAt) })),
  };
}

export function serializeAdminParentRow(row: {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  isActive: boolean;
  createdAt: Date;
  deletedAt: Date | null;
  children: AdminParentRow['children'];
}): AdminParentRow {
  return {
    ...row,
    createdAt: iso(row.createdAt),
    deletedAt: isoOrNull(row.deletedAt),
  };
}

export function serializeAdminParentChild(row: {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  gradeName: string | null;
}): AdminParentChild {
  return row;
}

export function serializeAdminParentReport(row: {
  id: string;
  studentId: string;
  studentName: string;
  message: string;
  createdAt: Date;
}): AdminParentReport {
  return { ...row, createdAt: iso(row.createdAt) };
}

export function serializeAdminParentProfile(row: {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  isActive: boolean;
  createdAt: Date;
  deletedAt: Date | null;
  children: AdminParentChild[];
  feedback: AdminParentReport[];
  deliveredReports: AdminDeliveredReport[];
}): AdminParentProfile {
  return {
    ...row,
    createdAt: iso(row.createdAt),
    deletedAt: isoOrNull(row.deletedAt),
  };
}

export function serializeAdminCourseRow(row: {
  course: CourseRow;
  teacherName: string;
  categoryName: string | null;
  gradeName: string | null;
  groups: AdminCourseRow['groups'];
}): AdminCourseRow {
  return {
    ...serializeCourse(row.course),
    deletedAt: isoOrNull(row.course.deletedAt),
    teacherName: row.teacherName,
    categoryName: row.categoryName,
    gradeName: row.gradeName,
    groups: row.groups,
  };
}

export function serializeAdminGroupRow(row: {
  id: string;
  name: string;
  joinCode: string;
  isActive: boolean;
  courseId: string;
  courseTitle: string;
  deletedAt: Date | null;
}): AdminGroupRow {
  return { ...row, deletedAt: isoOrNull(row.deletedAt) };
}

export function serializeAdminParentLink(row: {
  parentId: string;
  parentName: string;
  studentId: string;
  studentName: string;
  deletedAt: Date | null;
}): AdminParentLink {
  return { ...row, deletedAt: isoOrNull(row.deletedAt) };
}

export function serializeAdminAuditEntry(row: {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  endpoint: string | null;
  responseType: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  actorName: string;
  actorPhone: string | null;
  actorRole: User['role'];
}): AdminAuditEntry {
  return { ...row, createdAt: iso(row.createdAt) };
}

export function serializePublicTeacher(row: {
  name: string;
  email: string;
  phoneNumber: string | null;
  bio: string | null;
  subject: string | null;
  avatarUrl: string | null;
  theme: PublicTeacher['theme'];
  bannerUrl: string | null;
}): PublicTeacher {
  return row;
}

export function serializePublicCourseCard(
  row: { id: string; title: string; description: string | null; courseType: Course['courseType'] },
  imageUrl: string | null,
): PublicCourseCard {
  return { ...row, imageUrl };
}

/** Public course detail: no storage key, and taxonomy names resolved for the hero. */
export function serializePublicCourseDetail(
  row: CourseRow,
  extras: {
    imageUrl: string | null;
    gradeName: string | null;
    categoryName: string | null;
  },
): PublicCoursePage['course'] {
  const { image: _image, ...course } = serializeCourse(row);
  return { ...course, ...extras };
}

export function serializePublicSupport(row: {
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
}): PublicSupport {
  return row;
}

export function serializeGrade(row: GradeRow) {
  return { id: row.id, name: row.name, displayOrder: row.displayOrder };
}
