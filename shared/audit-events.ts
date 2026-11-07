export type AuditCategory =
  | 'CURRICULUM'
  | 'COHORTS'
  | 'QUIZZES'
  | 'HOMEWORK'
  | 'USERS_AUTH'
  | 'BILLING'
  | 'SETTINGS';

export interface AuditEventDefinition {
  action: string;
  category: AuditCategory;
  nameAr: string;
  nameEn: string;
  targetType: string;
}

export const AUDIT_CATEGORIES: Record<AuditCategory, { nameAr: string; nameEn: string }> = {
  CURRICULUM: { nameAr: 'المناهج والدروس', nameEn: 'Curriculum & Lessons' },
  COHORTS: { nameAr: 'المجموعات والأفواج', nameEn: 'Cohorts & Groups' },
  QUIZZES: { nameAr: 'الاختبارات القصيرة', nameEn: 'Quizzes' },
  HOMEWORK: { nameAr: 'الواجبات والتكليفات', nameEn: 'Homework & Assignments' },
  USERS_AUTH: { nameAr: 'المستخدمون والمصادقة', nameEn: 'Users & Authentication' },
  BILLING: { nameAr: 'الاشتراكات والفواتير', nameEn: 'Billing & Subscriptions' },
  SETTINGS: { nameAr: 'الإعدادات العامة', nameEn: 'System Settings' },
};

export const AUDIT_EVENTS: Record<string, AuditEventDefinition> = {
  // Curriculum
  'course.create': {
    action: 'course.create',
    category: 'CURRICULUM',
    nameAr: 'إنشاء مادة دراسية',
    nameEn: 'Create Course',
    targetType: 'course',
  },
  'course.update': {
    action: 'course.update',
    category: 'CURRICULUM',
    nameAr: 'تعديل مادة دراسية',
    nameEn: 'Update Course',
    targetType: 'course',
  },
  'course.delete': {
    action: 'course.delete',
    category: 'CURRICULUM',
    nameAr: 'حذف مادة دراسية',
    nameEn: 'Delete Course',
    targetType: 'course',
  },
  'course.restore': {
    action: 'course.restore',
    category: 'CURRICULUM',
    nameAr: 'استعادة مادة دراسية',
    nameEn: 'Restore Course',
    targetType: 'course',
  },
  'lesson.create': {
    action: 'lesson.create',
    category: 'CURRICULUM',
    nameAr: 'إنشاء درس',
    nameEn: 'Create Lesson',
    targetType: 'lesson',
  },
  'lesson.update': {
    action: 'lesson.update',
    category: 'CURRICULUM',
    nameAr: 'تعديل درس',
    nameEn: 'Update Lesson',
    targetType: 'lesson',
  },
  'lesson.delete': {
    action: 'lesson.delete',
    category: 'CURRICULUM',
    nameAr: 'حذف درس',
    nameEn: 'Delete Lesson',
    targetType: 'lesson',
  },

  // Quizzes
  'quiz.create': {
    action: 'quiz.create',
    category: 'QUIZZES',
    nameAr: 'إنشاء اختبار',
    nameEn: 'Create Quiz',
    targetType: 'quiz',
  },
  'quiz.update': {
    action: 'quiz.update',
    category: 'QUIZZES',
    nameAr: 'تعديل اختبار',
    nameEn: 'Update Quiz',
    targetType: 'quiz',
  },
  'quiz.delete': {
    action: 'quiz.delete',
    category: 'QUIZZES',
    nameAr: 'حذف اختبار',
    nameEn: 'Delete Quiz',
    targetType: 'quiz',
  },
  'quiz.submit': {
    action: 'quiz.submit',
    category: 'QUIZZES',
    nameAr: 'تسليم اختبار',
    nameEn: 'Submit Quiz',
    targetType: 'quiz_submission',
  },

  // Cohorts
  'group.create': {
    action: 'group.create',
    category: 'COHORTS',
    nameAr: 'إنشاء مجموعة',
    nameEn: 'Create Group',
    targetType: 'group',
  },
  'group.update': {
    action: 'group.update',
    category: 'COHORTS',
    nameAr: 'تعديل مجموعة',
    nameEn: 'Update Group',
    targetType: 'group',
  },
  'group.delete': {
    action: 'group.delete',
    category: 'COHORTS',
    nameAr: 'حذف مجموعة',
    nameEn: 'Delete Group',
    targetType: 'group',
  },
  'group.restore': {
    action: 'group.restore',
    category: 'COHORTS',
    nameAr: 'استعادة مجموعة',
    nameEn: 'Restore Group',
    targetType: 'group',
  },
  'student.enroll': {
    action: 'student.enroll',
    category: 'COHORTS',
    nameAr: 'تسجيل طالب في مجموعة',
    nameEn: 'Enroll Student',
    targetType: 'group',
  },
  'student.remove': {
    action: 'student.remove',
    category: 'COHORTS',
    nameAr: 'إزالة طالب من مجموعة',
    nameEn: 'Remove Student',
    targetType: 'group',
  },
  'student.group.remove': {
    action: 'student.group.remove',
    category: 'COHORTS',
    nameAr: 'إزالة طالب من مجموعة',
    nameEn: 'Remove Student From Group',
    targetType: 'group',
  },
  'student.group.move': {
    action: 'student.group.move',
    category: 'COHORTS',
    nameAr: 'نقل طالب بين مجموعات',
    nameEn: 'Move Student Group',
    targetType: 'group',
  },
  'entry_code.generate': {
    action: 'entry_code.generate',
    category: 'COHORTS',
    nameAr: 'توليد رموز الانضمام',
    nameEn: 'Generate Entry Codes',
    targetType: 'group',
  },
  'attendance.mark': {
    action: 'attendance.mark',
    category: 'COHORTS',
    nameAr: 'تسجيل الحضور والغياب',
    nameEn: 'Mark Attendance',
    targetType: 'lesson_attendance',
  },

  // Homework
  'homework.create': {
    action: 'homework.create',
    category: 'HOMEWORK',
    nameAr: 'إنشاء واجب',
    nameEn: 'Create Homework',
    targetType: 'homework',
  },
  'homework.update': {
    action: 'homework.update',
    category: 'HOMEWORK',
    nameAr: 'تعديل واجب',
    nameEn: 'Update Homework',
    targetType: 'homework',
  },
  'homework.delete': {
    action: 'homework.delete',
    category: 'HOMEWORK',
    nameAr: 'حذف واجب',
    nameEn: 'Delete Homework',
    targetType: 'homework',
  },
  'homework.submit': {
    action: 'homework.submit',
    category: 'HOMEWORK',
    nameAr: 'تسليم واجب',
    nameEn: 'Submit Homework',
    targetType: 'homework_submission',
  },
  'homework.grade': {
    action: 'homework.grade',
    category: 'HOMEWORK',
    nameAr: 'تصحيح واجب',
    nameEn: 'Grade Homework',
    targetType: 'homework_submission',
  },
  'homework.revision_request': {
    action: 'homework.revision_request',
    category: 'HOMEWORK',
    nameAr: 'طلب إعادة تسليم واجب',
    nameEn: 'Request Homework Revision',
    targetType: 'homework_submission',
  },

  // Users & Auth
  'user.password.reset': {
    action: 'user.password.reset',
    category: 'USERS_AUTH',
    nameAr: 'إعادة تعيين كلمة المرور',
    nameEn: 'Reset Password',
    targetType: 'user',
  },
  'user.status': {
    action: 'user.status',
    category: 'USERS_AUTH',
    nameAr: 'تغيير حالة المستخدم',
    nameEn: 'Change User Status',
    targetType: 'user',
  },
  'user.delete': {
    action: 'user.delete',
    category: 'USERS_AUTH',
    nameAr: 'حذف مستخدم',
    nameEn: 'Delete User',
    targetType: 'user',
  },
  'user.restore': {
    action: 'user.restore',
    category: 'USERS_AUTH',
    nameAr: 'استعادة مستخدم',
    nameEn: 'Restore User',
    targetType: 'user',
  },
  'teacher.create': {
    action: 'teacher.create',
    category: 'USERS_AUTH',
    nameAr: 'إنشاء معلم',
    nameEn: 'Create Teacher',
    targetType: 'user',
  },
  'teacher.update': {
    action: 'teacher.update',
    category: 'USERS_AUTH',
    nameAr: 'تعديل بيانات معلم',
    nameEn: 'Update Teacher',
    targetType: 'user',
  },
  'student.create': {
    action: 'student.create',
    category: 'USERS_AUTH',
    nameAr: 'إنشاء طالب',
    nameEn: 'Create Student',
    targetType: 'user',
  },
  'student.update': {
    action: 'student.update',
    category: 'USERS_AUTH',
    nameAr: 'تعديل بيانات طالب',
    nameEn: 'Update Student',
    targetType: 'user',
  },
  'parent.create': {
    action: 'parent.create',
    category: 'USERS_AUTH',
    nameAr: 'إنشاء ولي أمر',
    nameEn: 'Create Parent',
    targetType: 'user',
  },
  'parent.update': {
    action: 'parent.update',
    category: 'USERS_AUTH',
    nameAr: 'تعديل بيانات ولي أمر',
    nameEn: 'Update Parent',
    targetType: 'user',
  },
  'parent.link.create': {
    action: 'parent.link.create',
    category: 'USERS_AUTH',
    nameAr: 'ربط ولي أمر بطالب',
    nameEn: 'Link Parent to Student',
    targetType: 'parent_link',
  },
  'parent.link.delete': {
    action: 'parent.link.delete',
    category: 'USERS_AUTH',
    nameAr: 'فك ربط ولي أمر بطالب',
    nameEn: 'Unlink Parent from Student',
    targetType: 'parent_link',
  },
  'parent.link.restore': {
    action: 'parent.link.restore',
    category: 'USERS_AUTH',
    nameAr: 'استعادة ربط ولي أمر',
    nameEn: 'Restore Parent Link',
    targetType: 'parent_link',
  },
  'role.create': {
    action: 'role.create',
    category: 'USERS_AUTH',
    nameAr: 'إنشاء دور إداري',
    nameEn: 'Create Admin Role',
    targetType: 'admin_role',
  },
  'role.update': {
    action: 'role.update',
    category: 'USERS_AUTH',
    nameAr: 'تعديل دور إداري',
    nameEn: 'Update Admin Role',
    targetType: 'admin_role',
  },
  'role.assign': {
    action: 'role.assign',
    category: 'USERS_AUTH',
    nameAr: 'تعيين دور إداري',
    nameEn: 'Assign Admin Role',
    targetType: 'user',
  },

  // Billing
  'plan.create': {
    action: 'plan.create',
    category: 'BILLING',
    nameAr: 'إنشاء خطة اشتراك',
    nameEn: 'Create Plan',
    targetType: 'plan',
  },
  'plan.update': {
    action: 'plan.update',
    category: 'BILLING',
    nameAr: 'تعديل خطة اشتراك',
    nameEn: 'Update Plan',
    targetType: 'plan',
  },
  'promo_code.create': {
    action: 'promo_code.create',
    category: 'BILLING',
    nameAr: 'إنشاء كود خصم',
    nameEn: 'Create Promo Code',
    targetType: 'promo_code',
  },
  'promo_code.update': {
    action: 'promo_code.update',
    category: 'BILLING',
    nameAr: 'تعديل كود خصم',
    nameEn: 'Update Promo Code',
    targetType: 'promo_code',
  },
  'teacher.subscription.assign': {
    action: 'teacher.subscription.assign',
    category: 'BILLING',
    nameAr: 'تعيين اشتراك لمعلم',
    nameEn: 'Assign Teacher Subscription',
    targetType: 'teacher_subscription',
  },
  'teacher.gift.grant': {
    action: 'teacher.gift.grant',
    category: 'BILLING',
    nameAr: 'منح هدية اشتراك لمعلم',
    nameEn: 'Grant Teacher Gift',
    targetType: 'user',
  },

  // Settings
  'settings.notifications': {
    action: 'settings.notifications',
    category: 'SETTINGS',
    nameAr: 'تحديث إعدادات الإشعارات',
    nameEn: 'Update Notification Settings',
    targetType: 'settings',
  },
  'settings.global': {
    action: 'settings.global',
    category: 'SETTINGS',
    nameAr: 'تحديث الإعدادات العامة',
    nameEn: 'Update Global Settings',
    targetType: 'settings',
  },
};

export function getAuditActionDefinition(action: string): AuditEventDefinition | undefined {
  return AUDIT_EVENTS[action];
}

export function getActionsForCategory(category: AuditCategory): string[] {
  return Object.values(AUDIT_EVENTS)
    .filter((event) => event.category === category)
    .map((event) => event.action);
}
