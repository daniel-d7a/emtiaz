import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
  };
});

import { LanguageProvider } from '../../lib/i18n';
import Privacy from './Privacy';
import Terms from './Terms';

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

describe('Privacy Policy Page', () => {
  it('renders privacy policy heading and core compliance provisions', () => {
    renderWithProviders(<Privacy />);

    // Check main title
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('سياسة الخصوصية');

    // Check zero-data-selling guarantee
    expect(screen.getByText(/ضمانة امتياز الأساسية/)).toBeTruthy();
    expect(screen.getByText(/عدم بيع أو تأجير أو مشاركة/)).toBeTruthy();

    // Check minor data protection
    expect(screen.getAllByText(/حماية بيانات الطلبة والقُصّر/)[0]).toBeTruthy();

    // Check parent read-only access
    expect(screen.getByText(/حدود وصول أولياء الأمور/)).toBeTruthy();
    expect(screen.getByText(/اطلاع وقراءة فقط/)).toBeTruthy();

    // Check Cloudflare R2 and encryption
    expect(screen.getAllByText(/Cloudflare R2/)[0]).toBeTruthy();
    expect(screen.getByText(/التشفير أثناء النقل وأثناء السكون/)).toBeTruthy();

    // Check user rights to deletion and export
    expect(screen.getByText(/حق الحذف والنسيان/)).toBeTruthy();
    expect(screen.getByText(/حق التصدير والنقل/)).toBeTruthy();
  });
});

describe('Terms of Service Page', () => {
  it('renders terms of service heading and core platform guarantees', () => {
    renderWithProviders(<Terms />);

    // Check main title
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('شروط الاستخدام والخدمة');

    // Check 100% free guarantee for students & parents
    expect(screen.getByText(/ضمانة مجانية المنصة للطلبة وأولياء الأمور/)).toBeTruthy();
    expect(screen.getByText(/مجانية تمامًا وبلا أي مقابل مالي أو رسوم اشتراك/)).toBeTruthy();

    // Check teacher IP ownership
    expect(screen.getByText(/حقوق الملكية الفكرية ومحتوى المعلم/)).toBeTruthy();
    expect(screen.getByText(/ملكية المعلم الكاملة 100%/)).toBeTruthy();

    // Check subscriptions and free trial
    expect(screen.getByText(/باقات المعلمين، الفوترة، وسياسة الإلغاء/)).toBeTruthy();
    expect(screen.getByText(/الباقة المجانية وفترة التجربة/)).toBeTruthy();

    // Check acceptable use and prohibited conduct
    expect(screen.getByText(/الاستخدام المقبول والسلوكيات المحظورة/)).toBeTruthy();
  });
});
