import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminAudit, { getActionBadgeStyle, type AuditRow } from './Audit';
import * as apiModule from '../../lib/api';
import { LanguageProvider } from '../../lib/i18n';
import { AUDIT_CATEGORIES } from '../../../../shared/audit-events';

afterEach(cleanup);

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>{ui}</LanguageProvider>
    </QueryClientProvider>,
  );
}

describe('AdminAudit Dashboard', () => {
  const mockAuditData: AuditRow[] = [
    {
      id: 'audit-1',
      action: 'quiz.create',
      targetType: 'quiz',
      targetId: 'quiz-123',
      endpoint: null,
      responseType: 'success',
      metadata: { courseId: 'c-1', title: 'اختبار الوحدة الأولى' },
      createdAt: '2026-11-08T10:00:00.000Z',
      actorName: 'سالم المعلم',
      actorPhone: '+96891234567',
      actorRole: 'TEACHER',
    },
    {
      id: 'audit-2',
      action: 'student.remove',
      targetType: 'group',
      targetId: 'grp-456',
      endpoint: null,
      responseType: 'success',
      metadata: { studentId: 'stu-789' },
      createdAt: '2026-11-08T11:00:00.000Z',
      actorName: 'سالم المعلم',
      actorPhone: '+96891234567',
      actorRole: 'TEACHER',
    },
    {
      id: 'audit-3',
      action: 'user.password.reset',
      targetType: 'user',
      targetId: 'user-999',
      endpoint: '/api/admin/users/user-999/reset-password',
      responseType: 'success',
      metadata: { forcedChange: true },
      createdAt: '2026-11-08T12:00:00.000Z',
      actorName: 'مدير المنصة',
      actorPhone: '+96890000000',
      actorRole: 'ADMIN',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });

    vi.spyOn(apiModule, 'api').mockImplementation(async (path: string) => {
      if (path.startsWith('/api/admin/audit')) {
        return mockAuditData as any;
      }
      if (path.startsWith('/api/admin/errors/tail')) {
        return { file: '/var/log/emtiaz.log', lines: [] } as any;
      }
      return [] as any;
    });
  });

  it('renders category filter dropdown and User ID search field', async () => {
    renderWithProviders(<AdminAudit />);

    // User ID search input
    expect(screen.getByLabelText(/ابحث بمعرّف المستخدم/i)).toBeTruthy();

    // Category filter dropdown with all categories
    const categorySelect = screen.getByLabelText(/التصنيف/i) as HTMLSelectElement;
    expect(categorySelect).toBeTruthy();

    // Options exist
    expect(screen.getByText('كل التصنيفات')).toBeTruthy();
    expect(screen.getByText(AUDIT_CATEGORIES.CURRICULUM.nameAr)).toBeTruthy();
    expect(screen.getByText(AUDIT_CATEGORIES.COHORTS.nameAr)).toBeTruthy();
    expect(screen.getByText(AUDIT_CATEGORIES.QUIZZES.nameAr)).toBeTruthy();
    expect(screen.getByText(AUDIT_CATEGORIES.HOMEWORK.nameAr)).toBeTruthy();
    expect(screen.getByText(AUDIT_CATEGORIES.USERS_AUTH.nameAr)).toBeTruthy();
    expect(screen.getByText(AUDIT_CATEGORIES.BILLING.nameAr)).toBeTruthy();
    expect(screen.getByText(AUDIT_CATEGORIES.SETTINGS.nameAr)).toBeTruthy();
  });

  it('renders action badges with localized labels and color-coded styling', async () => {
    renderWithProviders(<AdminAudit />);

    // Localized action names rendered
    await waitFor(() => {
      expect(screen.getByText('إنشاء اختبار')).toBeTruthy();
      expect(screen.getByText('إزالة طالب من مجموعة')).toBeTruthy();
      expect(screen.getByText('إعادة تعيين كلمة المرور')).toBeTruthy();
    });

    // Check style helper for color differentiation
    expect(getActionBadgeStyle('quiz.create')).toContain('emerald');
    expect(getActionBadgeStyle('student.remove')).toContain('rose');
    expect(getActionBadgeStyle('group.update')).toContain('blue');
    expect(getActionBadgeStyle('user.password.reset')).toContain('amber');
  });

  it('opens event details modal when a row is clicked and displays metadata', async () => {
    renderWithProviders(<AdminAudit />);

    await waitFor(() => {
      expect(screen.getByText('إنشاء اختبار')).toBeTruthy();
    });

    // Click on the row
    const row = screen.getByRole('button', { name: /quiz\.create - سالم المعلم/i });
    fireEvent.click(row);

    // Verify modal is open and inspects details
    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeTruthy();
      expect(within(dialog).getByRole('heading', { name: 'تفاصيل الحدث' })).toBeTruthy();
      expect(within(dialog).getByText('quiz-123')).toBeTruthy();
      expect(within(dialog).getByText(/اختبار الوحدة الأولى/)).toBeTruthy();
    });

    // Close button works
    const closeBtn = screen.getByRole('button', { name: 'إغلاق' });
    fireEvent.click(closeBtn);
  });

  it('filters by category and triggers refetch with category query param', async () => {
    const apiSpy = vi.spyOn(apiModule, 'api');
    renderWithProviders(<AdminAudit />);

    const categorySelect = screen.getByLabelText(/التصنيف/i);
    fireEvent.change(categorySelect, { target: { value: 'QUIZZES' } });

    await waitFor(() => {
      expect(apiSpy).toHaveBeenCalledWith(
        expect.stringContaining('category=QUIZZES'),
      );
    });
  });

  it('filters by user ID and triggers refetch with userId query param', async () => {
    const apiSpy = vi.spyOn(apiModule, 'api');
    renderWithProviders(<AdminAudit />);

    const userIdInput = screen.getByLabelText(/ابحث بمعرّف المستخدم/i);
    fireEvent.change(userIdInput, { target: { value: 'user-999' } });

    await waitFor(
      () => {
        expect(apiSpy).toHaveBeenCalledWith(
          expect.stringContaining('userId=user-999'),
        );
      },
      { timeout: 1000 },
    );
  });
});
