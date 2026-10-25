/** ZodValidationPipe + every request-body schema for write endpoints. 400 on first mismatch. */
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { z } from 'zod';

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
const phone = z
  .string()
  .regex(/^\+?[1-9]\d{6,14}$/, 'phone must be E.164-ish (+XXXXXXXXX)')
  .optional();
const safeText = (max = 300) => z.string().trim().min(1).max(max);
const optText = (max = 2000) => z.string().trim().max(max).optional();

// ---------- onboarding ----------
export const TeacherSignupDto = z.object({
  name: safeText(120),
  email: z.email(),
  password: z.string().min(8).max(200),
  phoneNumber: phone,
  subject: safeText(60),
});
export const StudentSignupDto = z.object({
  name: safeText(120),
  password: z.string().min(8).max(200),
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, 'phone must be E.164-ish (+XXXXXXXXX)'),
  email: z.email().optional(),
  gradeId: uuid.optional(),
});
export const JoinCodeDto = z.object({ joinCode: safeText(16) });
export const UpdateMeDto = z
  .object({
    name: safeText(120).optional(),
    phoneNumber: z
      .string()
      .max(20)
      .refine((v) => v === '' || /^\+?[1-9]\d{6,14}$/.test(v), {
        message: 'phone must be empty to clear, or E.164-ish (+XXXXXXXXX)',
      })
      .optional(),
    subject: optText(60),
    image: z.string().trim().max(512).nullable().optional(),
  });

// ---------- courses / curriculum ----------
export const CreateCourseDto = z
  .object({
    title: safeText(160),
    description: optText(2000),
    courseType: z.enum(['ACADEMIC', 'GENERAL']),
    gradeId: uuid.optional(),
    semester: optText(40),
    categoryId: uuid.optional(),
  });
export const UpdateCourseDto = CreateCourseDto.partial();
export const AddModuleDto = z.object({ title: safeText(160) });
export const IdListDto = z.object({ moduleIds: z.array(uuid) });
export const IdListDtoLessons = z.object({ lessonIds: z.array(uuid) });
export const AddLessonDto = z
  .object({ title: safeText(160), content: optText(20000) });
export const UpdateLessonDto = z
  .object({ title: safeText(160).optional(), content: optText(20000) })
  .refine((d) => d.title !== undefined || d.content !== undefined, {
    message: 'nothing to update',
  });

// ---------- quizzes ----------
export const QuizQuestionDto = z
  .object({
    questionType: z.enum(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER']),
    prompt: safeText(1000),
    options: z.array(z.string().min(1).max(100)).min(2).optional().nullable(),
    correctAnswer: z.string().min(1).max(200),
    explanation: optText(1000).nullable(),
    points: z.number().int().positive().default(1),
    displayOrder: z.number().int().default(0),
  })
  .refine(
    (q) => q.questionType !== 'MCQ' || (q.options && q.options.length >= 2),
    { message: 'MCQ questions need ≥2 options' },
  );
export const UpsertQuizDto = z.object({
  title: safeText(160),
  questions: z.array(QuizQuestionDto).min(1).max(60),
});

// ---------- groups & roster ----------
export const AddGroupDto = z
  .object({
    name: safeText(120),
    unlockAllByDefault: z.boolean().optional(),
    notes: optText(2000).nullable(),
    joinCode: z.string().trim().optional(),
  });
export const BulkStudentsDto = z
  .object({
    students: z
      .array(
        z.object({
          name: safeText(120),
          phoneNumber: z.string().regex(/^\+?[1-9]\d{6,14}$/, 'phone must be E.164-ish'),
        }),
      )
      .min(1)
      .max(60),
  });
export const ToGroupDto = z.object({ toGroupId: uuid });

// ---------- storage ----------
export const AvatarUploadDto = z.object({
  fileName: safeText(200),
  mimeType: z.string().regex(/^image\//, 'must be an image'),
  fileSizeBytes: z.number().int().min(1).max(2 * 1024 * 1024),
});
export const PresignedUploadDto = z
  .object({
    courseId: uuid,
    lessonId: uuid,
    fileName: safeText(200),
    mimeType: z.string().max(120).optional(),
    fileSizeBytes: z.number().int().min(1).max(100 * 1024 * 1024).optional(),
  });
export const AttachDto = z.object({
  lessonId: uuid,
  groupId: uuid.optional().nullable(),
  title: safeText(200),
  objectKey: z.string().trim().min(1).max(512),
  mimeType: z.string().max(120).optional(),
  fileSizeBytes: z.number().int().min(0).optional(),
  verified: z.boolean().optional(),
});

// ---------- student ----------
export const QuizSubmitDto = z
  .object({
    groupId: uuid,
    answers: z
      .object({})
      .catchall(z.string().min(1).max(500)),
  });

// ---------- admin ----------
export const SetUserStatusDto = z
  .object({ isActive: z.boolean(), revokeSessions: z.boolean().optional() });
export const TaxonomyCreateDto = z
  .object({ name: safeText(80), displayOrder: z.number().int().min(0).optional() });
export const TaxonomyUpdateDto = TaxonomyCreateDto.partial();
export const AdminEnrollDto = z.object({ groupId: uuid });

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
