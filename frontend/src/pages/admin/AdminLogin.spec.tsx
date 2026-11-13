import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminLogin from './AdminLogin';
import { authApi } from '../../lib/api';
import { LanguageProvider } from '../../lib/i18n';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    Link: (props: any) => <a href={props.to} className={props.className}>{props.children}</a>,
    useNavigate: () => mockNavigate,
  };
});

describe('AdminLogin', () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={qc}>
        <LanguageProvider>
          <AdminLogin />
        </LanguageProvider>
      </QueryClientProvider>,
    );

  it('renders admin login portal form correctly', () => {
    renderComponent();
    expect(screen.getByText('بوابة إدارة منصة امتياز')).toBeTruthy();
    expect(screen.getByText('تسجيل الدخول مخصص لمشرفي النظام فقط')).toBeTruthy();
    expect(screen.getByRole('button', { name: /تسجيل الدخول كمسؤول/i })).toBeTruthy();
    expect(screen.getByText(/العودة لتسجيل دخول المعلمين والطلبة/i)).toBeTruthy();
  });

  it('shows error if a non-admin account logs in', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue({
      user: { id: 'u-teacher', role: 'TEACHER', name: 'معلم' } as any,
    });
    vi.spyOn(authApi, 'session').mockResolvedValue({
      user: { id: 'u-teacher', role: 'TEACHER', name: 'معلم' } as any,
      session: {} as any,
    });
    const logoutSpy = vi.spyOn(authApi, 'logout').mockResolvedValue(undefined as any);

    renderComponent();

    const emailInput = screen.getByPlaceholderText('admin@emtiaz.om');
    const passwordInput = screen.getByLabelText(/كلمة المرور/i);

    fireEvent.change(emailInput, { target: { value: 'teacher@demo.om' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitBtn = screen.getByRole('button', { name: /تسجيل الدخول كمسؤول/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('هذا الحساب ليس لديه صلاحيات المشرف.')).toBeTruthy();
    });
    expect(logoutSpy).toHaveBeenCalled();
  });

  it('navigates to admin dashboard on successful admin login', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue({
      user: { id: 'u-admin', role: 'ADMIN', name: 'مدير النظام' } as any,
    });
    vi.spyOn(authApi, 'session').mockResolvedValue({
      user: { id: 'u-admin', role: 'ADMIN', name: 'مدير النظام' } as any,
      session: {} as any,
    });

    renderComponent();

    const emailInput = screen.getByPlaceholderText('admin@emtiaz.om');
    const passwordInput = screen.getByLabelText(/كلمة المرور/i);

    fireEvent.change(emailInput, { target: { value: 'admin@emtiaz.om' } });
    fireEvent.change(passwordInput, { target: { value: 'admin-password-123' } });

    const submitBtn = screen.getByRole('button', { name: /تسجيل الدخول كمسؤول/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/admin/dashboard' });
    });
  });
});
