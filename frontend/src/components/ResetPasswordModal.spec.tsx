import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResetPasswordModal } from './ResetPasswordModal';
import { adminApi } from '../lib/api';
import { LanguageProvider } from '../lib/i18n';

describe('ResetPasswordModal', () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.restoreAllMocks();
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.open = false;
    };
  });

  const renderModal = (props: {
    user: { id: string; name: string; phoneNumber?: string | null } | null;
    onClose: () => void;
  }) =>
    render(
      <QueryClientProvider client={qc}>
        <LanguageProvider>
          <ResetPasswordModal {...props} />
        </LanguageProvider>
      </QueryClientProvider>,
    );

  it('renders nothing when user is null', () => {
    const { container } = renderModal({ user: null, onClose: vi.fn() });
    expect(container.firstChild).toBeNull();
  });

  it('renders confirmation state and handles reset password successfully', async () => {
    const onClose = vi.fn();
    const user = { id: 'u-1', name: 'سالم المعلم', phoneNumber: '+96891234567' };

    vi.spyOn(adminApi, 'resetUserPassword').mockResolvedValue({
      success: true,
      temporaryPassword: 'Emtiaz#9999',
      userId: 'u-1',
      userName: 'سالم المعلم',
      userPhone: '+96891234567',
    });

    renderModal({ user, onClose });

    expect(screen.getByText('سالم المعلم')).toBeTruthy();
    expect(screen.getByText('+96891234567')).toBeTruthy();
    expect(screen.getAllByText(/إعادة تعيين كلمة المرور/i).length).toBeGreaterThanOrEqual(1);

    const resetBtn = screen.getByRole('button', { name: /إعادة تعيين كلمة المرور/i });
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.getByText('Emtiaz#9999')).toBeTruthy();
    });

    expect(screen.getByText(/نسخ كلمة المرور/i)).toBeTruthy();
    const whatsappLink = screen.getByText(/إرسال عبر واتساب/i).closest('a');
    expect(whatsappLink).toBeTruthy();
    expect(whatsappLink?.getAttribute('href')).toContain('wa.me/96891234567');
    expect(whatsappLink?.getAttribute('href')).toContain(encodeURIComponent('Emtiaz#9999'));
  });
});
