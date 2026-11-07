import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { Badge, Button, Dialog } from './ui';
import { useLang } from '../lib/i18n';
import { api, onPlanLimitReached, type PlanLimitReachedResponse, type Session } from '../lib/api';

export function UpgradeModal() {
  const { t, lang } = useLang();
  const [data, setData] = useState<PlanLimitReachedResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const { data: session } = useQuery<Session>({
    queryKey: ['session'],
    queryFn: () => api('/api/auth/get-session'),
  });

  const { data: entitlements } = useQuery({
    queryKey: ['teacher-entitlements'],
    queryFn: () => api('/api/teacher/entitlements'),
    enabled: session?.user?.role === 'TEACHER',
  });

  useEffect(() => {
    return onPlanLimitReached((limitData) => {
      setData(limitData);
      setIsOpen(true);
    });
  }, []);

  if (!isOpen || !data) return null;

  const close = () => {
    setIsOpen(false);
  };

  const supportWhatsapp = entitlements?.supportWhatsapp ?? '96890000000';
  const cleanPhone = (supportWhatsapp ?? '').replace(/\D/g, '');

  const formatStorage = (bytes: number | null) => {
    if (bytes == null) return t('unlimited');
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(0)} GB`;
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  const getWhatsappUrl = (opt: PlanLimitReachedResponse['upgradeOptions'][number]) => {
    const planName = lang === 'ar' ? opt.nameAr : opt.nameEn;
    const price = opt.firstMonthDiscountEligible && opt.firstMonthDiscountPrice != null
      ? `${opt.firstMonthDiscountPrice} ${opt.currency}`
      : `${opt.monthlyPrice} ${opt.currency}`;

    const discountNote = opt.firstMonthDiscountEligible
      ? (lang === 'ar' ? ' (مع خصم الشهر الأول)' : ' (with first-month limit-crossing discount)')
      : '';

    const text =
      lang === 'ar'
        ? `مرحبًا امتياز، أود ترقية خطتي إلى (${planName}) بسعر ${price}${discountNote}.\nاسم المعلم: ${session?.user?.name ?? ''}\nرقم الهاتف: ${session?.user?.phoneNumber ?? session?.user?.email ?? ''}`
        : `Hello Emtiaz, I would like to upgrade my plan to (${planName}) for ${price}${discountNote}.\nTeacher Name: ${session?.user?.name ?? ''}\nContact: ${session?.user?.phoneNumber ?? session?.user?.email ?? ''}`;

    return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}` : '#';
  };

  const getCustomPlanWhatsappUrl = () => {
    const text =
      lang === 'ar'
        ? `مرحبًا امتياز، وصلت للحد الأقصى لأعلى خطة وأرغب في الاستفسار عن خطة مخصصة (Custom Plan).\nاسم المعلم: ${session?.user?.name ?? ''}\nرقم الهاتف: ${session?.user?.phoneNumber ?? session?.user?.email ?? ''}`
        : `Hello Emtiaz, I have reached the top tier plan limit and would like to inquire about a Custom Plan.\nTeacher Name: ${session?.user?.name ?? ''}\nContact: ${session?.user?.phoneNumber ?? session?.user?.email ?? ''}`;
    return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}` : '#';
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={setIsOpen}
      title={t('planLimitReached')}
      footer={
        <Button variant="ghost" onClick={close}>
          {t('cancel')}
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-soft">
          {data.limitType === 'STUDENTS'
            ? t('studentLimitReachedDesc')
            : t('storageLimitReachedDesc')}
        </p>

        <div className="rounded-xl border border-line bg-background p-3 text-sm">
          <div className="flex justify-between font-semibold">
            <span>
              {data.limitType === 'STUDENTS' ? t('activeStudentsUsage') : t('storageUsage')}
            </span>
            <span className="font-bold text-primary">
              {data.limitType === 'STUDENTS'
                ? `${data.currentUsage} / ${data.limit} ${t('studentsCount')}`
                : `${formatStorage(data.currentUsage)} / ${formatStorage(data.limit)}`}
            </span>
          </div>
        </div>

        {data.upgradeOptions && data.upgradeOptions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-ink">{t('upgradeOptionsTitle')}</h4>
            <div className="grid gap-3">
              {data.upgradeOptions.map((opt) => {
                const planName = lang === 'ar' ? opt.nameAr : opt.nameEn;
                const hasDiscount =
                  opt.firstMonthDiscountEligible && opt.firstMonthDiscountPrice != null;

                return (
                  <div
                    key={opt.id}
                    className="flex flex-col justify-between rounded-xl border border-line bg-card p-4 transition sm:flex-row sm:items-center gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink">{planName}</span>
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
                            <span className="text-lg font-black text-primary">
                              {opt.firstMonthDiscountPrice} {opt.currency}
                            </span>
                            <span className="text-xs text-ink-soft line-through">
                              {opt.monthlyPrice} {opt.currency}
                            </span>
                            <span className="text-xs text-ink-soft">{t('monthly')}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-lg font-black text-ink">
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
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-white transition hover:bg-primary-dark"
                    >
                      <MessageCircle size={15} />
                      {t('upgradeViaWhatsapp')}
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {data.customPlanPrompt && (
          <div className="rounded-xl border border-line bg-background p-4 text-center">
            <p className="text-sm font-semibold text-ink">{t('customPlanPromptText')}</p>
            <div className="mt-3">
              <a
                href={getCustomPlanWhatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-white transition hover:bg-primary-dark"
              >
                <MessageCircle size={15} />
                {t('contactAdminCustomPlan')}
              </a>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
