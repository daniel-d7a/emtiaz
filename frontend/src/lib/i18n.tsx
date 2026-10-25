import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type Lang = 'ar' | 'en';

const dict = {
  // shared
  appName: { ar: 'امتياز', en: 'Emtiaz' },
  tagline: { ar: 'منصة إدارة تعلّم بسيطة للمعلمين والطلبة في سلطنة عُمان', en: 'A simple LMS for teachers and students in the Sultanate of Oman' },
  login: { ar: 'تسجيل الدخول', en: 'Log in' },
  logout: { ar: 'خروج', en: 'Log out' },
  register: { ar: 'إنشاء حساب', en: 'Sign up' },
  email: { ar: 'البريد الإلكتروني', en: 'Email' },
  password: { ar: 'كلمة المرور', en: 'Password' },
  name: { ar: 'الاسم الكامل', en: 'Full name' },
  phone: { ar: 'رقم الهاتف', en: 'Phone number' },
  notifications: { ar: 'الإشعارات', en: 'Notifications' },
  markAllRead: { ar: 'تحديد الكل كمقروء', en: 'Mark all read' },
  sendMonthlySummary: { ar: 'إرسال الملخص الشهري', en: 'Send monthly summary' },
  auditLog: { ar: 'سجل الإدارة', en: 'Audit log' },
  filterAction: { ar: 'تصفية حسب الإجراء', en: 'Filter by action' },
  whatsapp: { ar: 'واتساب', en: 'WhatsApp' },
  inApp: { ar: 'داخل التطبيق', en: 'In-app' },
  system: { ar: 'النظام', en: 'System' },
  recentNotifications: { ar: 'أحدث الإشعارات', en: 'Recent notifications' },
  noNotifications: { ar: 'لا توجد إشعارات بعد.', en: 'No notifications yet.' },
  specialization: { ar: 'التخصص', en: 'Specialization' },
  teacher: { ar: 'معلم', en: 'Teacher' },
  student: { ar: 'طالب', en: 'Student' },
  parent: { ar: 'ولي أمر', en: 'Parent' },
  parents: { ar: 'أولياء الأمور', en: 'Parents' },
  myChildren: { ar: 'أبنائي', en: 'My children' },
  childCode: { ar: 'رمز الطالب', en: 'Student code' },
  linkChild: { ar: 'ربط الطالب', en: 'Link student' },
  unlinkChild: { ar: 'فصل الطالب', en: 'Unlink child' },
  noChildren: { ar: 'لم يتم ربط أي طالب بعد — استخدم رمز الطالب.', en: 'No students linked yet — use the student code.' },
  viewGrades: { ar: 'عرض الدرجات', en: 'View grades' },
  parentCode: { ar: 'رمز ولي الأمر', en: 'Parent code' },
  parentCodeHint: { ar: 'شارك هذا الرمز مع ولي أمرك لربط حسابه.', en: 'Share this code with a parent to link their account.' },
  rotateParentCode: { ar: 'تجديد الرمز وفصل أولياء الأمور', en: 'Rotate code and unlink parents' },
  rotateConfirm: { ar: 'سيتم فصل جميع أولياء الأمور المرتبطين. متابعة؟', en: 'All linked parents will be disconnected. Continue?' },
  landingPage: { ar: 'صفحة المعلم العامة', en: 'Public teacher page' },
  landingSlug: { ar: 'رابط الصفحة', en: 'Page link' },
  landingBio: { ar: 'نبذة عنك', en: 'About you' },
  publishLanding: { ar: 'نشر الصفحة', en: 'Publish page' },
  viewLanding: { ar: 'عرض الصفحة', en: 'View page' },
  landingUnavailable: { ar: 'هذه الصفحة غير متاحة.', en: 'This page is not available.' },
  coursesBy: { ar: 'مقررات', en: 'Courses by' },
  registerInterest: { ar: 'سجّل اهتمامك', en: 'Register your interest' },
  admin: { ar: 'مدير', en: 'Admin' },
  grade: { ar: 'الصف', en: 'Grade' },
  semester: { ar: 'الفصل الدراسي', en: 'Semester' },
  save: { ar: 'حفظ', en: 'Save' },
  cancel: { ar: 'إلغاء', en: 'Cancel' },
  add: { ar: 'إضافة', en: 'Add' },
  delete: { ar: 'حذف', en: 'Delete' },
  loading: { ar: 'جارٍ التحميل…', en: 'Loading…' },
  areTeacherStudent: { ar: 'هل أنت معلم أم طالب؟', en: 'Teacher or student?' },
  joinCode: { ar: 'رمز المجموعة', en: 'Group code' },
  join: { ar: 'انضم', en: 'Join' },
  joinPrompt: { ar: 'أدخل الرمز المكوَّن من 6 أرقام', en: 'Enter the 6-digit code' },
  joinedOk: { ar: 'انضممت إلى المجموعة بنجاح!', en: 'Joined the group!' },
  joining: { ar: 'يتم الانضمام…', en: 'Joining…' },
  joinClass: { ar: 'انضم إلى مجموعة', en: 'Join group' },
  oneStepJoin: { ar: 'خطوة واحدة فقط وأنت معنا', en: 'One step and you are in' },
  joinNow: { ar: 'إنشاء حساب والانضمام', en: 'Create account & join' },
  // student
  myCourses: { ar: 'مقرراتي', en: 'My courses' },
  enterCode: { ar: 'رمز مجموعة', en: 'Group code' },
  progress: { ar: 'التقدّم', en: 'Progress' },
  lessons: { ar: 'الدروس', en: 'Lessons' },
  download: { ar: 'تنزيل', en: 'Download' },
  quiz: { ar: 'اختبار قصير', en: 'Quiz' },
  submit: { ar: 'إرسال', en: 'Submit' },
  retry: { ar: 'إعادة المحاولة', en: 'Retry' },
  exportCsv: { ar: 'تصدير CSV', en: 'Export CSV' },
  loadMore: { ar: 'عرض المزيد', en: 'Load more' },
  yourScore: { ar: 'نتيجتك', en: 'Your score' },
  markComplete: { ar: 'إتمام الدرس', en: 'Mark as complete' },
  completed: { ar: 'تم', en: 'Completed' },
  myGrades: { ar: 'درجاتي', en: 'My grades' },
  locked: { ar: 'مقفل', en: 'Locked' },
  // teacher
  myWorkspace: { ar: 'استوديو المعلم', en: 'Teacher studio' },
  courses: { ar: 'المقررات', en: 'Courses' },
  newCourse: { ar: 'مقرر جديد', en: 'New course' },
  academic: { ar: 'منهج مدرسي', en: 'School curriculum' },
  general: { ar: 'مهارة عامة', en: 'Skill course' },
  curriculum: { ar: 'خطة المقرر', en: 'Curriculum' },
  modules: { ar: 'الوحدات', en: 'Modules' },
  newModule: { ar: 'وحدة جديدة', en: 'New module' },
  newLesson: { ar: 'درس جديد', en: 'New lesson' },
  groups: { ar: 'المجموعات', en: 'Groups' },
  newGroup: { ar: 'مجموعة جديدة', en: 'New group' },
  pacing: { ar: 'جدولة المحتوى', en: 'Pacing & content' },
  gradebook: { ar: 'سجل الدرجات', en: 'Gradebook' },
  roster: { ar: 'الطلاب والدعوة', en: 'Roster & invite' },
  released: { ar: 'إجراء يدوي', en: 'Manual override' },
  unlocked: { ar: 'مفتوح', en: 'Unlocked' },
  copyWhatsapp: { ar: 'نسخ لواتساب', en: 'Copy for WhatsApp' },
  releaseAll: { ar: 'فتح الكل', en: 'Unlock all' },
  lockAll: { ar: 'قفل الكل', en: 'Lock all' },
  moveTo: { ar: 'نقل إلى…', en: 'Move to…' },
  moveUp: { ar: 'تحريك للأعلى', en: 'Move up' },
  moveDown: { ar: 'تحريك للأسفل', en: 'Move down' },
  expand: { ar: 'توسيع', en: 'Expand' },
  collapse: { ar: 'طي', en: 'Collapse' },
  addToGradebook: { ar: 'عمود درجات', en: 'Add grade column' },
  addGradeColumn: { ar: 'عمود درجات', en: 'Add grade column' },
  addStudents: { ar: 'إضافة طلاب', en: 'Add students' },
  bulkAdd: { ar: 'إضافة طلاب (سطر لكل طالب)', en: 'Add students (one per line)' },
  uploadFile: { ar: 'رفع ملف', en: 'Upload file' },
  // admin
  overview: { ar: 'نظرة عامة', en: 'Overview' },
  dashboard: { ar: 'لوحة التحكم', en: 'Dashboard' },
  search: { ar: 'بحث', en: 'Search' },
  teachers: { ar: 'المعلمون', en: 'Teachers' },
  students: { ar: 'الطلاب', en: 'Students' },
  taxonomy: { ar: 'إدارة التصنيفات', en: 'Taxonomy' },
  suspend: { ar: 'إيقاف', en: 'Suspend' },
  activate: { ar: 'تنشيط', en: 'Activate' },
  active: { ar: 'نشط', en: 'Active' },
  suspended: { ar: 'موقوف', en: 'Suspended' },
  totalTeachers: { ar: 'معلمون', en: 'Teachers' },
  totalStudents: { ar: 'طلاب', en: 'Students' },
  totalCourses: { ar: 'مقررات', en: 'Courses' },
  academicCourses: { ar: 'منهج مدرسي', en: 'School courses' },
  generalCourses: { ar: 'مهارات عامة', en: 'Skill courses' },
  totalGroups: { ar: 'مجموعات', en: 'Groups' },
  activeGroups: { ar: 'مجموعات نشطة', en: 'Active groups' },
} as const;

export type Key = keyof typeof dict;

const Ctx = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key) => string;
}>({ lang: 'ar', setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(
    (localStorage.getItem('lang') as Lang) ?? 'ar',
  );
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('lang', lang);
  }, [lang]);
  const t = (k: Key) => dict[k][lang];
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);
