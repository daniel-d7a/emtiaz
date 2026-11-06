export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
export type CourseType = 'ACADEMIC' | 'GENERAL';
export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'WRITTEN';
export type TeacherTheme = {
  layout: 'banner' | 'split';
  primary: string;
  secondary: string;
  marquee: string;
  arabicFont: 'cairo' | 'readex' | 'tajawal';
  englishFont: 'dm-sans' | 'inter' | 'cairo';
};

export type AttachmentType =
  | 'PDF'
  | 'DOC'
  | 'AUDIO'
  | 'IMAGE'
  | 'ARCHIVE'
  | 'LINK'
  | 'VIDEO';

export type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  phoneNumber: string | null;
  phoneNumberVerified: boolean | null;
  role: Role;
  landingSlug: string | null;
  landingBio: string | null;
  landingTheme: TeacherTheme | null;
  landingPublished: boolean;
  isActive: boolean;
  mustChangePassword: boolean;
  dateOfBirth: string | null;
  subjectCategoryId: string | null;
  gradeId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminPermission =
  | 'overview'
  | 'teachers'
  | 'students'
  | 'parents'
  | 'courses'
  | 'taxonomy'
  | 'notifications'
  | 'audit'
  | 'settings'
  | 'roles'
  | 'users';

export type SessionUser = Pick<User, 'id' | 'name' | 'email' | 'role'> &
  Partial<
    Pick<User, 'subjectCategoryId' | 'phoneNumber' | 'gradeId' | 'landingSlug' | 'mustChangePassword'>
  > & { image?: string | null; permissions?: AdminPermission[] };

export type Session = { user: SessionUser; session?: unknown } | null;

export type AdminRole = {
  id: string;
  name: string;
  permissions: AdminPermission[];
  createdAt: string;
  updatedAt: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  adminRoleId: string | null;
  adminRoleName: string | null;
  createdAt: string;
};

export type AdminTeacherRow = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  deletedAt: string | null;
  landingSlug: string | null;
  landingPublished: boolean;
  subjectCategoryId: string | null;
  subject: { id: string | null; name: string | null } | null;
  courseCount: number;
  groupCount: number;
  uniqueStudentCount: number;
};

export type AdminStudentRow = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  gradeId: string | null;
  isActive: boolean;
  createdAt: string;
  deletedAt: string | null;
  enrollments: Array<{ groupName: string; courseTitle: string; courseId: string }>;
};

export type AdminStudentGroup = {
  groupId: string;
  groupName: string;
  courseId: string;
  courseTitle: string;
  teacherId: string;
  teacherName: string;
  joinedAt: string;
  attendancePercent: number;
};

export type AdminStudentProfile = Omit<AdminStudentRow, 'enrollments'> & {
  gradeName: string | null;
  parents: Array<{ id: string; name: string; email: string; phoneNumber: string | null }>;
  groups: AdminStudentGroup[];
  quiz: { attempts: number; averagePercent: number };
};

export type AdminParentChild = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  gradeName: string | null;
};

export type AdminParentRow = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  isActive: boolean;
  createdAt: string;
  deletedAt: string | null;
  children: Array<Pick<AdminParentChild, 'id' | 'name' | 'email'>>;
};

export type AdminDeliveredReport = {
  id: string;
  channel: string;
  type: string;
  message: string;
  status: string;
  createdAt: string;
};

export type AdminParentReport = {
  id: string;
  studentId: string;
  studentName: string;
  message: string;
  createdAt: string;
};

export type AdminParentProfile = Omit<AdminParentRow, 'children'> & {
  children: AdminParentChild[];
  feedback: AdminParentReport[];
  deliveredReports: AdminDeliveredReport[];
};

export type AdminCourseRow = Course & {
  deletedAt: string | null;
  teacherName: string;
  categoryName: string | null;
  gradeName: string | null;
  groups: Array<{ id: string; name: string; joinCode: string; studentCount: number }>;
};

export type AdminGroupRow = {
  id: string;
  name: string;
  joinCode: string;
  isActive: boolean;
  courseId: string;
  courseTitle: string;
  deletedAt: string | null;
};

export type AdminParentLink = {
  parentId: string;
  parentName: string;
  studentId: string;
  studentName: string;
  deletedAt: string | null;
};

export type AdminNotification = {
  id: string;
  channel: string;
  type: string;
  message: string;
  status: string;
  createdAt: string;
};

export type AdminAuditEntry = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  endpoint: string | null;
  responseType: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actorName: string;
  actorPhone: string | null;
  actorRole: Role;
};
export type MeResponse = {
  user: User;
  avatarUrl: string | null;
  bannerUrl: string | null;
};

export type TaxonomyItem = {
  id: string;
  name: string;
  displayOrder?: number;
};

export type Course = {
  id: string;
  title: string;
  description: string | null;
  courseType: CourseType;
  teacherId: string;
  gradeId: string | null;
  semester: string | null;
  categoryId: string | null;
  image: string | null;
  previewUrl: string | null;
  isPublished: boolean;
  createdAt: string;
};

export type PublicSupport = {
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
};

export type SiteBranding = {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
};

export type PublicSite = {
  branding: SiteBranding;
  support: PublicSupport;
};

export type PublicTeacher = {
  name: string;
  email: string;
  phoneNumber: string | null;
  bio: string | null;
  subject: string | null;
  avatarUrl: string | null;
  theme: TeacherTheme | null;
  bannerUrl: string | null;
};

export type PublicCourseCard = Pick<
  Course,
  'id' | 'title' | 'description' | 'courseType'
> & { imageUrl: string | null };

export type PublicTeacherPage = {
  teacher: PublicTeacher;
  courses: PublicCourseCard[];
  support: PublicSupport;
};

export type CatalogueTeacher = {
  id: string;
  name: string;
  slug: string;
  theme: TeacherTheme | null;
};

export type CatalogueCourse = Pick<
  Course,
  'id' | 'title' | 'description' | 'courseType' | 'semester'
> & {
  imageUrl: string | null;
  teacher: CatalogueTeacher;
  subject: string | null;
  grade: string | null;
};

export type CourseCatalogue = {
  courses: CatalogueCourse[];
  filters: {
    teachers: Array<{ id: string; name: string; slug: string }>;
    subjects: TaxonomyItem[];
    grades: TaxonomyItem[];
    semesters: string[];
  };
};

export type PublicCoursePage = {
  teacher: PublicTeacher;
  course: Omit<Course, 'image'> & {
    imageUrl: string | null;
    gradeName: string | null;
    categoryName: string | null;
  };
  modules: Array<{ id: string; title: string; lessons: string[] }>;
  support: PublicSupport;
};

export type Group = {
  id: string;
  courseId: string;
  name: string;
  joinCode: string;
  days: string | null;
  time: string | null;
  whatsappMessage: string | null;
  requiresEntryCode: boolean;
  unlockAllByDefault: boolean;
  isActive: boolean;
  createdAt: string;
};

export type GroupEntryCodeUse = {
  studentId: string;
  name: string;
  phoneNumber: string | null;
  usedAt: string;
};

export type GroupEntryCode = {
  id: string;
  groupId: string;
  code: string;
  maxUses: number;
  usedCount: number;
  usedUp: boolean;
  createdAt: string;
  uses: GroupEntryCodeUse[];
};

export type TeacherEntryCodes = {
  group: Group;
  codes: GroupEntryCode[];
};

export type Module = {
  id: string;
  courseId: string;
  title: string;
  displayOrder: number;
};

export type Lesson = {
  id: string;
  moduleId: string;
  title: string;
  content: string | null;
  displayOrder: number;
  createdAt: string;
};

export type Attachment = {
  id: string;
  lessonId: string;
  groupId: string | null;
  title: string;
  r2ObjectKey: string | null;
  url: string | null;
  fileType: AttachmentType;
  fileSizeBytes: number | null;
  mimeType: string | null;
  createdAt: string;
};

/** Student-facing attachment: storage keys stay server-side. */
export type StudentAttachment = Omit<Attachment, 'r2ObjectKey'>;

export type Quiz = {
  id: string;
  lessonId: string | null;
  moduleId: string | null;
  courseId: string | null;
  title: string;
  displayOrder: number;
};

export type QuizQuestion = {
  id: string;
  questionType: QuestionType;
  prompt: string;
  imageUrl: string | null;
  options: string[] | null;
  points: number;
};

export type QuizAttempt = {
  id: string;
  quizId: string;
  studentId: string;
  groupId: string;
  score: number;
  maxScore: number;
  answersJson: Record<string, string>;
  pending: boolean;
  writtenGrades: Record<string, number> | null;
  submittedAt: string;
};

export type QuizWithAttempt = Quiz & {
  bestAttempt: QuizAttempt | null;
};

export type StudentGroup = {
  group: Group;
  course: Course;
  joinedAt: string;
  teacher: {
    name: string;
    subject: string | null;
    theme: TeacherTheme | null;
    bannerUrl: string | null;
  };
  progress: number;
  completedLessons: number;
  totalLessons: number;
};

export type StudentHome = {
  stats: { activeGroups: number; lessonsDone: number; averageGrade: number };
  latestCourses: StudentGroup[];
};

export type StudentLesson = Lesson & {
  unlocked: boolean;
  completed: boolean;
  hasQuiz: boolean;
  bestAttempt: QuizAttempt | null;
  quizzes: QuizWithAttempt[];
  attachments: StudentAttachment[];
};

export type StudentModule = Module & {
  quizzes: QuizWithAttempt[];
  lessons: StudentLesson[];
};

export type StudentCurriculum = {
  course: Course;
  teacher: {
    name: string;
    theme: TeacherTheme | null;
    bannerUrl: string | null;
    avatarUrl: string | null;
    slug: string | null;
  };
  group: Pick<Group, 'id' | 'name' | 'joinCode'>;
  quizzes: QuizWithAttempt[];
  modules: StudentModule[];
};

export type StudentLessonView = {
  title: string;
  content: string | null;
  completed: boolean;
  attachments: Array<Pick<Attachment, 'id' | 'title' | 'fileType' | 'mimeType' | 'url'>>;
  hasQuiz: boolean;
};

export type QuizAttemptResult = {
  answers: Record<string, string>;
  score: number;
  maxScore: number;
  pending: boolean;
  writtenGrades: Record<string, number> | null;
  submittedAt: string;
  result: QuizResult[];
};

export type QuizPayload = {
  quiz: Quiz | null;
  questions: QuizQuestion[];
  attempt?: QuizAttemptResult | null;
};

export type QuizResult = {
  questionId: string;
  correct: boolean;
  expected: string;
  explanation: string | null;
};

export type QuizSubmission = {
  score: number;
  maxScore: number;
  pending: boolean;
  result: QuizResult[];
};

export type TeacherQuizSubmission = {
  id: string;
  student: { id: string; name: string; phoneNumber: string | null };
  score: number;
  maxScore: number;
  pending: boolean;
  answers: Record<string, string>;
  writtenGrades: Record<string, number> | null;
  submittedAt: string;
};

export type TeacherQuizSubmissions = {
  quiz: Pick<Quiz, 'id' | 'title'>;
  questions: TeacherQuizQuestion[];
  submissions: TeacherQuizSubmission[];
};

export type GradeQuiz = {
  quizId: string;
  title: string;
  unitTitle: string;
  lessonTitle: string;
  score: number;
  maxScore: number;
  pending: boolean;
};

export type ManualGrade = {
  columnId: string;
  title: string;
  maxScore: number;
  score: number | null;
  note: string | null;
};

export type StudentGrades = {
  quizzes: GradeQuiz[];
  manual: ManualGrade[];
};

export type TeacherStats = { curricula: number; groups: number; uniqueStudents: number };

export type TeacherGroup = Group & { studentCount: number; progress: number };

export type TeacherCourse = Course & {
  imageUrl: string | null;
  analytics: {
    students: number;
    groups: number;
    lessons: number;
    avgProgress: number;
  };
  latestLesson: Pick<Lesson, 'id' | 'title'> | null;
  groups: TeacherGroup[];
};

export type TeacherQuizQuestion = QuizQuestion & {
  imageKey: string | null;
  correctAnswer: string;
};

export type TeacherQuiz = Quiz & { questions: TeacherQuizQuestion[] };

export type TeacherCurriculumLesson = Lesson & {
  quizzes: TeacherQuiz[];
  attachments: Attachment[];
};

export type TeacherCurriculumModule = Module & {
  quizzes: TeacherQuiz[];
  lessons: TeacherCurriculumLesson[];
};

export type TeacherCurriculum = {
  quizzes: TeacherQuiz[];
  modules: TeacherCurriculumModule[];
};

export type PacingLesson = Lesson & {
  unlocked: boolean;
  overridden: boolean;
  hidden: boolean;
};

export type PacingQuiz = Quiz & {
  hidden: boolean;
  scope: 'course' | 'module' | 'lesson';
  contextTitle: string;
};

export type TeacherPacing = {
  group: Group;
  lessons: PacingLesson[];
  quizzes: PacingQuiz[];
};

export type TeacherGroupStats = {
  group: Group;
  startDate: string;
  lessons: { taken: number; total: number; percent: number };
  units: { taken: number; total: number; percent: number };
  attendance: Array<{
    lessonId: string;
    title: string;
    moduleTitle: string;
    present: number;
    total: number;
    percent: number;
  }>;
  quizAverages: Array<{
    quizId: string;
    title: string;
    contextTitle: string;
    average: number | null;
    attempts: number;
  }>;
  students: Array<{
    id: string;
    name: string;
    gradePercent: number | null;
    attendancePercent: number;
    combined: number;
  }>;
};

export type StudentSearchResult = {
  id: string;
  name: string;
  phoneNumber: string | null;
};

export type RosterStudent = {
  studentId: string;
  name: string;
  phoneNumber: string | null;
  joinedAt: string;
  completedLessons: number;
  totalLessons: number;
  progress: number;
};

export type TeacherRoster = {
  group: Group;
  students: RosterStudent[];
};

export type AttendanceStudent = {
  studentId: string;
  name: string;
  isPresent: boolean | null;
  markedAt: string | null;
};

export type TeacherAttendance = {
  lessonId: string;
  title: string;
  students: AttendanceStudent[];
};

export type GradebookStudent = {
  id: string;
  name: string;
  phoneNumber: string | null;
};

export type QuizColumn = {
  quizId: string;
  lessonTitle: string;
  maxScore: number;
};

export type ManualGradeColumn = {
  id: string;
  groupId: string;
  title: string;
  maxScore: number;
  displayOrder: number;
  createdAt: string;
};

export type ManualGradeCell = {
  columnId: string;
  studentId: string;
  score: number | null;
  note: string | null;
};

export type TeacherGradebook = {
  group: Group;
  students: GradebookStudent[];
  attendance: Record<string, number>;
  quizColumns: QuizColumn[];
  quizCells: Record<string, number>;
  manualColumns: ManualGradeColumn[];
  manualCells: ManualGradeCell[];
};

export type ParentAttendance = { present: number; total: number; percent: number };
export type ParentChildGroup = StudentGroup & {
  attendance: ParentAttendance;
  averageGrade: number;
};
export type ParentReport = { id: string; message: string; createdAt: string };

export type ParentChild = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  gradeId: string | null;
  groups: ParentChildGroup[];
  reports: ParentReport[];
};

export type InboxItem = {
  id: string;
  type: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

export type UnreadCount = { unread: number };
export type SentResponse = { sent: number };
export type OkResponse = { ok: true };
export type PresignedUpload = { objectKey: string; uploadUrl: string };
export type DownloadUrl = { url: string };
