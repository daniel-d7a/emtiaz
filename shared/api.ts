export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
export type CourseType = 'ACADEMIC' | 'GENERAL';
export type QuestionType = 'MCQ' | 'TRUE_FALSE';
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
  image: string | null;
  role: Role;
  landingSlug: string | null;
  landingBio: string | null;
  landingBanner: string | null;
  landingTheme: TeacherTheme | null;
  landingPublished: boolean;
  isActive: boolean;
  subjectCategoryId: string | null;
  gradeId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type SessionUser = Pick<User, 'id' | 'name' | 'email' | 'role'> &
  Partial<
    Pick<
      User,
      | 'subjectCategoryId'
      | 'phoneNumber'
      | 'gradeId'
      | 'image'
    >
  >;

export type Session = { user: SessionUser; session?: unknown } | null;
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

export type PublicCoursePage = {
  teacher: Omit<PublicTeacher, 'avatarUrl' | 'bio' | 'subject'>;
  course: Course & { imageUrl: string | null };
  modules: Array<{ id: string; title: string; lessons: string[] }>;
  support: PublicSupport;
};

export type Group = {
  id: string;
  courseId: string;
  name: string;
  joinCode: string;
  unlockAllByDefault: boolean;
  isActive: boolean;
  createdAt: string;
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
  r2ObjectKey: string;
  publicOrSignedUrl: string;
  fileType: AttachmentType;
  fileSizeBytes: number | null;
  mimeType: string | null;
  createdAt: string;
};

export type Quiz = {
  id: string;
  lessonId: string | null;
  moduleId: string | null;
  courseId: string | null;
  title: string;
};

export type QuizQuestion = {
  id: string;
  questionType: QuestionType;
  prompt: string;
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
  submittedAt: string;
};

export type QuizWithAttempt = Quiz & {
  bestAttempt: QuizAttempt | null;
};

export type StudentGroup = {
  group: Group;
  course: Course;
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

export type StudentLesson = Lesson & {
  unlocked: boolean;
  completed: boolean;
  hasQuiz: boolean;
  bestAttempt: QuizAttempt | null;
  attachments: Attachment[];
};

export type StudentModule = Module & {
  quiz: QuizWithAttempt | null;
  lessons: StudentLesson[];
};

export type StudentCurriculum = {
  course: Course;
  teacher: { name: string; theme: TeacherTheme | null; bannerUrl: string | null };
  group: Pick<Group, 'id' | 'name' | 'joinCode'>;
  quiz: QuizWithAttempt | null;
  modules: StudentModule[];
};

export type StudentLessonView = {
  title: string;
  content: string | null;
  completed: boolean;
  attachments: Array<Pick<Attachment, 'id' | 'title'>>;
  hasQuiz: boolean;
};

export type QuizPayload = {
  quiz: Quiz | null;
  questions: QuizQuestion[];
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
  result: QuizResult[];
};

export type GradeQuiz = {
  quizId: string;
  title: string;
  lessonTitle: string;
  score: number;
  maxScore: number;
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

export type TeacherGroup = Group & { studentCount: number };

export type TeacherCourse = Course & {
  imageUrl: string | null;
  analytics: {
    students: number;
    groups: number;
    lessons: number;
    avgProgress: number;
  };
  groups: TeacherGroup[];
};

export type PacingLesson = Lesson & {
  unlocked: boolean;
  overridden: boolean;
};

export type TeacherPacing = {
  group: Group;
  lessons: PacingLesson[];
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
  quizColumns: QuizColumn[];
  quizCells: Record<string, number>;
  manualColumns: ManualGradeColumn[];
  manualCells: ManualGradeCell[];
};

export type ParentChild = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  gradeId: string | null;
  groups: StudentGroup[];
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
