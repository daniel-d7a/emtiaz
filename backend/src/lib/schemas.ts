/** ZodValidationPipe + every request-body schema for write endpoints. 400 on first mismatch. */
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { z } from 'zod';
import { normalizeDays } from './days';
import { normalizePhone, isValidPhoneForCountry } from './phone';
import { ADMIN_PERMISSIONS } from './admin-permissions';

@Injectable()
export class ZodBodyPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodType) {}

  transform(value: unknown) {
    const parsed = this.schema.safeParse(value ?? {});
    if (!parsed.success) {
      const msg = [...new Set(parsed.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`))].join('; ');
      throw new BadRequestException(msg);
    }
    return parsed.data;
  }
}

const uuid = z.uuid();
const phoneNumber = z
  .string()
  .trim()
  .min(1)
  .transform((v) => normalizePhone(v))
  .refine((v) => /^\+[1-9]\d{6,14}$/.test(v), {
    message: 'phone must be a valid number (+XXXXXXXXX)',
  });
const phone = phoneNumber.optional();
const safeText = (max = 300) => z.string().trim().min(1).max(max);
const optText = (max = 2000) => z.string().trim().max(max).optional();
const themeColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a #RRGGBB colour');
const TeacherThemeDto = z.object({
  layout: z.enum(['banner', 'split']),
  primary: themeColor,
  secondary: themeColor,
  marquee: z.string().trim().max(200),
  arabicFont: z.enum(['cairo', 'readex', 'tajawal']),
  englishFont: z.enum(['dm-sans', 'inter', 'cairo']),
});

// ---------- onboarding ----------
export const countrySchema = z.enum(['OM', 'EG']).default('OM');

export const CheckAvailabilityDto = z.object({
  email: z.string().trim().optional(),
  phoneNumber: z.string().trim().optional(),
  country: z.enum(['OM', 'EG']).optional(),
});

export const TeacherSignupDto = z
  .object({
    name: safeText(120),
    email: z.email().optional(),
    password: z.string().min(8).max(200),
    phoneNumber: z.string().trim().min(1),
    country: countrySchema,
    courseFocus: z.enum(['ACADEMIC', 'GENERAL']).default('ACADEMIC'),
    gradeIds: z.array(uuid).max(24).optional(),
    customGrades: z.array(safeText(80)).max(20).optional(),
    subject: optText(80),
  })
  .transform((dto) => ({
    ...dto,
    phoneNumber: normalizePhone(dto.phoneNumber, dto.country),
  }))
  .refine((dto) => isValidPhoneForCountry(dto.phoneNumber, dto.country), {
    message: 'phone must be a valid number for selected country',
    path: ['phoneNumber'],
  })
  .refine(
    (dto) => {
      if (dto.courseFocus === 'GENERAL') {
        return Boolean(dto.subject?.trim());
      }
      return (
        Boolean(dto.subject?.trim()) ||
        Boolean(dto.gradeIds?.length) ||
        Boolean(dto.customGrades?.length)
      );
    },
    {
      message: 'subject or taught grades are required',
      path: ['subject'],
    },
  );

export const StudentSignupDto = z
  .object({
    name: safeText(120),
    password: z.string().min(8).max(200),
    phoneNumber: z.string().trim().min(1),
    country: countrySchema,
    email: z.email().optional(),
    gradeId: uuid.optional(),
  })
  .transform((dto) => ({
    ...dto,
    phoneNumber: normalizePhone(dto.phoneNumber, dto.country),
  }))
  .refine((dto) => isValidPhoneForCountry(dto.phoneNumber, dto.country), {
    message: 'phone must be a valid number for selected country',
    path: ['phoneNumber'],
  });
export const JoinCodeDto = z.object({ joinCode: safeText(16) });
export const ChangePasswordDto = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});
export const UpdateMeDto = z
  .object({
    name: safeText(120).optional(),
    country: z.enum(['OM', 'EG']).optional(),
    phoneNumber: z
      .string()
      .trim()
      .max(20)
      .optional(),
    courseFocus: z.enum(['ACADEMIC', 'GENERAL']).optional(),
    gradeIds: z.array(uuid).max(24).optional(),
    customGrades: z.array(safeText(80)).max(20).optional(),
    subject: optText(80),
    onboardingCompleted: z.boolean().optional(),
    dateOfBirth: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be YYYY-MM-DD')
      .nullable()
      .optional(),
    gradeId: uuid.nullable().optional(),
    image: z.string().trim().max(512).nullable().optional(),
    landingSlug: z
      .string()
      .trim()
      .toLowerCase()
      .refine((v) => v === '' || /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(v), {
        message: 'slug must be 3-40 lowercase letters, numbers, or hyphens',
      })
      .optional(),
    landingBio: optText(500),
    landingBanner: z.string().trim().max(512).nullable().optional(),
    landingTheme: TeacherThemeDto.optional(),
    landingPublished: z.boolean().optional(),
  })
  .transform((dto) => {
    if (dto.phoneNumber !== undefined) {
      const trimmed = dto.phoneNumber.trim();
      return { ...dto, phoneNumber: normalizePhone(trimmed, dto.country) };
    }
    return dto;
  })
  .refine(
    (dto) =>
      dto.phoneNumber === undefined ||
      (dto.phoneNumber !== '' && isValidPhoneForCountry(dto.phoneNumber, dto.country)),
    {
      message: 'phone must be a valid number (+XXXXXXXXX)',
      path: ['phoneNumber'],
    },
  );

export const CreateTeacherDto = TeacherSignupDto;
export const UpdateTeacherDto = z
  .object({
    name: safeText(120).optional(),
    phoneNumber: z
      .string()
      .trim()
      .max(20)
      .refine((v) => v !== '' && /^\+?[1-9]\d{6,14}$/.test(v), {
        message: 'phone must be a valid number (+XXXXXXXXX)',
      })
      .transform((v) => normalizePhone(v))
      .optional(),
    subjectId: uuid.nullable().optional(),
    isTopTeacher: z.boolean().optional(),
  })
  .refine(
    (dto) =>
      dto.name !== undefined ||
      dto.phoneNumber !== undefined ||
      dto.subjectId !== undefined ||
      dto.isTopTeacher !== undefined,
    { message: 'nothing to update' },
  );

// ---------- courses / curriculum ----------
export const CreateCourseDto = z
  .object({
    title: safeText(160),
    description: optText(2000),
    courseType: z.enum(['ACADEMIC', 'GENERAL']),
    gradeId: uuid.optional(),
    gradeName: optText(80),
    semester: optText(40),
    categoryId: uuid.optional(),
    categoryName: optText(80),
    previewUrl: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === '' || /^https?:\/\//i.test(v), 'must be an http(s) URL')
      .nullable()
      .optional(),
  });
export const UpdateCourseDto = CreateCourseDto.partial().omit({ gradeName: true, categoryName: true }).extend({
  image: z.string().trim().max(512).nullable().optional(),
});
export const AdminCreateCourseDto = z.object({
  title: safeText(160),
  teacherId: z.string().min(1),
  courseType: z.enum(['ACADEMIC', 'GENERAL']),
  gradeId: uuid.optional(),
  semester: z.string().trim().max(40).optional(),
  categoryId: uuid.optional(),
});
export const AdminUpdateCourseDto = z
  .object({
    title: safeText(160).optional(),
    teacherId: z.string().min(1).optional(),
    courseType: z.enum(['ACADEMIC', 'GENERAL']).optional(),
    gradeId: uuid.nullable().optional(),
    semester: z.string().trim().max(40).nullable().optional(),
    categoryId: uuid.nullable().optional(),
  })
  .refine((dto) => Object.keys(dto).length > 0, { message: 'nothing to update' });

export const AddModuleDto = z.object({ title: safeText(160) });
export const UpdateModuleDto = z.object({ title: safeText(160) });
export const IdListDto = z.object({ moduleIds: z.array(uuid) });
export const ReorderModuleItemsDto = z.object({
  items: z
    .array(z.object({ id: uuid, type: z.enum(['lesson', 'quiz']) }))
    .min(1)
    .max(200),
});
export const AddLessonDto = z
  .object({ title: safeText(160), content: optText(20000) });
export const UpdateLessonDto = z
  .object({ title: safeText(160).optional(), content: optText(20000) })
  .refine((d) => d.title !== undefined || d.content !== undefined, {
    message: 'nothing to update',
  });

// ---------- homework ----------
export const HomeworkAttachmentTypeEnum = z.enum([
  'NONE',
  'PDF',
  'DOC',
  'AUDIO',
  'IMAGE',
  'ARCHIVE',
  'LINK',
  'VIDEO',
  'OTHER',
]);

export const CreateHomeworkDto = z.object({
  title: safeText(200),
  instructions: optText(20000).nullable(),
  attachmentType: HomeworkAttachmentTypeEnum.optional().default('NONE'),
  r2ObjectKey: z.string().trim().max(1000).optional().nullable(),
  url: z.string().trim().max(2000).optional().nullable(),
  fileSizeBytes: z.number().int().nonnegative().optional().nullable(),
  mimeType: z.string().trim().max(200).optional().nullable(),
  maxScore: z.number().int().min(1).max(1000).optional().default(10),
  displayOrder: z.number().int().min(0).optional().default(0),
  groupId: uuid.optional().nullable(),
});

export const UpdateHomeworkDto = z.object({
  title: safeText(200).optional(),
  instructions: optText(20000).nullable(),
  attachmentType: HomeworkAttachmentTypeEnum.optional(),
  r2ObjectKey: z.string().trim().max(1000).optional().nullable(),
  url: z.string().trim().max(2000).optional().nullable(),
  fileSizeBytes: z.number().int().nonnegative().optional().nullable(),
  mimeType: z.string().trim().max(200).optional().nullable(),
  maxScore: z.number().int().min(1).max(1000).optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const SetGroupHomeworkAccessDto = z.object({
  dueDate: z.string().optional().nullable(),
  isHidden: z.boolean().optional(),
});

// ---------- quizzes ----------
export const QuizQuestionDto = z
  .object({
    questionType: z.enum(['MCQ', 'TRUE_FALSE', 'WRITTEN']),
    prompt: z.string().trim().max(1000).default(''),
    imageKey: z.string().trim().max(512).optional().nullable(),
    options: z.array(z.string().trim().min(1).max(100)).min(2).max(4).optional().nullable(),
    correctAnswer: z.string().min(1).max(200),
    explanation: optText(1000).nullable(),
    points: z.number().int().positive().optional(),
    displayOrder: z.number().int().default(0),
  })
  .transform((q) => ({
    ...q,
    points: q.points ?? (q.questionType === 'WRITTEN' ? 10 : 1),
  }))
  .refine((q) => q.prompt.length > 0 || !!q.imageKey, {
    message: 'A question needs text or an image',
  })
  .refine(
    (q) => q.questionType !== 'MCQ' || (q.options && q.options.length >= 2),
    { message: 'MCQ questions need 2–4 options' },
  );
export const UpsertQuizDto = z.object({
  title: safeText(160),
  questions: z.array(QuizQuestionDto).min(1).max(60),
});
export const CreateQuizDto = UpsertQuizDto.extend({
  targetType: z.enum(['course', 'module', 'lesson']),
  targetId: uuid,
});
export const GradeQuizAttemptDto = z.object({
  grades: z.record(z.string(), z.number().min(0).max(1000)),
});
export const MoveQuizDto = z.object({
  direction: z.enum(['up', 'down']),
});

// ---------- groups & roster ----------
const groupDays = z
  .string()
  .trim()
  .max(200)
  .nullable()
  .optional()
  .transform((value) => (value === undefined ? undefined : normalizeDays(value)));

export const AddGroupDto = z.object({
  name: z.string().trim().max(120).default(''),
  days: groupDays,
  time: z.string().trim().max(120).nullable().optional(),
  students: z
    .array(
      z.object({
        name: safeText(120),
        phoneNumber,
      }),
    )
    .max(60)
    .optional(),
  requiresEntryCode: z.boolean().default(true).optional(),
});
export const UpdateGroupDto = z.object({
  name: z.string().trim().max(120).optional(),
  days: groupDays,
  time: z.string().trim().max(120).nullable().optional(),
  isActive: z.boolean().optional(),
  joinCode: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/, 'must be letters, numbers, - or _')
    .optional(),
  whatsappMessage: z.string().trim().max(500).nullable().optional(),
  requiresEntryCode: z.boolean().optional(),
});
const entryCode = z
  .string()
  .trim()
  .min(6)
  .max(8)
  .transform((value) => value.toUpperCase());

export const JoinGroupDto = z.object({
  joinCode: z
    .string()
    .trim()
    .min(1)
    .max(16)
    .transform((value) => value.toUpperCase()),
  entryCode: entryCode.optional(),
});

export const JoinEntryDto = z.object({
  entryCode: entryCode.optional(),
});

export const CreateEntryCodeDto = z.object({
  maxUses: z.number().int().min(1).max(1000),
});

export const SearchStudentsDto = z.object({
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ''))
    .pipe(z.string().min(4).max(20)),
});
export const SetLessonAccessDto = z
  .object({
    isUnlocked: z.boolean().optional(),
    isHidden: z.boolean().optional(),
  })
  .refine((dto) => dto.isUnlocked !== undefined || dto.isHidden !== undefined, {
    message: 'isUnlocked or isHidden is required',
  });
export const SetAttendanceDto = z.object({
  records: z
    .array(
      z.object({
        studentId: z.string().trim().min(1),
        isPresent: z.boolean(),
      }),
    )
    .min(1)
    .max(500),
});
export const BulkStudentsDto = z
  .object({
    students: z
      .array(
        z.object({
          name: safeText(120),
          phoneNumber,
        }),
      )
      .min(1)
      .max(60),
  });
export const ToGroupDto = z.object({ toGroupId: uuid });
export const AnnounceDto = z.object({ message: safeText(1000) });

// ---------- storage ----------
export const DeleteUploadDto = z.object({
  objectKey: z.string().trim().min(1).max(512),
});
export const AvatarUploadDto = z.object({
  fileName: safeText(200),
  mimeType: z.string().regex(/^image\//, 'must be an image'),
  fileSizeBytes: z.number().int().min(1).max(2 * 1024 * 1024),
});
export const BannerUploadDto = AvatarUploadDto;
export const CourseImageUploadDto = z.object({
  courseId: uuid,
  fileName: safeText(200),
  mimeType: z.string().regex(/^image\//, 'must be an image'),
  fileSizeBytes: z.number().int().min(1).max(5 * 1024 * 1024),
});
export const QuizImageUploadDto = CourseImageUploadDto;
export const PresignedUploadDto = z
  .object({
    courseId: uuid,
    lessonId: uuid,
    fileName: safeText(200),
    mimeType: z.string().max(120).optional(),
    fileSizeBytes: z.number().int().min(1).max(100 * 1024 * 1024).optional(),
  });
export const AttachDto = z
  .object({
    lessonId: uuid,
    groupId: uuid.optional().nullable(),
    title: safeText(200),
    objectKey: z.string().trim().min(1).max(512).optional(),
    url: z
      .string()
      .trim()
      .max(2000)
      .url()
      .refine((value) => /^https?:\/\//i.test(value), 'http(s) URL required')
      .optional(),
    mimeType: z.string().max(120).optional(),
    fileSizeBytes: z.number().int().min(0).optional(),
    verified: z.boolean().optional(),
  })
  .refine((dto) => Boolean(dto.objectKey) !== Boolean(dto.url), {
    message: 'Provide either an upload or a link',
  });

// ---------- student ----------
export const QuizSubmitDto = z
  .object({
    groupId: uuid,
    answers: z
      .object({})
      .catchall(z.string().min(1).max(5000)),
  });

// ---------- parent ----------
export const ParentSignupDto = z
  .object({
    name: safeText(120),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    password: z.string().min(8).max(128),
    phoneNumber: z.string().trim().min(1),
    country: countrySchema,
    monitoringCode: z
      .string()
      .trim()
      .length(8)
      .toUpperCase()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    studentPhone: z
      .string()
      .trim()
      .max(30)
      .optional()
      .or(z.literal('').transform(() => undefined)),
  })
  .transform((dto) => ({
    ...dto,
    phoneNumber: normalizePhone(dto.phoneNumber, dto.country),
    monitoringCode: dto.monitoringCode ? dto.monitoringCode.trim().toUpperCase() : undefined,
    studentPhone: dto.studentPhone ? dto.studentPhone.trim() : undefined,
  }))
  .refine((dto) => isValidPhoneForCountry(dto.phoneNumber, dto.country), {
    message: 'phone must be a valid number for selected country',
    path: ['phoneNumber'],
  });
export const ParentLinkDto = z.object({
  monitoringCode: z.string().trim().length(8).toUpperCase(),
});

// ---------- admin ----------
export const SetUserStatusDto = z
  .object({ isActive: z.boolean(), revokeSessions: z.boolean().optional() });
export const TaxonomyCreateDto = z
  .object({ name: safeText(80), displayOrder: z.number().int().min(0).optional() });
export const TaxonomyUpdateDto = TaxonomyCreateDto.partial();

export const GradeCreateDto = z
  .object({
    name: safeText(80).optional(),
    nameAr: safeText(80).optional(),
    nameEn: safeText(80).optional(),
    country: z.enum(['OM', 'EG']).optional(),
    displayOrder: z.number().int().min(0).optional(),
  })
  .refine((v) => Boolean(v.name || v.nameAr || v.nameEn), {
    message: 'name, nameAr, or nameEn is required',
  });

export const GradeUpdateDto = z
  .object({
    name: safeText(80).optional(),
    nameAr: safeText(80).optional(),
    nameEn: safeText(80).optional(),
    country: z.enum(['OM', 'EG']).optional(),
    displayOrder: z.number().int().min(0).optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.nameAr !== undefined ||
      v.nameEn !== undefined ||
      v.country !== undefined ||
      v.displayOrder !== undefined,
    { message: 'at least one field is required' },
  );

export const CategoryCreateDto = z
  .object({
    name: safeText(80).optional(),
    nameAr: safeText(80).optional(),
    nameEn: safeText(80).optional(),
  })
  .refine((v) => Boolean(v.name || v.nameAr || v.nameEn), {
    message: 'name, nameAr, or nameEn is required',
  });

export const CategoryUpdateDto = z
  .object({
    name: safeText(80).optional(),
    nameAr: safeText(80).optional(),
    nameEn: safeText(80).optional(),
  })
  .refine(
    (v) => v.name !== undefined || v.nameAr !== undefined || v.nameEn !== undefined,
    { message: 'at least one field is required' },
  );
export const AdminEnrollDto = z.object({ groupId: uuid });
export const AdminMoveStudentDto = z.object({ targetGroupId: uuid });
export const AdminParentLinkDto = z.object({
  parentId: z.string().min(1),
  studentId: z.string().min(1),
});
export const AdminRoleDto = z.object({
  name: safeText(80),
  permissions: z.array(z.enum(ADMIN_PERMISSIONS)).min(1),
});
export const AdminRoleUpdateDto = AdminRoleDto.partial().refine(
  (v) => v.name !== undefined || v.permissions !== undefined,
  { message: 'nothing to update' },
);
export const AdminRoleAssignDto = z.object({ roleId: uuid.nullable() });
export const CreateParentDto = z.object({
  name: safeText(120),
  email: z.string().trim().toLowerCase().email().optional(),
  password: z.string().min(8).max(128),
  phoneNumber,
  monitoringCode: z
    .string()
    .trim()
    .length(8)
    .toUpperCase()
    .optional()
    .or(z.literal('').transform(() => undefined)),
});
export const UpdateParentDto = z
  .object({
    name: safeText(120).optional(),
    phoneNumber: z
      .string()
      .trim()
      .max(20)
      .refine((v) => v !== '' && /^\+?[1-9]\d{6,14}$/.test(v), {
        message: 'phone must be a valid number (+XXXXXXXXX)',
      })
      .transform((v) => normalizePhone(v))
      .optional(),
  })
  .refine((dto) => dto.name !== undefined || dto.phoneNumber !== undefined, {
    message: 'nothing to update',
  });
export const CreateStudentDto = StudentSignupDto;
export const UpdateStudentDto = z
  .object({
    name: safeText(120).optional(),
    phoneNumber: z
      .string()
      .trim()
      .max(20)
      .refine((v) => v !== '' && /^\+?[1-9]\d{6,14}$/.test(v), {
        message: 'phone must be a valid number (+XXXXXXXXX)',
      })
      .transform((v) => normalizePhone(v))
      .optional(),
    gradeId: uuid.nullable().optional(),
  })
  .refine(
    (dto) =>
      dto.name !== undefined ||
      dto.phoneNumber !== undefined ||
      dto.gradeId !== undefined,
    { message: 'nothing to update' },
  );
const hexColor = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'must be a hex colour');

export const NotificationSettingsDto = z
  .object({
    whatsappEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    inAppEnabled: z.boolean().optional(),
    adminEnabled: z.boolean().optional(),
    parentEnabled: z.boolean().optional(),
    teacherEnabled: z.boolean().optional(),
    supportEmail: z.string().trim().max(200).optional(),
    supportPhone: z.string().trim().max(30).optional(),
    supportWhatsapp: z.string().trim().max(30).optional(),
    primaryColor: hexColor.optional(),
    secondaryColor: hexColor.optional(),
    logoUrl: z.string().trim().url().max(500).nullable().optional(),
    yearlyPlanDiscountEnabled: z.boolean().optional(),
    referralPlanSlug: z.string().trim().min(1).max(50).optional(),
    referralGiftDays: z.number().int().min(1).max(365).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'at least one setting is required');

export const AdminCreatePlanDto = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  tierRank: z.number().int().min(0).default(0),
  nameAr: safeText(100),
  nameEn: safeText(100),
  descriptionAr: safeText(500).nullish(),
  descriptionEn: safeText(500).nullish(),
  monthlyPriceOmr: z.number().int().min(0).default(0),
  yearlyMonthlyPriceOmr: z.number().int().min(0).default(0),
  monthlyPriceEgp: z.number().int().min(0).default(0),
  yearlyMonthlyPriceEgp: z.number().int().min(0).default(0),
  maxStudents: z.number().int().positive().nullish(),
  maxStorageBytes: z.number().int().positive().nullish(),
  maxGroups: z.number().int().positive().nullish(),
  trialDays: z.number().int().min(0).default(0),
  isPublic: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
});

export const AdminUpdatePlanDto = z
  .object({
    tierRank: z.number().int().min(0).optional(),
    nameAr: safeText(100).optional(),
    nameEn: safeText(100).optional(),
    descriptionAr: safeText(500).nullish(),
    descriptionEn: safeText(500).nullish(),
    monthlyPriceOmr: z.number().int().min(0).optional(),
    yearlyMonthlyPriceOmr: z.number().int().min(0).optional(),
    monthlyPriceEgp: z.number().int().min(0).optional(),
    yearlyMonthlyPriceEgp: z.number().int().min(0).optional(),
    maxStudents: z.number().int().positive().nullish(),
    maxStorageBytes: z.number().int().positive().nullish(),
    maxGroups: z.number().int().positive().nullish(),
    trialDays: z.number().int().min(0).optional(),
    isPublic: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    displayOrder: z.number().int().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'at least one field to update is required');

export const AdminCreatePromoCodeDto = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .transform((v) => v.toUpperCase()),
  planId: z.string().uuid(),
  durationDays: z.number().int().positive().max(365),
  maxUses: z.number().int().positive().nullish(),
  expiresAt: z.string().nullish(),
});

export const AdminUpdatePromoCodeDto = z
  .object({
    isActive: z.boolean().optional(),
    maxUses: z.number().int().positive().nullish(),
    expiresAt: z.string().nullish(),
  })
  .refine((v) => Object.keys(v).length > 0, 'at least one field to update is required');

export const AdminAssignSubscriptionDto = z.object({
  planId: z.string().uuid(),
  currency: z.enum(['OMR', 'EGP']),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),
  durationDays: z.number().int().positive().nullish(),
  pricePaid: z.number().int().min(0).nullish(),
  recordLimitCrossingDiscount: z.boolean().optional(),
});

export const AdminGrantGiftDto = z.object({
  planId: z.string().uuid(),
  durationDays: z.number().int().positive().max(365),
  adminOverride: z.boolean().optional(),
  note: safeText(200).optional(),
});

// ---------- gradebook ----------
export const AddColumnDto = z.object({
  title: safeText(120),
  maxScore: z.number().int().positive().max(1000).optional(),
});
export const GradeCellDto = z.object({
  columnId: uuid,
  studentId: z.string().min(1),
  score: z.number().int().min(0).max(1000).nullable(),
  note: optText(500),
});

// ---------- teacher entitlements & promo codes ----------
export const RedeemCodeSchema = z.object({
  code: safeText(50),
});
export type RedeemCodeDto = z.infer<typeof RedeemCodeSchema>;
