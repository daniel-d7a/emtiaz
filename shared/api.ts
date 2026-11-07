export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
export type Country = 'OM' | 'EG';
export type Currency = 'OMR' | 'EGP';
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
  | 'VIDEO'
  | 'NONE'
  | 'OTHER';

export type TaughtGrade = {
  id: string;
  name: string;
  nameAr: string;
  nameEn: string;
  country: Country;
  displayOrder?: number;
};

export type GradeItem = {
  id: string;
  name: string;
  nameAr: string;
  nameEn: string;
  country: Country;
  displayOrder: number;
};

export type CategoryItem = {
  id: string;
  name: string;
  nameAr: string;
  nameEn: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  phoneNumber: string | null;
  phoneNumberVerified: boolean | null;
  role: Role;
  country: Country;
  courseFocus?: CourseType;
  onboardingCompletedAt?: string | null;
  taughtGrades?: TaughtGrade[];
  monitoringCode?: string | null;
  landingSlug: string | null;
  landingBio: string | null;
  landingTheme: TeacherTheme | null;
  landingPublished: boolean;
  isTopTeacher: boolean;
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
    Pick<
      User,
      | 'subjectCategoryId'
      | 'phoneNumber'
      | 'gradeId'
      | 'landingSlug'
      | 'mustChangePassword'
      | 'country'
      | 'courseFocus'
      | 'onboardingCompletedAt'
      | 'monitoringCode'
    >
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
  isTopTeacher: boolean;
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
  courseFocus?: CourseType;
  onboardingCompletedAt?: string | null;
  taughtGrades?: TaughtGrade[];
};
export type GetMeResponse = MeResponse;
export type StudentProfile = User & { monitoringCode?: string | null };

export type ParentLinkDto = {
  monitoringCode: string;
};

export type CheckAvailabilityDto = {
  email?: string;
  phoneNumber?: string;
  country?: Country;
};

export type CheckAvailabilityResponse = {
  available: boolean;
  field?: 'email' | 'phoneNumber';
  reason?: string;
};

export type RegisterTeacherDto = {
  name: string;
  email?: string;
  password: string;
  phoneNumber: string;
  country?: Country;
  courseFocus?: CourseType;
  gradeIds?: string[];
  customGrades?: string[];
  subject?: string;
};

export type TaxonomyItem = {
  id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  country?: Country;
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
  supportWhatsapp?: string | null;
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

export type Plan = {
  id: string;
  slug: string;
  tierRank: number;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  monthlyPriceOmr: number;
  yearlyMonthlyPriceOmr: number;
  monthlyPriceEgp: number;
  yearlyMonthlyPriceEgp: number;
  maxStudents: number | null;
  maxStorageBytes: number | null;
  maxGroups: number | null;
  trialDays: number;
  isPublic: boolean;
  isDefault: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicPlan = {
  id: string;
  slug: string;
  tierRank: number;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  monthlyPriceOmr: number;
  yearlyMonthlyPriceOmr: number;
  monthlyPriceEgp: number;
  yearlyMonthlyPriceEgp: number;
  maxStudents: number | null;
  maxStorageBytes: number | null;
  maxGroups: number | null;
  trialDays: number;
  displayOrder: number;
};

export type PublicPlansResponse = {
  plans: PublicPlan[];
  yearlyPlanDiscountEnabled: boolean;
  supportWhatsapp: string | null;
};

export type TeacherEntitlementStatus = 'ACTIVE' | 'TRIAL' | 'FREE' | 'EXPIRED';

export type TeacherActivePlan = {
  slug: string;
  nameAr: string;
  nameEn: string;
  tierRank: number;
  maxStudents: number | null;
  maxStorageBytes: number | null;
  maxGroups: number | null;
  startsAt: string | null;
  endsAt: string | null;
  source: string;
  status: TeacherEntitlementStatus;
  billingCycle?: string | null;
  pricePaid?: number | null;
  currency?: string | null;
};

export type TeacherUsage = {
  activeStudentCount: number;
  usedStorageBytes: number;
  activeGroupCount: number;
};

export type TeacherUpgradeOption = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  tierRank: number;
  monthlyPrice: number;
  yearlyMonthlyPrice: number;
  currency: Currency;
  maxStudents: number | null;
  maxStorageBytes: number | null;
  firstMonthDiscountPrice: number | null;
  firstMonthDiscountEligible: boolean;
};

export type PlanLimitType = 'STUDENTS' | 'STORAGE';

export type PlanLimitReachedResponse = {
  error: 'PLAN_LIMIT_REACHED';
  limitType: PlanLimitType;
  currentUsage: number;
  limit: number;
  upgradeOptions: TeacherUpgradeOption[];
  customPlanPrompt: string | null;
};

export type UpgradeGateLockedResponse = {
  error: 'UPGRADE_GATE_LOCKED';
  message: string;
};

export type SavedGift = {
  id: string;
  planSlug: string;
  planNameAr: string;
  planNameEn: string;
  tierRank: number;
  durationDays: number;
  source: string;
  createdAt: string;
};

export type ReferralItem = {
  takerName: string;
  status: string;
  createdAt: string;
};

export type ReferralSummary = {
  referralCode: string | null;
  usedCount: number;
  maxReferrals: number;
  referrals: ReferralItem[];
};

export type TeacherEntitlementsResponse = {
  activePlan: TeacherActivePlan;
  usage: TeacherUsage;
  country: Country;
  currency: Currency;
  isLockedOut: boolean;
  supportWhatsapp: string | null;
  upgradeOptions: TeacherUpgradeOption[];
  customPlanPrompt: string | null;
  savedGifts: SavedGift[];
  referral?: ReferralSummary;
};

export type RedeemCodeDto = {
  code: string;
};

export type RedeemCodeResponse = {
  success: boolean;
  message: string;
  action: 'ACTIVATED' | 'EXTENDED' | 'SAVED';
  planNameAr: string;
  planNameEn: string;
  durationDays: number;
};

export type ActivateGiftResponse = {
  success: boolean;
  message: string;
  planNameAr: string;
  planNameEn: string;
};

export type DeleteGiftResponse = {
  success: boolean;
};

export type CreatePlanDto = {
  slug: string;
  tierRank?: number;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  monthlyPriceOmr?: number;
  yearlyMonthlyPriceOmr?: number;
  monthlyPriceEgp?: number;
  yearlyMonthlyPriceEgp?: number;
  maxStudents?: number | null;
  maxStorageBytes?: number | null;
  maxGroups?: number | null;
  trialDays?: number;
  isPublic?: boolean;
  isDefault?: boolean;
  displayOrder?: number;
};

export type UpdatePlanDto = {
  tierRank?: number;
  nameAr?: string;
  nameEn?: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  monthlyPriceOmr?: number;
  yearlyMonthlyPriceOmr?: number;
  monthlyPriceEgp?: number;
  yearlyMonthlyPriceEgp?: number;
  maxStudents?: number | null;
  maxStorageBytes?: number | null;
  maxGroups?: number | null;
  trialDays?: number;
  isPublic?: boolean;
  isDefault?: boolean;
  displayOrder?: number;
};

export type AdminPromoCode = {
  id: string;
  code: string;
  planId: string;
  planSlug: string;
  planNameAr: string;
  planNameEn: string;
  durationDays: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
};

export type CreatePromoCodeDto = {
  code: string;
  planId: string;
  durationDays: number;
  maxUses?: number | null;
  expiresAt?: string | null;
};

export type UpdatePromoCodeDto = {
  isActive?: boolean;
  maxUses?: number | null;
  expiresAt?: string | null;
};

export type TeacherDiscountRecord = {
  id: string;
  occasion: string;
  planSlug: string;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
};

export type AdminTeacherEntitlementsResponse = {
  teacherId: string;
  teacherName: string;
  teacherEmail: string | null;
  teacherPhone: string | null;
  country: Country;
  currency: Currency;
  activePlan: TeacherActivePlan;
  usage: TeacherUsage;
  isLockedOut: boolean;
  savedGifts: SavedGift[];
  referral?: ReferralSummary;
  discounts: TeacherDiscountRecord[];
};

export type AdminAssignSubscriptionDto = {
  planId: string;
  currency: 'OMR' | 'EGP';
  billingCycle: 'MONTHLY' | 'YEARLY';
  durationDays?: number;
  pricePaid?: number;
  recordLimitCrossingDiscount?: boolean;
};

export type AdminGrantGiftDto = {
  planId: string;
  durationDays: number;
  adminOverride?: boolean;
  note?: string;
};

export type TeacherSummary = {
  id: string;
  name: string;
  landingSlug: string | null;
  image: string | null;
  subject: string | null;
  landingBio: string | null;
  isTopTeacher: boolean;
};

export type PublicTeacher = {
  name: string;
  email: string | null;
  phoneNumber: string | null;
  bio: string | null;
  subject: string | null;
  avatarUrl: string | null;
  theme: TeacherTheme | null;
  bannerUrl: string | null;
  isTopTeacher: boolean;
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
  isTopTeacher?: boolean;
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
    isTopTeacher?: boolean;
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
    isTopTeacher?: boolean;
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

export type StudentHomeworkGrade = {
  homeworkId: string;
  title: string;
  maxScore: number;
  dueDate: string | null;
  score: number | null;
  status: HomeworkSubmissionStatus | string;
  isLate: boolean;
  teacherFeedback: string | null;
};

export type StudentGrades = {
  quizzes: GradeQuiz[];
  manual: ManualGrade[];
  homework?: StudentHomeworkGrade[];
  homeworkColumns?: HomeworkColumn[];
  gradePercent?: number | null;
};

export type StudentGradebook = {
  gradePercent: number | null;
  quizzes: GradeQuiz[];
  manual: ManualGrade[];
  homework: StudentHomeworkGrade[];
  homeworkColumns: HomeworkColumn[];
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
  gradePercent?: number | null;
  homework?: Record<string, HomeworkCell>;
};

export type QuizColumn = {
  quizId: string;
  lessonTitle: string;
  maxScore: number;
};

export type HomeworkColumn = {
  id: string;
  title: string;
  maxScore: number;
  dueDate: string | null;
};

export type HomeworkCell = {
  score: number | null;
  status: HomeworkSubmissionStatus | string;
  isLate: boolean;
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
  homeworkColumns?: HomeworkColumn[];
  homeworkCells?: Record<string, HomeworkCell>;
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

// ==========================================
// HOMEWORK & SUBMISSIONS CONTRACTS
// ==========================================

export type HomeworkAttachmentType =
  | 'NONE'
  | 'PDF'
  | 'DOC'
  | 'AUDIO'
  | 'IMAGE'
  | 'ARCHIVE'
  | 'LINK'
  | 'VIDEO'
  | 'OTHER';

export type HomeworkSubmissionStatus = 'SUBMITTED' | 'GRADED' | 'REVISION_REQUESTED';

export interface HomeworkDto {
  id: string;
  lessonId: string;
  groupId: string | null;
  title: string;
  instructions: string | null;
  attachmentType: HomeworkAttachmentType;
  r2ObjectKey: string | null;
  url: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  maxScore: number;
  displayOrder: number;
  createdAt: string;
  // Cohort-specific properties when queried in the context of a group:
  dueDate?: string | null;
  isHidden?: boolean;
}

export interface HomeworkSubmissionDto {
  id: string;
  homeworkId: string;
  groupId: string;
  studentId: string;
  studentName?: string;
  content: string | null;
  attachmentType: HomeworkAttachmentType;
  r2ObjectKey: string | null;
  url: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  status: HomeworkSubmissionStatus;
  isLate: boolean;
  revisionCount: number;
  score: number | null;
  maxScore?: number;
  teacherFeedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
}

export interface HomeworkRosterSummaryDto {
  homework: HomeworkDto;
  stats: {
    totalEnrolled: number;
    submitted: number;
    graded: number;
    pendingReview: number;
    revisionRequested: number;
    notSubmitted: number;
    late: number;
  };
  submissions: Array<{
    studentId: string;
    studentName: string;
    submission: HomeworkSubmissionDto | null;
  }>;
}

export interface CreateHomeworkDto {
  title: string;
  instructions?: string | null;
  attachmentType?: HomeworkAttachmentType;
  r2ObjectKey?: string | null;
  url?: string | null;
  fileSizeBytes?: number | null;
  mimeType?: string | null;
  maxScore?: number;
  displayOrder?: number;
  groupId?: string | null;
}

export interface UpdateHomeworkDto {
  title?: string;
  instructions?: string | null;
  attachmentType?: HomeworkAttachmentType;
  r2ObjectKey?: string | null;
  url?: string | null;
  fileSizeBytes?: number | null;
  mimeType?: string | null;
  maxScore?: number;
  displayOrder?: number;
}

export interface SetGroupHomeworkAccessDto {
  dueDate?: string | null;
  isHidden?: boolean;
}

export interface GroupHomeworkAccessDto {
  id: string;
  groupId: string;
  homeworkId: string;
  dueDate: string | null;
  isHidden: boolean;
  createdAt: string;
}

export interface StudentHomeworkDto extends HomeworkDto {
  homework?: HomeworkDto;
  submission: HomeworkSubmissionDto | null;
}

export interface SubmitHomeworkDto {
  content?: string | null;
  attachmentType?: HomeworkAttachmentType;
  r2ObjectKey?: string | null;
  url?: string | null;
  fileSizeBytes?: number | null;
  mimeType?: string | null;
}

export interface GradeHomeworkSubmissionDto {
  score?: number | null;
  teacherFeedback?: string | null;
  action: 'SAVE_GRADE' | 'REQUEST_REVISION';
}

export interface ParentChildHomeworkSubmissionDto {
  status: HomeworkSubmissionStatus | string;
  score: number | null;
  teacherFeedback: string | null;
  submittedAt: string;
  isLate: boolean;
}

export interface ParentChildHomeworkDto {
  id: string;
  title: string;
  instructions: string | null;
  maxScore: number;
  groupName: string;
  dueDate: string | null;
  isUrgent: boolean;
  submission: ParentChildHomeworkSubmissionDto | null;
}

export interface ResetUserPasswordDto {
  password?: string;
}

export interface ResetUserPasswordResultDto {
  success: boolean;
  temporaryPassword: string;
  userId: string;
  userName: string;
  userPhone: string | null;
}

export * from './audit-events';


