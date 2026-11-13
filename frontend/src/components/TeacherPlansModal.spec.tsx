import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TeacherPlansModal } from './TeacherPlansModal';
import { publicApi } from '../lib/api';
import { LanguageProvider } from '../lib/i18n';

describe('TeacherPlansModal', () => {
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

  afterEach(() => {
    cleanup();
  });

  const mockPlans = [
    {
      id: 'p-free',
      slug: 'free',
      tierRank: 0,
      nameAr: 'المجانية',
      nameEn: 'Free',
      descriptionAr: 'للبدء وتجربة المنصة',
      descriptionEn: 'Get started',
      monthlyPriceOmr: 0,
      yearlyMonthlyPriceOmr: 0,
      monthlyPriceEgp: 0,
      yearlyMonthlyPriceEgp: 0,
      maxStudents: 10,
      maxStorageBytes: 1073741824,
      maxGroups: null,
      trialDays: 0,
      displayOrder: 0,
    },
    {
      id: 'p-early-bird',
      slug: 'early-bird',
      tierRank: 30,
      nameAr: 'الانطلاقة المبكرة',
      nameEn: 'Early Bird',
      descriptionAr: 'عرض إطلاق حصري',
      descriptionEn: 'Launch offer',
      monthlyPriceOmr: 5,
      yearlyMonthlyPriceOmr: 5,
      monthlyPriceEgp: 300,
      yearlyMonthlyPriceEgp: 300,
      maxStudents: 500,
      maxStorageBytes: 107374182400,
      maxGroups: null,
      trialDays: 30,
      displayOrder: 1,
    },
  ];

  it('renders plans, marks current plan, and opens WhatsApp when selecting upgrade plan', async () => {
    vi.spyOn(publicApi, 'plans').mockResolvedValue({
      plans: mockPlans,
      yearlyPlanDiscountEnabled: false,
      supportWhatsapp: '+96891234567',
    });

    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const onOpenChange = vi.fn();

    render(
      <QueryClientProvider client={qc}>
        <LanguageProvider>
          <TeacherPlansModal
            open={true}
            onOpenChange={onOpenChange}
            user={{ name: 'سالم المعلم', phoneNumber: '91234567' }}
            activePlan={{ slug: 'free', nameAr: 'المجانية' }}
            currency="OMR"
            supportWhatsapp="+96891234567"
          />
        </LanguageProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('خطط اشتراك المعلمين')).toBeTruthy();
      expect(screen.getByText('الانطلاقة المبكرة')).toBeTruthy();
    });

    // Free plan is marked as current plan
    expect(screen.getAllByText('خطتك الحالية').length).toBeGreaterThanOrEqual(1);

    // Click on upgrade button for Early Bird
    const selectBtn = screen.getByRole('button', { name: /اختيار الخطة والترقية عبر واتساب/i });
    fireEvent.click(selectBtn);

    expect(windowOpenSpy).toHaveBeenCalledTimes(1);
    const openedUrl = windowOpenSpy.mock.calls[0][0] as string;
    expect(openedUrl).toContain('wa.me/96891234567');
    expect(openedUrl).toContain(encodeURIComponent('الانطلاقة المبكرة'));
    expect(openedUrl).toContain(encodeURIComponent('سالم المعلم'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('displays early bird first-month discount in EGP matching the plan price (300 EGP)', async () => {
    vi.spyOn(publicApi, 'plans').mockResolvedValue({
      plans: mockPlans,
      yearlyPlanDiscountEnabled: false,
      supportWhatsapp: '+96891234567',
    });

    const mockUpgradeOptions = [
      {
        id: 'p-early-bird',
        slug: 'early-bird',
        nameAr: 'الانطلاقة المبكرة',
        nameEn: 'Early Bird',
        tierRank: 30,
        monthlyPrice: 5,
        yearlyMonthlyPrice: 5,
        currency: 'OMR' as const,
        maxStudents: 500,
        maxStorageBytes: 107374182400,
        firstMonthDiscountPrice: 5,
        firstMonthDiscountEligible: true,
      },
    ];

    render(
      <QueryClientProvider client={qc}>
        <LanguageProvider>
          <TeacherPlansModal
            open={true}
            onOpenChange={vi.fn()}
            user={{ name: 'سالم المعلم', phoneNumber: '91234567' }}
            activePlan={{ slug: 'free', nameAr: 'المجانية' }}
            currency="OMR"
            upgradeOptions={mockUpgradeOptions}
          />
        </LanguageProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('الانطلاقة المبكرة')).toBeTruthy();
    });

    // In OMR, it shows 5 ر.ع
    expect(screen.getByText(/خصم الشهر الأول: 5 ر.ع/)).toBeTruthy();

    // Switch to EGP
    const egpBtn = screen.getByRole('button', { name: /ج.م \(EGP\)/i });
    fireEvent.click(egpBtn);

    // In EGP, it shows 300 ج.م (the same price as the plan)
    expect(screen.getByText(/خصم الشهر الأول: 300 ج.م/)).toBeTruthy();
  });
});
