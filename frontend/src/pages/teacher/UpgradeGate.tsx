import { useState } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, Input, Loading, Page, Progress } from '../../components/ui';
import { useLang } from '../../lib/i18n';
import { api, type RedeemCodeResponse, type Session } from '../../lib/api';
import { rootRoute } from '../../routes/__root';

export default function UpgradeGate() {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const [promoCode, setPromoCode] = useState('');

  const { data: session } = useQuery<Session>({
    queryKey: ['session'],
    queryFn: () => api('/api/auth/get-session'),
  });

  const { data: entitlements, isLoading } = useQuery({
    queryKey: ['teacher-entitlements'],
    queryFn: () => api('/api/teacher/entitlements'),
  });

  const redeem = useMutation({
    mutationFn: (code: string) =>
      api<RedeemCodeResponse>('/api/teacher/entitlements/redeem-code', {
        method: 'POST',
        body: { code },
      }),
    onSuccess: (data) => {
      toast.success(data.message);
      setPromoCode('');
      void qc.invalidateQueries({ queryKey: ['teacher-entitlements'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error');
    },
  });

  if (isLoading) {
    return (
      <Page title={t('upgradeGateTitle')}>
        <Loading />
      </Page>
    );
  }

  const { activePlan, usage, currency, supportWhatsapp, upgradeOptions, customPlanPrompt } =
    entitlements ?? {
      activePlan: { maxStudents: 10, maxStorageBytes: 1073741824 },
      usage: { activeStudentCount: 0, usedStorageBytes: 0 },
      currency: 'OMR',
      supportWhatsapp: '96890000000',
      upgradeOptions: [],
      customPlanPrompt: null,
    };

  const studentLimit = activePlan?.maxStudents ?? 10;
  const storageLimit = activePlan?.maxStorageBytes ?? 1073741824;

  const studentPct = Math.min(100, Math.round((usage.activeStudentCount / studentLimit) * 100));
  const storagePct = Math.min(100, Math.round((usage.usedStorageBytes / storageLimit) * 100));

  const formatStorage = (bytes: number | null) => {
    if (bytes == null) return t('unlimited');
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  const cleanPhone = (supportWhatsapp ?? '').replace(/\D/g, '');

  const getWhatsappUrl = (opt: any) => {
    const planName = lang === 'ar' ? opt.nameAr : opt.nameEn;
    const price = opt.firstMonthDiscountEligible && opt.firstMonthDiscountPrice != null
      ? `${opt.firstMonthDiscountPrice} ${opt.currency}`
      : `${opt.monthlyPrice} ${opt.currency}`;

    const discountNote = opt.firstMonthDiscountEligible
      ? (lang === 'ar' ? ' (مع خصم الشهر الأول)' : ' (with first-month limit-crossing discount)')
      : '';

    const text =
      lang === 'ar'
        ? `مرحبًا امتياز، أود ترقية وتفعيل خطتي كمعلم إلى (${planName}) بسعر ${price}${discountNote}.\nاسم المعلم: ${session?.user?.name ?? ''}\nرقم الهاتف: ${session?.user?.phoneNumber ?? session?.user?.email ?? ''}`
        : `Hello Emtiaz, I would like to upgrade and renew my teacher plan to (${planName}) for ${price}${discountNote}.\nTeacher Name: ${session?.user?.name ?? ''}\nContact: ${session?.user?.phoneNumber ?? session?.user?.email ?? ''}`;

    return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}` : '#';
  };

  return (
    <Page title={t('upgradeGateTitle')}>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Lockout Banner */}
        <div className="flex items-start gap-4 rounded-2xl border-2 border-danger/30 bg-danger/5 p-5">
          <div className="rounded-xl bg-danger/10 p-2 text-danger">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-danger">{t('upgradeGateTitle')}</h2>
            <p className="mt-1 text-sm text-ink-soft">{t('upgradeGateMessage')}</p>
          </div>
        </div>

        {/* Current Usage vs Limits */}
        <Card>
          <h3 className="mb-4 text-base font-bold text-ink">{t('entitlementsAndPlans')}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-background p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-ink-soft">{t('activeStudentsUsage')}</span>
                <span className="font-bold text-danger">
                  {usage.activeStudentCount} / {studentLimit}
                </span>
              </div>
              <Progress value={studentPct} />
            </div>

            <div className="rounded-xl border border-line bg-background p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-ink-soft">{t('storageUsage')}</span>
                <span className="font-bold text-danger">
                  {formatStorage(usage.usedStorageBytes)} / {formatStorage(storageLimit)}
                </span>
              </div>
              <Progress value={storagePct} />
            </div>
          </div>
        </Card>

        {/* Upgrade Options */}
        {upgradeOptions && upgradeOptions.length > 0 && (
          <Card>
            <h3 className="mb-4 text-base font-bold text-ink">{t('upgradeOptionsTitle')}</h3>
            <div className="grid gap-3">
              {upgradeOptions.map((opt: any) => {
                const planName = lang === 'ar' ? opt.nameAr : opt.nameEn;
                const hasDiscount =
                  opt.firstMonthDiscountEligible && opt.firstMonthDiscountPrice != null;

                return (
                  <div
                    key={opt.id}
                    className="flex flex-col justify-between rounded-xl border border-line bg-background p-4 transition sm:flex-row sm:items-center gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink text-base">{planName}</span>
                        {hasDiscount && (
                          <Badge tone="secondary">{t('firstMonthDiscount')}</Badge>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-ink-soft">
                        {opt.maxStudents ? `${opt.maxStudents} ${t('studentsCount')}` : t('unlimited')}
                        {' • '}
                        {formatStorage(opt.maxStorageBytes)}
                      </div>
                      <div className="mt-2 flex items-baseline gap-2">
                        {hasDiscount ? (
                          <>
                            <span className="text-xl font-black text-primary">
                              {opt.firstMonthDiscountPrice} {opt.currency}
                            </span>
                            <span className="text-xs text-ink-soft line-through">
                              {opt.monthlyPrice} {opt.currency}
                            </span>
                            <span className="text-xs text-ink-soft">{t('monthly')}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xl font-black text-ink">
                              {opt.monthlyPrice} {opt.currency}
                            </span>
                            <span className="text-xs text-ink-soft">{t('monthly')}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <a
                      href={getWhatsappUrl(opt)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary-dark"
                    >
                      <MessageCircle size={18} />
                      {t('upgradeViaWhatsapp')}
                    </a>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Custom Plan Prompt */}
        {customPlanPrompt && (
          <Card>
            <div className="text-center py-2">
              <p className="text-base font-semibold text-ink">{t('customPlanPromptText')}</p>
              <div className="mt-3">
                <a
                  href={cleanPhone ? `https://wa.me/${cleanPhone}` : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white transition hover:bg-primary-dark"
                >
                  <MessageCircle size={18} />
                  {t('contactAdminCustomPlan')}
                </a>
              </div>
            </div>
          </Card>
        )}

        {/* Promo / Referral Code Redemption */}
        <Card>
          <h3 className="mb-2 text-base font-bold text-ink">{t('redeemPromoCode')}</h3>
          <p className="mb-4 text-xs text-ink-soft">{t('enterPromoCodePlaceholder')}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (promoCode.trim()) {
                redeem.mutate(promoCode.trim());
              }
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Input
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="PROMO30"
              className="flex-1 uppercase font-mono"
            />
            <Button type="submit" disabled={!promoCode.trim() || redeem.isPending}>
              {t('redeemButton')}
            </Button>
          </form>
        </Card>

        {/* Back to Profile link */}
        <div className="text-center">
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-ink"
          >
            <span>{t('backToProfile')}</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </Page>
  );
}

export const teacherUpgradeGateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/teacher/upgrade-gate',
  component: UpgradeGate,
});
