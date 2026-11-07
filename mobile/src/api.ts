import Constants from 'expo-constants';
import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import type {
  Session,
  Country,
  Currency,
  Plan,
  PublicPlan,
  PublicPlansResponse,
  TeacherEntitlementsResponse,
  TeacherActivePlan,
  TeacherUsage,
  TeacherEntitlementStatus,
  SavedGift,
  TeacherUpgradeOption,
  PlanLimitType,
  PlanLimitReachedResponse,
  UpgradeGateLockedResponse,
  RedeemCodeDto,
  RedeemCodeResponse,
  ActivateGiftResponse,
  DeleteGiftResponse,
  ReferralItem,
  ReferralSummary,
  CreatePlanDto,
  UpdatePlanDto,
  AdminPromoCode,
  CreatePromoCodeDto,
  UpdatePromoCodeDto,
  TeacherDiscountRecord,
  AdminTeacherEntitlementsResponse,
  AdminAssignSubscriptionDto,
  AdminGrantGiftDto,
  User,
  GetMeResponse,
  StudentProfile,
  ParentLinkDto,
  TaughtGrade,
  GradeItem,
  CategoryItem,
  TaxonomyItem,
  RegisterTeacherDto,
  CheckAvailabilityDto,
  CheckAvailabilityResponse,
  PublicSupport,
  TeacherSummary,
  CourseType,
  HomeworkAttachmentType,
  HomeworkSubmissionStatus,
  HomeworkDto,
  HomeworkSubmissionDto,
  HomeworkRosterSummaryDto,
  CreateHomeworkDto,
  UpdateHomeworkDto,
  SetGroupHomeworkAccessDto,
  GroupHomeworkAccessDto,
  StudentHomeworkDto,
  SubmitHomeworkDto,
  GradeHomeworkSubmissionDto,
  ParentChildHomeworkSubmissionDto,
  ParentChildHomeworkDto,
  ResetUserPasswordDto,
  ResetUserPasswordResultDto,
  StudentGradebook,
  HomeworkColumn,
  HomeworkCell,
} from '../../shared/api';

export type {
  User,
  GetMeResponse,
  StudentProfile,
  ParentLinkDto,
  TaughtGrade,
  GradeItem,
  CategoryItem,
  TaxonomyItem,
  RegisterTeacherDto,
  CheckAvailabilityDto,
  CheckAvailabilityResponse,
  PublicSupport,
  TeacherSummary,
  CourseType,
  Country,
  Currency,
  Plan,
  PublicPlan,
  PublicPlansResponse,
  TeacherEntitlementsResponse,
  TeacherActivePlan,
  TeacherUsage,
  TeacherEntitlementStatus,
  SavedGift,
  TeacherUpgradeOption,
  PlanLimitType,
  PlanLimitReachedResponse,
  UpgradeGateLockedResponse,
  RedeemCodeDto,
  RedeemCodeResponse,
  ActivateGiftResponse,
  DeleteGiftResponse,
  ReferralItem,
  ReferralSummary,
  CreatePlanDto,
  UpdatePlanDto,
  AdminPromoCode,
  CreatePromoCodeDto,
  UpdatePromoCodeDto,
  TeacherDiscountRecord,
  AdminTeacherEntitlementsResponse,
  AdminAssignSubscriptionDto,
  AdminGrantGiftDto,
  HomeworkAttachmentType,
  HomeworkSubmissionStatus,
  HomeworkDto,
  HomeworkSubmissionDto,
  HomeworkRosterSummaryDto,
  CreateHomeworkDto,
  UpdateHomeworkDto,
  SetGroupHomeworkAccessDto,
  GroupHomeworkAccessDto,
  StudentHomeworkDto,
  SubmitHomeworkDto,
  GradeHomeworkSubmissionDto,
  ParentChildHomeworkSubmissionDto,
  ParentChildHomeworkDto,
  ResetUserPasswordDto,
  ResetUserPasswordResultDto,
  StudentGradebook,
  HomeworkColumn,
  HomeworkCell,
} from '../../shared/api';

/** API base: set EXPO_PUBLIC_API_URL to override (required with `expo start --tunnel`,
 *  where hostUri is the ngrok host and cannot reach the API). Otherwise derive the
 *  API host from Metro's hostUri on the same LAN. */
function apiBase(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const uri = Constants.expoConfig?.hostUri;
  if (uri) return `http://${uri.split(':')[0]}:3000`;
  return 'http://localhost:3000';
}
export const API = apiBase();

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type LimitReachedListener = (data: PlanLimitReachedResponse) => void;
const limitListeners = new Set<LimitReachedListener>();

export function onPlanLimitReached(listener: LimitReachedListener): () => void {
  limitListeners.add(listener);
  return () => {
    limitListeners.delete(listener);
  };
}

export function triggerPlanLimitReached(data: PlanLimitReachedResponse) {
  for (const listener of limitListeners) {
    listener(data);
  }
}

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: any } = {},
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as any)?.message || (data as any)?.error || res.statusText;
    const error = new ApiError(
      typeof message === 'string' ? message : JSON.stringify(message),
      res.status,
      data,
    );
    if (res.status === 402 && (data as any)?.error === 'PLAN_LIMIT_REACHED') {
      triggerPlanLimitReached(data as PlanLimitReachedResponse);
    }
    throw error;
  }
  return data as T;
}

export async function resolveAttachmentUrl(a: { id: string; url: string | null }): Promise<string> {
  if (a.url) return a.url;
  const d = await api<{ url: string }>(`/api/storage/attachments/${a.id}/download`);
  return d.url;
}

export async function resolveAttachmentDownloadUrl(a: { id: string; url: string | null }): Promise<string> {
  if (a.url) return a.url;
  const d = await api<{ url: string }>(`/api/storage/attachments/${a.id}/download?download=1`);
  return d.url;
}

export async function deleteUploadedObject(objectKey?: string | null) {
  if (!objectKey) return;
  try {
    await api('/api/storage/uploaded', { method: 'DELETE', body: { objectKey } });
  } catch {
    // Best-effort cleanup; keep the original save error.
  }
}

export async function uploadFile(uploadUrl: string, uri: string, mimeType: string) {
  const file = new File(uri);
  const res = await expoFetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: file,
  });
  if (!res.ok) throw new ApiError('Upload failed', res.status);
}

export const authApi = {
  session: (): Promise<Session> =>
    fetch(`${API}/api/auth/get-session`, {
      credentials: 'include',
      signal: AbortSignal.timeout(8000),
    }).then((r) => (r.ok ? r.json() : null)),
  login: (identifier: string, password: string, country?: Country) =>
    identifier.includes('@')
      ? api('/api/auth/sign-in/email', { body: { email: identifier.trim(), password } })
      : api('/api/auth/sign-in/phone-number', {
          body: { phoneNumber: normalizePhone(identifier, country), password },
        }),
  logout: () => api('/api/auth/sign-out', { body: {} }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api('/api/me/change-password', { body: { currentPassword, newPassword } }),
};

export const publicApi = {
  plans: () => api<PublicPlansResponse>('/api/public/plans'),
  support: () => api<PublicSupport>('/api/public/support'),
  topTeachers: () => api<TeacherSummary[]>('/api/public/top-teachers'),
  grades: (country?: Country) =>
    api<GradeItem[]>(`/api/onboarding/grades${country ? `?country=${country}` : ''}`),
  categories: () => api<CategoryItem[]>('/api/onboarding/categories'),
};

export const onboardingApi = {
  checkAvailability: (dto: CheckAvailabilityDto) =>
    api<CheckAvailabilityResponse>('/api/onboarding/check-availability', { body: dto }),
  listCategories: () => api<CategoryItem[]>('/api/onboarding/categories'),
  listGrades: (country?: Country) =>
    api<GradeItem[]>(`/api/onboarding/grades${country ? `?country=${country}` : ''}`),
  registerTeacher: (dto: RegisterTeacherDto) => api('/api/onboarding/teacher', { body: dto }),
  registerStudent: (dto: {
    name: string; password: string; phoneNumber: string; email?: string; gradeId?: string; country?: Country;
  }) => api('/api/onboarding/student', { body: dto }),
  registerParent: (dto: {
    name: string; email?: string; password: string; phoneNumber: string; monitoringCode?: string; studentPhone?: string; country?: Country;
  }) => api('/api/onboarding/parent', { body: dto }),
  joinByCode: (joinCode: string, entryCode?: string) =>
    api(`/api/onboarding/join/${encodeURIComponent(joinCode.trim().toUpperCase())}`, {
      body: { entryCode: entryCode?.trim().toUpperCase() || undefined },
    }),
};

export const teacherApi = {
  getEntitlements: () => api<TeacherEntitlementsResponse>('/api/teacher/entitlements'),
  redeemCode: (code: string) =>
    api<RedeemCodeResponse>('/api/teacher/entitlements/redeem-code', { body: { code } }),
  activateSavedGift: (giftId: string) =>
    api<ActivateGiftResponse>(`/api/teacher/entitlements/gifts/${giftId}/activate`, { method: 'POST' }),
  deleteSavedGift: (giftId: string) =>
    api<DeleteGiftResponse>(`/api/teacher/entitlements/gifts/${giftId}`, { method: 'DELETE' }),
  createHomework: (lessonId: string, dto: CreateHomeworkDto) =>
    api<HomeworkDto>(`/api/teacher/lessons/${lessonId}/homework`, { body: dto }),
  getLessonHomework: (lessonId: string, groupId?: string) =>
    api<HomeworkDto[]>(`/api/teacher/lessons/${lessonId}/homework${groupId ? `?groupId=${groupId}` : ''}`),
  updateHomework: (id: string, dto: UpdateHomeworkDto) =>
    api<HomeworkDto>(`/api/teacher/homework/${id}`, { method: 'PATCH', body: dto }),
  deleteHomework: (id: string) =>
    api<{ success: boolean }>(`/api/teacher/homework/${id}`, { method: 'DELETE' }),
  setGroupHomeworkAccess: (groupId: string, homeworkId: string, dto: SetGroupHomeworkAccessDto) =>
    api<GroupHomeworkAccessDto>(`/api/teacher/groups/${groupId}/homework/${homeworkId}/access`, { method: 'PUT', body: dto }),
  getHomeworkSubmissions: (groupId: string, homeworkId: string) =>
    api<HomeworkRosterSummaryDto>(`/api/teacher/groups/${groupId}/homework/${homeworkId}/submissions`),
  gradeHomeworkSubmission: (groupId: string, homeworkId: string, studentId: string, dto: GradeHomeworkSubmissionDto) =>
    api<HomeworkSubmissionDto>(`/api/teacher/groups/${groupId}/homework/${homeworkId}/submissions/${studentId}/grade`, { method: 'POST', body: dto }),
};

export const studentApi = {
  getLessonHomework: (groupId: string, lessonId: string) =>
    api<StudentHomeworkDto[]>(`/api/student/groups/${groupId}/lessons/${lessonId}/homework`),
  submitHomework: (groupId: string, homeworkId: string, dto: SubmitHomeworkDto) =>
    api<HomeworkSubmissionDto>(`/api/student/groups/${groupId}/homework/${homeworkId}/submit`, { method: 'POST', body: dto }),
  getGradebook: (groupId: string) =>
    api<StudentGradebook>(`/api/student/groups/${groupId}/gradebook`),
};

export const parentApi = {
  getChildHomework: (studentId: string) =>
    api<ParentChildHomeworkDto[]>(`/api/parent/children/${studentId}/homework`),
};

export const adminApi = {
  resetUserPassword: (userId: string, dto?: ResetUserPasswordDto) =>
    api<ResetUserPasswordResultDto>(`/api/admin/users/${userId}/reset-password`, { method: 'POST', body: dto }),
};

export function normalizePhone(input: string, country?: Country): string {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('968') && digits.length === 11) return `+${digits}`;
  if (digits.startsWith('20') && (digits.length === 12 || digits.length === 13)) return `+${digits}`;
  if (country === 'EG' || (!country && digits.startsWith('01') && digits.length === 11)) {
    if (digits.startsWith('01') && digits.length === 11) {
      return `+20${digits.slice(1)}`;
    }
    if (digits.startsWith('1') && digits.length === 10) {
      return `+20${digits}`;
    }
  }
  if (country === 'OM' || !country) {
    if (digits.length === 8) {
      return `+968${digits.startsWith('0') ? digits.slice(1) : digits}`;
    }
  }
  return `+${digits}`;
}

export * from '../../shared/audit-events';

