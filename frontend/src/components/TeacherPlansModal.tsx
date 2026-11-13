import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, MessageCircle, Sparkles, Zap } from 'lucide-react';
import { Badge, Button, Dialog } from './ui';
import { useLang } from '../lib/i18n';
import { publicApi, type PublicPlan, type TeacherUpgradeOption } from '../lib/api';

type TeacherPlansModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    name?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
  };
  activePlan: {
    slug: string;
    nameAr: string;
    nameEn?: string;
    tierRank?: number;
  };
  currency?: 'OMR' | 'EGP';
  supportWhatsapp?: string | null;
  upgradeOptions?: TeacherUpgradeOption[];
  customPlanPrompt?: string | null;
};

export function TeacherPlansModal({
  open,
  onOpenChange,
  user,
  activePlan,
  currency: defaultCurrency = 'OMR',
  supportWhatsapp = '+96890000000',
  upgradeOptions = [],
  customPlanPrompt,
}: TeacherPlansModalProps) {
  const { t, lang } = useLang();
  const [selectedCurrency, setSelectedCurrency] = useState<'OMR' | 'EGP'>(defaultCurrency);

  const { data: plansData } = useQuery({
    queryKey: ['public-plans'],
    queryFn: () => publicApi.plans(),
    staleTime: 60_000,
  });

  const plans = plansData?.plans ?? [];
  const cleanPhone = (supportWhatsapp ?? '96890000000').replace(/\D/g, '');

  const formatStorage = (bytes: number | null) => {
    if (bytes == null) return t('unlimited');
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return lang === 'ar' ? `${gb.toFixed(0)} جيجابايت سعة ملفات` : `${gb.toFixed(0)} GB file storage`;
    return lang === 'ar' ? `${(bytes / (1024 * 1024)).toFixed(0)} ميجابايت سعة ملفات` : `${(bytes / (1024 * 1024)).toFixed(0)} MB file storage`;
  };

  const currentPlanName = lang === 'ar' ? activePlan.nameAr : (activePlan.nameEn || activePlan.nameAr);

  const selectPlanAndRedirect = (plan: PublicPlan) => {
    const planName = lang === 'ar' ? plan.nameAr : plan.nameEn;
    const priceNum = selectedCurrency === 'EGP' ? plan.monthlyPriceEgp : plan.monthlyPriceOmr;
    const priceUnit = selectedCurrency === 'EGP' ? (lang === 'ar' ? 'ج.م' : 'EGP') : (lang === 'ar' ? 'ر.ع' : 'OMR');
    const priceStr = priceNum === 0
      ? (lang === 'ar' ? 'مجانًا' : 'Free')
      : `${priceNum} ${priceUnit}/${lang === 'ar' ? 'شهريًا' : 'month'}`;

    // Check if there is an upgrade discount option
    const opt = upgradeOptions.find((o) => o.slug === plan.slug);
    const isDiscountEligible = opt ? opt.firstMonthDiscountEligible : false;
    const discountPrice = isDiscountEligible
      ? (selectedCurrency === 'EGP' ? plan.yearlyMonthlyPriceEgp : plan.yearlyMonthlyPriceOmr)
      : null;
    const discountNote = discountPrice != null
      ? (lang === 'ar' ? ` (مع خصم الشهر الأول: ${discountPrice} ${priceUnit})` : ` (with first-month discount: ${discountPrice} ${priceUnit})`)
      : '';

    const text =
      lang === 'ar'
        ? `مرحبًا امتياز، أود ترقية وتفعيل خطتي كمعلم إلى (${planName}) بسعر ${priceStr}${discountNote}.\nاسم المعلم: ${user.name ?? ''}\nالهاتف/البريد: ${user.phoneNumber ?? user.email ?? ''}\nالخطة الحالية: ${currentPlanName}`
        : `Hello Emtiaz, I would like to upgrade and activate my teacher plan to (${planName}) for ${priceStr}${discountNote}.\nTeacher Name: ${user.name ?? ''}\nContact: ${user.phoneNumber ?? user.email ?? ''}\nCurrent Plan: ${currentPlanName}`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    onOpenChange(false);
  };

  const handleCustomPlanRedirect = () => {
    const text =
      lang === 'ar'
        ? `مرحبًا امتياز، أود الاستفسار عن خطة مخصصة (Custom Plan) بسعة وعدد طلاب أكبر.\nاسم المعلم: ${user.name ?? ''}\nالهاتف/البريد: ${user.phoneNumber ?? user.email ?? ''}\nالخطة الحالية: ${currentPlanName}`
        : `Hello Emtiaz, I would like to inquire about a Custom Plan with higher capacity.\nTeacher Name: ${user.name ?? ''}\nContact: ${user.phoneNumber ?? user.email ?? ''}\nCurrent Plan: ${currentPlanName}`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('choosePlanTitle')}
      description={t('choosePlanDesc')}
      className="max-w-3xl"
      footer={
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          {t('close')}
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Currency Switcher */}
        <div className="flex items-center justify-between rounded-xl border border-line bg-background p-3">
          <span className="text-xs font-semibold text-ink-soft">
            {lang === 'ar' ? 'عرض الأسعار بالعملة:' : 'Display prices in:'}
          </span>
          <div className="inline-flex rounded-lg border border-line bg-surface p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSelectedCurrency('OMR')}
              className={`rounded px-2.5 py-1 transition ${
                selectedCurrency === 'OMR' ? 'bg-primary text-white shadow-xs' : 'text-ink-soft hover:text-ink'
              }`}
            >
              ر.ع (OMR)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCurrency('EGP')}
              className={`rounded px-2.5 py-1 transition ${
                selectedCurrency === 'EGP' ? 'bg-primary text-white shadow-xs' : 'text-ink-soft hover:text-ink'
              }`}
            >
              ج.م (EGP)
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {plans.map((p) => {
            const isCurrent = p.slug === activePlan.slug;
            const isFree = p.slug === 'free' || (selectedCurrency === 'OMR' ? p.monthlyPriceOmr === 0 : p.monthlyPriceEgp === 0);
            const planName = lang === 'ar' ? p.nameAr : p.nameEn;
            const desc = lang === 'ar' ? p.descriptionAr : p.descriptionEn;
            const priceNum = selectedCurrency === 'EGP' ? p.monthlyPriceEgp : p.monthlyPriceOmr;
            const priceUnit = isFree
              ? (lang === 'ar' ? 'مجانًا دائمًا' : 'Free forever')
              : selectedCurrency === 'EGP'
                ? (lang === 'ar' ? 'ج.م / شهريًا' : 'EGP / month')
                : (lang === 'ar' ? 'ر.ع / شهريًا' : 'OMR / month');

            const studentLabel = p.maxStudents
              ? (lang === 'ar' ? `حتى ${p.maxStudents} طالب نشط` : `Up to ${p.maxStudents} active students`)
              : (lang === 'ar' ? 'طلاب غير محدودين' : 'Unlimited students');

            const opt = upgradeOptions.find((o) => o.slug === p.slug);
            const isDiscountEligible = opt ? opt.firstMonthDiscountEligible : false;
            const discountPrice = isDiscountEligible
              ? (selectedCurrency === 'EGP' ? p.yearlyMonthlyPriceEgp : p.yearlyMonthlyPriceOmr)
              : null;
            const hasFirstMonthDiscount = discountPrice != null;

            return (
              <div
                key={p.id}
                className={`flex flex-col justify-between rounded-2xl border p-5 transition ${
                  isCurrent
                    ? 'border-primary/50 bg-primary/5 shadow-xs'
                    : 'border-line bg-surface hover:border-line/90'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-ink">{planName}</h3>
                    {isCurrent ? (
                      <Badge tone="primary">{t('currentPlanBadge')}</Badge>
                    ) : p.trialDays > 0 ? (
                      <Badge tone="secondary">
                        {lang === 'ar' ? `تجربة ${p.trialDays} يومًا` : `${p.trialDays}-day trial`}
                      </Badge>
                    ) : null}
                  </div>

                  {desc && <p className="mt-1 text-xs text-ink-soft">{desc}</p>}

                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-ink">{priceNum}</span>
                    <span className="text-xs font-semibold text-ink-soft">{priceUnit}</span>
                  </div>

                  {hasFirstMonthDiscount && (
                    <p className="mt-1 text-xs font-semibold text-secondary">
                      {lang === 'ar'
                        ? `خصم الشهر الأول: ${discountPrice} ${selectedCurrency === 'EGP' ? 'ج.م' : 'ر.ع'}`
                        : `First-month discount: ${discountPrice} ${selectedCurrency}`}
                    </p>
                  )}

                  <ul className="mt-4 space-y-2 border-t border-line/50 pt-3 text-xs text-ink-soft">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-primary shrink-0" />
                      <span>{studentLabel}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-primary shrink-0" />
                      <span>{formatStorage(p.maxStorageBytes)}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-primary shrink-0" />
                      <span>{lang === 'ar' ? 'مقررات ودروس واختبارات ذاتية التصحيح' : 'Full courses, lessons & self-graded quizzes'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-primary shrink-0" />
                      <span>{lang === 'ar' ? 'دعوات ورسائل واتساب مؤتمتة' : 'Automated WhatsApp invites & notices'}</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-5 pt-2">
                  {isCurrent ? (
                    <Button variant="ghost" disabled className="w-full border border-line text-xs font-semibold">
                      {t('currentPlanBadge')}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => selectPlanAndRedirect(p)}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-bold"
                    >
                      <MessageCircle size={15} />
                      <span>{t('selectPlanAndWhatsapp')}</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Plan Inquiries */}
        <div className="rounded-2xl border border-dashed border-line bg-background p-4 text-center">
          <div className="flex flex-col items-center">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
              <Zap size={18} />
            </div>
            <h4 className="text-sm font-bold text-ink">{t('customPlanCardTitle')}</h4>
            <p className="mt-1 max-w-lg text-xs text-ink-soft">{t('customPlanCardDesc')}</p>
            <Button
              variant="ghost"
              onClick={handleCustomPlanRedirect}
              className="mt-3 flex items-center gap-1.5 border border-line text-xs font-semibold"
            >
              <MessageCircle size={14} />
              <span>{t('contactForCustomPlan')}</span>
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
