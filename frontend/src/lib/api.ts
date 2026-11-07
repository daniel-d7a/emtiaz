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
  CourseType,
} from '../../../shared/api';
import { normalizePhone } from './phone';

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
  CourseType,
  Session,
  SessionUser,
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
} from '../../../shared/api';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
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

/** Minimal fetch client: same-origin API, cookie sessions included. */
const BASE = import.meta.env.VITE_API_URL ?? '';

export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: any } = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'include',
  });
  if (res.status === 204) return undefined as T;
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

export const authApi = {
  session: async (): Promise<Session> => {
    const session: Session = await fetch(`${BASE}/api/auth/get-session?disableCookieCache=true`, {
      credentials: 'include',
      cache: 'no-store',
    }).then((r) => (r.ok ? r.json() : null));
    if (session?.user.role === 'ADMIN') {
      const res = await fetch(`${BASE}/api/admin/permissions`, { credentials: 'include', cache: 'no-store' });
      session.user.permissions = res.ok ? await res.json() : [];
    }
    return session;
  },
  login: (identifier: string, password: string) =>
    identifier.includes('@')
      ? api('/api/auth/sign-in/email', { body: { email: identifier.trim(), password } })
      : api('/api/auth/sign-in/phone-number', {
          body: { phoneNumber: normalizePhone(identifier), password },
        }),
  logout: () => api('/api/auth/sign-out', { body: {} }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api('/api/me/change-password', { body: { currentPassword, newPassword } }),
};

export const publicApi = {
  plans: () => api<PublicPlansResponse>('/api/public/plans'),
  support: () => api<PublicSupport>('/api/public/support'),
};

export const teacherApi = {
  getEntitlements: () => api<TeacherEntitlementsResponse>('/api/teacher/entitlements'),
  redeemCode: (code: string) =>
    api<RedeemCodeResponse>('/api/teacher/entitlements/redeem-code', { body: { code } }),
  activateSavedGift: (giftId: string) =>
    api<ActivateGiftResponse>(`/api/teacher/entitlements/gifts/${giftId}/activate`, { method: 'POST' }),
  deleteSavedGift: (giftId: string) =>
    api<DeleteGiftResponse>(`/api/teacher/entitlements/gifts/${giftId}`, { method: 'DELETE' }),
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

export const adminApi = {
  getPlans: () => api<Plan[]>('/api/admin/plans'),
  createPlan: (body: CreatePlanDto) => api<Plan>('/api/admin/plans', { body }),
  updatePlan: (id: string, body: UpdatePlanDto) =>
    api<Plan>(`/api/admin/plans/${id}`, { method: 'PATCH', body }),
  getPromoCodes: () => api<AdminPromoCode[]>('/api/admin/promo-codes'),
  createPromoCode: (body: CreatePromoCodeDto) =>
    api<AdminPromoCode>('/api/admin/promo-codes', { body }),
  updatePromoCode: (id: string, body: UpdatePromoCodeDto) =>
    api<AdminPromoCode>(`/api/admin/promo-codes/${id}`, { method: 'PATCH', body }),
  getTeacherEntitlements: (teacherId: string) =>
    api<AdminTeacherEntitlementsResponse>(`/api/admin/teachers/${teacherId}/entitlements`),
  assignTeacherSubscription: (teacherId: string, body: AdminAssignSubscriptionDto) =>
    api<any>(`/api/admin/teachers/${teacherId}/subscription`, { method: 'POST', body }),
  grantTeacherGift: (teacherId: string, body: AdminGrantGiftDto) =>
    api<any>(`/api/admin/teachers/${teacherId}/gift`, { method: 'POST', body }),
};
