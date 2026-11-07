import { eq } from 'drizzle-orm';
import { plans, notificationSettings } from './schema';

export const SEED_PLANS = [
  {
    slug: 'free',
    tierRank: 0,
    nameAr: 'المجانية',
    nameEn: 'Free',
    descriptionAr: 'للبدء وتجربة المنصة مع مجموعات صغيرة',
    descriptionEn: 'Get started and try the platform with small groups',
    monthlyPriceOmr: 0,
    yearlyMonthlyPriceOmr: 0,
    monthlyPriceEgp: 0,
    yearlyMonthlyPriceEgp: 0,
    maxStudents: 10,
    maxStorageBytes: 1073741824, // 1 GB
    maxGroups: null,
    trialDays: 0,
    isPublic: true,
    isDefault: true,
    displayOrder: 0,
  },
  {
    slug: 'early-bird',
    tierRank: 30,
    nameAr: 'الانطلاقة المبكرة',
    nameEn: 'Early Bird',
    descriptionAr: 'عرض إطلاق حصري مع تجربة مجانية كاملة لمدة 30 يومًا',
    descriptionEn: 'Exclusive launch offer with a 30-day full free trial',
    monthlyPriceOmr: 5,
    yearlyMonthlyPriceOmr: 5,
    monthlyPriceEgp: 300,
    yearlyMonthlyPriceEgp: 300,
    maxStudents: 500,
    maxStorageBytes: 107374182400, // 100 GB
    maxGroups: null,
    trialDays: 30,
    isPublic: true,
    isDefault: false,
    displayOrder: 1,
  },
  {
    slug: 'pro',
    tierRank: 10,
    nameAr: 'المحترف',
    nameEn: 'Pro',
    descriptionAr: 'للمعلمين المحترفين الراغبين بسعة أكبر',
    descriptionEn: 'For professional teachers needing more capacity',
    monthlyPriceOmr: 10,
    yearlyMonthlyPriceOmr: 7,
    monthlyPriceEgp: 500,
    yearlyMonthlyPriceEgp: 300,
    maxStudents: 50,
    maxStorageBytes: 10737418240, // 10 GB
    maxGroups: null,
    trialDays: 0,
    isPublic: false,
    isDefault: false,
    displayOrder: 2,
  },
  {
    slug: 'ultimate',
    tierRank: 20,
    nameAr: 'اللامحدود',
    nameEn: 'Ultimate',
    descriptionAr: 'سعة عالية للمعلمين والمراكز التعليمية',
    descriptionEn: 'High capacity for educators and learning centers',
    monthlyPriceOmr: 25,
    yearlyMonthlyPriceOmr: 20,
    monthlyPriceEgp: 1500,
    yearlyMonthlyPriceEgp: 1000,
    maxStudents: 200,
    maxStorageBytes: 53687091200, // 50 GB
    maxGroups: null,
    trialDays: 0,
    isPublic: false,
    isDefault: false,
    displayOrder: 3,
  },
];

export async function seedPlans(database: any) {
  for (const plan of SEED_PLANS) {
    await database
      .insert(plans)
      .values(plan)
      .onConflictDoUpdate({
        target: plans.slug,
        set: {
          tierRank: plan.tierRank,
          nameAr: plan.nameAr,
          nameEn: plan.nameEn,
          descriptionAr: plan.descriptionAr,
          descriptionEn: plan.descriptionEn,
          monthlyPriceOmr: plan.monthlyPriceOmr,
          yearlyMonthlyPriceOmr: plan.yearlyMonthlyPriceOmr,
          monthlyPriceEgp: plan.monthlyPriceEgp,
          yearlyMonthlyPriceEgp: plan.yearlyMonthlyPriceEgp,
          maxStudents: plan.maxStudents,
          maxStorageBytes: plan.maxStorageBytes,
          maxGroups: plan.maxGroups,
          trialDays: plan.trialDays,
          isPublic: plan.isPublic,
          isDefault: plan.isDefault,
          displayOrder: plan.displayOrder,
          updatedAt: new Date(),
        },
      });
  }

  await database
    .insert(notificationSettings)
    .values({
      id: 'global',
      supportEmail: 'support@emtiaz.om',
      supportPhone: '+96890000000',
      supportWhatsapp: '+96890000000',
      yearlyPlanDiscountEnabled: false,
      referralPlanSlug: 'early-bird',
      referralGiftDays: 7,
    })
    .onConflictDoUpdate({
      target: notificationSettings.id,
      set: {
        supportWhatsapp: '+96890000000',
        yearlyPlanDiscountEnabled: false,
        referralPlanSlug: 'early-bird',
        referralGiftDays: 7,
      },
    });
}
