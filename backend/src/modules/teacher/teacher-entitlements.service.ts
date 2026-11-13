import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gt, inArray, sql } from 'drizzle-orm';
import { db } from '../../db';
import {
  groupStudents,
  plans,
  promoCodes,
  teacherDiscounts,
  teacherGifts,
  teacherReferrals,
  teacherSubscriptions,
  users,
} from '../../db/schema';
import { NotificationSettingsService } from '../notifications/notification-settings.service';
import type {
  ActivateGiftResponse,
  Country,
  Currency,
  DeleteGiftResponse,
  PlanLimitType,
  RedeemCodeResponse,
  ReferralItem,
  ReferralSummary,
  SavedGift,
  TeacherActivePlan,
  TeacherEntitlementsResponse,
  TeacherEntitlementStatus,
  TeacherUpgradeOption,
} from '../../../shared/api';

@Injectable()
export class TeacherEntitlementsService {
  constructor(private readonly notificationSettings: NotificationSettingsService) {}

  /**
   * Generates a unique 8-character uppercase referral code (e.g. REF-XXXX).
   */
  async generateUniqueReferralCode(txOrDb: any = db): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempt = 0; attempt < 30; attempt++) {
      let code = 'REF-';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const [existing] = await txOrDb
        .select({ id: users.id })
        .from(users)
        .where(eq(users.referralCode, code))
        .limit(1);
      if (!existing) {
        return code;
      }
    }
    return `REF-${Date.now().toString(36).toUpperCase().slice(-4)}`;
  }

  /**
   * Ensures that a teacher with at least one ADMIN_PAID subscription has a unique referral code.
   */
  async ensureTeacherReferralCode(teacherId: string, txOrDb: any = db): Promise<string | null> {
    const [user] = await txOrDb
      .select({ referralCode: users.referralCode })
      .from(users)
      .where(eq(users.id, teacherId))
      .limit(1);

    if (user?.referralCode) {
      return user.referralCode;
    }

    const [paidSub] = await txOrDb
      .select({ id: teacherSubscriptions.id })
      .from(teacherSubscriptions)
      .where(
        and(
          eq(teacherSubscriptions.teacherId, teacherId),
          eq(teacherSubscriptions.source, 'ADMIN_PAID'),
        ),
      )
      .limit(1);

    if (!paidSub) {
      return null;
    }

    const newCode = await this.generateUniqueReferralCode(txOrDb);
    await txOrDb
      .update(users)
      .set({ referralCode: newCode })
      .where(eq(users.id, teacherId));

    return newCode;
  }

  /**
   * Distinct non-deleted students enrolled in teacher's active groups (isActive = true,
   * non-deleted group and course, non-deleted student) unioned with distinct students
   * who joined any group of the teacher during the current calendar month.
   */
  async calculateActiveStudentCount(teacherId: string): Promise<number> {
    const result = await db.execute<{ count: number }>(sql`
      SELECT count(DISTINCT s.student_id)::int AS count
      FROM (
        SELECT gs.student_id
        FROM group_students gs
        JOIN groups g ON g.id = gs.group_id
        JOIN courses c ON c.id = g.course_id
        JOIN "user" u ON u.id = gs.student_id
        WHERE c.teacher_id = ${teacherId}
          AND c.deleted_at IS NULL
          AND g.deleted_at IS NULL
          AND g.is_active = true
          AND u.deleted_at IS NULL

        UNION

        SELECT gs.student_id
        FROM group_students gs
        JOIN groups g ON g.id = gs.group_id
        JOIN courses c ON c.id = g.course_id
        JOIN "user" u ON u.id = gs.student_id
        WHERE c.teacher_id = ${teacherId}
          AND c.deleted_at IS NULL
          AND gs.joined_at >= date_trunc('month', now())
          AND u.deleted_at IS NULL
      ) s
    `);
    return Number(result.rows[0]?.count ?? 0);
  }

  /**
   * Sum of lesson attachment and homework file_size_bytes across all non-deleted courses owned by teacher.
   */
  async calculateUsedStorageBytes(teacherId: string): Promise<number> {
    const result = await db.execute<{ used_bytes: string | number }>(sql`
      SELECT (
        coalesce((
          SELECT sum(la.file_size_bytes)
          FROM lesson_attachments la
          JOIN lessons l ON l.id = la.lesson_id
          JOIN modules m ON m.id = l.module_id
          JOIN courses c ON c.id = m.course_id
          WHERE c.teacher_id = ${teacherId}
            AND c.deleted_at IS NULL
        ), 0)
        +
        coalesce((
          SELECT sum(h.file_size_bytes)
          FROM homework h
          JOIN lessons l ON l.id = h.lesson_id
          JOIN modules m ON m.id = l.module_id
          JOIN courses c ON c.id = m.course_id
          WHERE c.teacher_id = ${teacherId}
            AND c.deleted_at IS NULL
        ), 0)
      )::bigint AS used_bytes
    `);
    return Number(result.rows[0]?.used_bytes ?? 0);
  }

  /**
   * Count of active non-deleted groups owned by teacher.
   */
  async calculateActiveGroupCount(teacherId: string): Promise<number> {
    const result = await db.execute<{ count: number }>(sql`
      SELECT count(g.id)::int AS count
      FROM groups g
      JOIN courses c ON c.id = g.course_id
      WHERE c.teacher_id = ${teacherId}
        AND c.deleted_at IS NULL
        AND g.deleted_at IS NULL
        AND g.is_active = true
    `);
    return Number(result.rows[0]?.count ?? 0);
  }

  /**
   * Resolves active entitlements and limits for a teacher.
   */
  async getEntitlements(teacherId: string): Promise<TeacherEntitlementsResponse> {
    const [teacherUser] = await db
      .select({ country: users.country, referralCode: users.referralCode })
      .from(users)
      .where(eq(users.id, teacherId));

    const country: Country = (teacherUser?.country as Country) ?? 'OM';
    const currency: Currency = country === 'EG' ? 'EGP' : 'OMR';

    // A teacher gets a referral code only if they have at least one ADMIN_PAID subscription
    const [paidSub] = await db
      .select({ id: teacherSubscriptions.id })
      .from(teacherSubscriptions)
      .where(
        and(
          eq(teacherSubscriptions.teacherId, teacherId),
          eq(teacherSubscriptions.source, 'ADMIN_PAID'),
        ),
      )
      .limit(1);

    let referralCode: string | null = null;
    if (paidSub) {
      referralCode = await this.ensureTeacherReferralCode(teacherId);
    }

    const [activeStudentCount, usedStorageBytes, activeGroupCount, settings] = await Promise.all([
      this.calculateActiveStudentCount(teacherId),
      this.calculateUsedStorageBytes(teacherId),
      this.calculateActiveGroupCount(teacherId),
      this.notificationSettings.get(),
    ]);

    // Active subscription resolution: endsAt > now(), ordered by endsAt DESC, tierRank DESC
    const [activeSub] = await db
      .select()
      .from(teacherSubscriptions)
      .where(
        and(
          eq(teacherSubscriptions.teacherId, teacherId),
          gt(teacherSubscriptions.endsAt, sql`now()`),
        ),
      )
      .orderBy(
        desc(teacherSubscriptions.endsAt),
        desc(teacherSubscriptions.tierRank),
      )
      .limit(1);

    // Fallback live Free plan
    const [freePlan] = await db
      .select()
      .from(plans)
      .where(eq(plans.slug, 'free'))
      .limit(1);

    let activePlan: TeacherActivePlan;
    let isLockedOut = false;

    if (activeSub) {
      const isTrial =
        activeSub.billingCycle === 'TRIAL' ||
        activeSub.source.toUpperCase().includes('TRIAL');
      const status: TeacherEntitlementStatus = isTrial ? 'TRIAL' : 'ACTIVE';

      activePlan = {
        slug: activeSub.planSlug,
        nameAr: activeSub.planNameAr,
        nameEn: activeSub.planNameEn,
        tierRank: activeSub.tierRank,
        maxStudents: activeSub.maxStudents,
        maxStorageBytes: activeSub.maxStorageBytes != null ? Number(activeSub.maxStorageBytes) : null,
        maxGroups: activeSub.maxGroups,
        startsAt: activeSub.startsAt.toISOString(),
        endsAt: activeSub.endsAt ? activeSub.endsAt.toISOString() : null,
        source: activeSub.source,
        status,
        billingCycle: activeSub.billingCycle,
        pricePaid: activeSub.pricePaid,
        currency: activeSub.currency,
      };
      isLockedOut = false;
    } else {
      // Check if teacher had any previous subscription
      const [pastSub] = await db
        .select({ id: teacherSubscriptions.id })
        .from(teacherSubscriptions)
        .where(eq(teacherSubscriptions.teacherId, teacherId))
        .limit(1);

      const status: TeacherEntitlementStatus = pastSub ? 'EXPIRED' : 'FREE';

      const freeMaxStudents = freePlan?.maxStudents ?? 10;
      const freeMaxStorageBytes = freePlan?.maxStorageBytes != null ? Number(freePlan.maxStorageBytes) : 1073741824;
      const freeMaxGroups = freePlan?.maxGroups ?? null;

      activePlan = {
        slug: freePlan?.slug ?? 'free',
        nameAr: freePlan?.nameAr ?? 'الخطة المجانية',
        nameEn: freePlan?.nameEn ?? 'Free Plan',
        tierRank: freePlan?.tierRank ?? 0,
        maxStudents: freeMaxStudents,
        maxStorageBytes: freeMaxStorageBytes,
        maxGroups: freeMaxGroups,
        startsAt: null,
        endsAt: null,
        source: 'FREE',
        status,
      };

      const overStudents = freeMaxStudents != null && activeStudentCount > freeMaxStudents;
      const overStorage = freeMaxStorageBytes != null && usedStorageBytes > freeMaxStorageBytes;
      const overGroups = freeMaxGroups != null && activeGroupCount > freeMaxGroups;

      isLockedOut = overStudents || overStorage || overGroups;
    }

    const savedGiftsRows = await db
      .select()
      .from(teacherGifts)
      .where(eq(teacherGifts.teacherId, teacherId))
      .orderBy(desc(teacherGifts.createdAt));

    const savedGifts: SavedGift[] = savedGiftsRows.map((g) => ({
      id: g.id,
      planSlug: g.planSlug,
      planNameAr: g.planNameAr,
      planNameEn: g.planNameEn,
      tierRank: g.tierRank,
      durationDays: g.durationDays,
      source: g.source,
      createdAt: g.createdAt.toISOString(),
    }));

    const { upgradeOptions, customPlanPrompt } = await this.getUpgradeOptions(
      teacherId,
      activePlan.tierRank,
      currency,
    );

    const referralRows = await db
      .select({
        status: teacherReferrals.status,
        createdAt: teacherReferrals.createdAt,
        takerName: users.name,
      })
      .from(teacherReferrals)
      .innerJoin(users, eq(users.id, teacherReferrals.takerTeacherId))
      .where(eq(teacherReferrals.giverTeacherId, teacherId))
      .orderBy(desc(teacherReferrals.createdAt));

    const referral: ReferralSummary = {
      referralCode,
      usedCount: referralRows.length,
      maxReferrals: 10,
      referrals: referralRows.map((r) => ({
        takerName: r.takerName,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    };

    return {
      activePlan,
      usage: {
        activeStudentCount,
        usedStorageBytes,
        activeGroupCount,
      },
      country,
      currency,
      isLockedOut,
      supportWhatsapp: settings.supportWhatsapp ?? null,
      upgradeOptions,
      customPlanPrompt,
      savedGifts,
      referral,
    };
  }

  occasionForLimitCross(slug: string): string {
    return `LIMIT_CROSS_${slug.toUpperCase().replace(/-/g, '_')}`;
  }

  /**
   * Calculates available upgrade options for higher-tier public plans,
   * factoring in one-time First-Month Limit-Crossing Discount eligibility.
   */
  async getUpgradeOptions(
    teacherId: string,
    currentTierRank: number,
    currency: Currency,
  ): Promise<{ upgradeOptions: TeacherUpgradeOption[]; customPlanPrompt: string | null }> {
    const higherPlans = await db
      .select()
      .from(plans)
      .where(and(eq(plans.isPublic, true), gt(plans.tierRank, currentTierRank)))
      .orderBy(plans.displayOrder, plans.tierRank);

    const discounts = await db
      .select({ occasion: teacherDiscounts.occasion })
      .from(teacherDiscounts)
      .where(eq(teacherDiscounts.teacherId, teacherId));

    const claimedOccasions = new Set(discounts.map((d) => d.occasion));

    const upgradeOptions: TeacherUpgradeOption[] = higherPlans.map((p) => {
      const occasion = this.occasionForLimitCross(p.slug);
      const eligible = !claimedOccasions.has(occasion);
      const monthlyPrice = currency === 'EGP' ? p.monthlyPriceEgp : p.monthlyPriceOmr;
      const yearlyMonthlyPrice =
        currency === 'EGP' ? p.yearlyMonthlyPriceEgp : p.yearlyMonthlyPriceOmr;
      const firstMonthDiscountPrice = eligible ? yearlyMonthlyPrice : null;

      return {
        id: p.id,
        slug: p.slug,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        tierRank: p.tierRank,
        monthlyPrice,
        yearlyMonthlyPrice,
        currency,
        maxStudents: p.maxStudents,
        maxStorageBytes: p.maxStorageBytes != null ? Number(p.maxStorageBytes) : null,
        firstMonthDiscountPrice,
        firstMonthDiscountEligible: eligible,
      };
    });

    const customPlanPrompt =
      upgradeOptions.length === 0 ? 'Contact administration for a custom plan' : null;

    return { upgradeOptions, customPlanPrompt };
  }

  async throwPlanLimitReached(
    teacherId: string,
    limitType: PlanLimitType,
    currentUsage: number,
    limit: number,
    currentTierRank: number,
    currency: Currency,
  ): Promise<never> {
    const { upgradeOptions, customPlanPrompt } = await this.getUpgradeOptions(
      teacherId,
      currentTierRank,
      currency,
    );
    throw new HttpException(
      {
        error: 'PLAN_LIMIT_REACHED',
        limitType,
        currentUsage,
        limit,
        upgradeOptions,
        customPlanPrompt,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  async assertCanAddStudents(teacherId: string, candidatePhoneNumbers: string[]): Promise<void> {
    const entitlements = await this.getEntitlements(teacherId);
    const maxStudents = entitlements.activePlan.maxStudents;
    if (maxStudents === null) return;

    const currentUsage = entitlements.usage.activeStudentCount;
    const uniquePhones = Array.from(
      new Set(candidatePhoneNumbers.map((p) => p.trim()).filter(Boolean)),
    );
    if (uniquePhones.length === 0) return;

    const existingUsers = await db
      .select({ id: users.id, phoneNumber: users.phoneNumber })
      .from(users)
      .where(inArray(users.phoneNumber, uniquePhones));

    const activeStudentIdsResult = await db.execute<{ student_id: string }>(sql`
      SELECT DISTINCT s.student_id
      FROM (
        SELECT gs.student_id
        FROM group_students gs
        JOIN groups g ON g.id = gs.group_id
        JOIN courses c ON c.id = g.course_id
        JOIN "user" u ON u.id = gs.student_id
        WHERE c.teacher_id = ${teacherId}
          AND c.deleted_at IS NULL
          AND g.deleted_at IS NULL
          AND g.is_active = true
          AND u.deleted_at IS NULL

        UNION

        SELECT gs.student_id
        FROM group_students gs
        JOIN groups g ON g.id = gs.group_id
        JOIN courses c ON c.id = g.course_id
        JOIN "user" u ON u.id = gs.student_id
        WHERE c.teacher_id = ${teacherId}
          AND c.deleted_at IS NULL
          AND gs.joined_at >= date_trunc('month', now())
          AND u.deleted_at IS NULL
      ) s
    `);
    const activeStudentIds = new Set(activeStudentIdsResult.rows.map((r) => r.student_id));

    let newUniqueCount = 0;
    for (const phone of uniquePhones) {
      const user = existingUsers.find((u) => u.phoneNumber === phone);
      if (!user || !activeStudentIds.has(user.id)) {
        newUniqueCount++;
      }
    }

    if (currentUsage + newUniqueCount > maxStudents) {
      await this.throwPlanLimitReached(
        teacherId,
        'STUDENTS',
        currentUsage,
        maxStudents,
        entitlements.activePlan.tierRank,
        entitlements.currency,
      );
    }
  }

  async assertCanCreateEntryCode(teacherId: string, maxUses: number): Promise<void> {
    const entitlements = await this.getEntitlements(teacherId);
    const maxStudents = entitlements.activePlan.maxStudents;
    if (maxStudents === null) return;

    const currentUsage = entitlements.usage.activeStudentCount;
    if (currentUsage >= maxStudents || currentUsage + maxUses > maxStudents) {
      await this.throwPlanLimitReached(
        teacherId,
        'STUDENTS',
        currentUsage,
        maxStudents,
        entitlements.activePlan.tierRank,
        entitlements.currency,
      );
    }
  }

  async assertCanReactivateGroup(teacherId: string, groupId: string): Promise<void> {
    const entitlements = await this.getEntitlements(teacherId);
    const maxStudents = entitlements.activePlan.maxStudents;
    if (maxStudents === null) return;

    const currentUsage = entitlements.usage.activeStudentCount;

    const groupStudentsRows = await db
      .select({ studentId: groupStudents.studentId })
      .from(groupStudents)
      .where(eq(groupStudents.groupId, groupId));

    const candidateStudentIds = Array.from(new Set(groupStudentsRows.map((r) => r.studentId)));
    if (candidateStudentIds.length === 0) return;

    const activeStudentIdsResult = await db.execute<{ student_id: string }>(sql`
      SELECT DISTINCT s.student_id
      FROM (
        SELECT gs.student_id
        FROM group_students gs
        JOIN groups g ON g.id = gs.group_id
        JOIN courses c ON c.id = g.course_id
        JOIN "user" u ON u.id = gs.student_id
        WHERE c.teacher_id = ${teacherId}
          AND c.deleted_at IS NULL
          AND g.deleted_at IS NULL
          AND g.is_active = true
          AND u.deleted_at IS NULL

        UNION

        SELECT gs.student_id
        FROM group_students gs
        JOIN groups g ON g.id = gs.group_id
        JOIN courses c ON c.id = g.course_id
        JOIN "user" u ON u.id = gs.student_id
        WHERE c.teacher_id = ${teacherId}
          AND c.deleted_at IS NULL
          AND gs.joined_at >= date_trunc('month', now())
          AND u.deleted_at IS NULL
      ) s
    `);
    const activeStudentIds = new Set(activeStudentIdsResult.rows.map((r) => r.student_id));

    let reactivatedNewCount = 0;
    for (const sId of candidateStudentIds) {
      if (!activeStudentIds.has(sId)) {
        reactivatedNewCount++;
      }
    }

    if (currentUsage + reactivatedNewCount > maxStudents) {
      await this.throwPlanLimitReached(
        teacherId,
        'STUDENTS',
        currentUsage,
        maxStudents,
        entitlements.activePlan.tierRank,
        entitlements.currency,
      );
    }
  }

  async assertCanUploadStorage(teacherId: string, fileSizeBytes: number): Promise<void> {
    const entitlements = await this.getEntitlements(teacherId);
    const maxStorageBytes = entitlements.activePlan.maxStorageBytes;
    if (maxStorageBytes === null) return;

    const currentUsage = entitlements.usage.usedStorageBytes;
    if (currentUsage + fileSizeBytes > maxStorageBytes) {
      await this.throwPlanLimitReached(
        teacherId,
        'STORAGE',
        currentUsage,
        maxStorageBytes,
        entitlements.activePlan.tierRank,
        entitlements.currency,
      );
    }
  }

  /**
   * Redeems a promo code or referral code according to anti-stacking and 3-slot saved gifts inventory rules.
   */
  async redeemCode(teacherId: string, rawCode: string): Promise<RedeemCodeResponse> {
    const code = rawCode?.trim().toUpperCase();
    if (!code) {
      throw new BadRequestException('Code is required');
    }

    return await db.transaction(async (tx) => {
      // 1. Look up code in promo_codes
      const [promo] = await tx
        .select()
        .from(promoCodes)
        .where(eq(promoCodes.code, code))
        .limit(1);

      if (promo) {
        if (!promo.isActive) {
          throw new BadRequestException('Invalid or inactive promo code');
        }

        if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) {
          throw new BadRequestException('Promo code has expired');
        }

        if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
          throw new BadRequestException('Promo code has reached maximum uses');
        }

        // Check if teacher already redeemed this promo code
        const [alreadyRedeemed] = await tx
          .select({ id: teacherDiscounts.id })
          .from(teacherDiscounts)
          .where(
            and(
              eq(teacherDiscounts.teacherId, teacherId),
              eq(teacherDiscounts.occasion, 'PROMO_CODE'),
              eq(teacherDiscounts.referenceId, promo.id),
            ),
          )
          .limit(1);

        if (alreadyRedeemed) {
          throw new BadRequestException('You have already redeemed this promo code');
        }

        // Anti-stacking: Unpaid accounts limited to 1 promo/referral code total
        const [paidSub] = await tx
          .select({ id: teacherSubscriptions.id })
          .from(teacherSubscriptions)
          .where(
            and(
              eq(teacherSubscriptions.teacherId, teacherId),
              eq(teacherSubscriptions.source, 'ADMIN_PAID'),
            ),
          )
          .limit(1);

        if (!paidSub) {
          const [unpaidCountRes] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(teacherDiscounts)
            .where(
              and(
                eq(teacherDiscounts.teacherId, teacherId),
                inArray(teacherDiscounts.occasion, ['PROMO_CODE', 'REFERRAL_TAKER']),
              ),
            );
          if (Number(unpaidCountRes?.count ?? 0) >= 1) {
            throw new BadRequestException(
              'Unpaid accounts are limited to redeeming 1 promo or referral code total',
            );
          }
        }

        // Target plan lookup
        const [targetPlan] = await tx
          .select()
          .from(plans)
          .where(eq(plans.id, promo.planId))
          .limit(1);

        if (!targetPlan) {
          throw new BadRequestException('Target plan for promo code not found');
        }

        // Teacher country & currency
        const [teacherUser] = await tx
          .select({ country: users.country })
          .from(users)
          .where(eq(users.id, teacherId));
        const country: Country = (teacherUser?.country as Country) ?? 'OM';
        const currency: Currency = country === 'EG' ? 'EGP' : 'OMR';

        // Active subscription resolution
        const [activeSub] = await tx
          .select()
          .from(teacherSubscriptions)
          .where(
            and(
              eq(teacherSubscriptions.teacherId, teacherId),
              gt(teacherSubscriptions.endsAt, sql`now()`),
            ),
          )
          .orderBy(
            desc(teacherSubscriptions.endsAt),
            desc(teacherSubscriptions.tierRank),
          )
          .limit(1);

        let action: 'ACTIVATED' | 'EXTENDED' | 'SAVED';

        if (!activeSub) {
          // Teacher is on Free / expired -> activate immediately
          action = 'ACTIVATED';
          const now = new Date();
          const endsAt = new Date(now.getTime() + promo.durationDays * 24 * 60 * 60 * 1000);

          await tx.insert(teacherSubscriptions).values({
            teacherId,
            planId: targetPlan.id,
            planSlug: targetPlan.slug,
            tierRank: targetPlan.tierRank,
            planNameAr: targetPlan.nameAr,
            planNameEn: targetPlan.nameEn,
            pricePaid: 0,
            currency,
            billingCycle: 'GIFT',
            maxStudents: targetPlan.maxStudents,
            maxStorageBytes: targetPlan.maxStorageBytes,
            maxGroups: targetPlan.maxGroups,
            startsAt: now,
            endsAt,
            source: 'PROMO',
            giftsAppliedInCycle: 1,
          });
        } else if (activeSub.planSlug === targetPlan.slug) {
          // Teacher is on the SAME active plan -> extend endsAt (enforce 1-gift-per-cycle on paid plan)
          if (activeSub.source === 'ADMIN_PAID' && activeSub.giftsAppliedInCycle >= 1) {
            throw new BadRequestException('You can only apply 1 gift per paid billing cycle');
          }

          action = 'EXTENDED';
          const baseEndsAt = activeSub.endsAt ? new Date(activeSub.endsAt).getTime() : Date.now();
          const newEndsAt = new Date(baseEndsAt + promo.durationDays * 24 * 60 * 60 * 1000);

          await tx
            .update(teacherSubscriptions)
            .set({
              endsAt: newEndsAt,
              giftsAppliedInCycle: activeSub.giftsAppliedInCycle + 1,
            })
            .where(eq(teacherSubscriptions.id, activeSub.id));
        } else {
          // Teacher is on a DIFFERENT active plan -> store in teacher_gifts (max 3 slots)
          const [savedCountRes] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(teacherGifts)
            .where(eq(teacherGifts.teacherId, teacherId));
          const savedCount = Number(savedCountRes?.count ?? 0);

          if (savedCount >= 3) {
            throw new BadRequestException('Maximum of 3 saved gifts reached');
          }

          action = 'SAVED';
          await tx.insert(teacherGifts).values({
            teacherId,
            planId: targetPlan.id,
            planSlug: targetPlan.slug,
            tierRank: targetPlan.tierRank,
            planNameAr: targetPlan.nameAr,
            planNameEn: targetPlan.nameEn,
            durationDays: promo.durationDays,
            source: 'PROMO',
            sourceRef: promo.id,
          });
        }

        // Increment promo used count
        await tx
          .update(promoCodes)
          .set({
            usedCount: promo.usedCount + 1,
          })
          .where(eq(promoCodes.id, promo.id));

        // Record in teacher_discounts
        await tx.insert(teacherDiscounts).values({
          teacherId,
          occasion: 'PROMO_CODE',
          planSlug: targetPlan.slug,
          referenceId: promo.id,
          description: `Redeemed promo code ${promo.code}`,
        });

        return {
          success: true,
          action,
          message:
            action === 'ACTIVATED'
              ? 'Promo code activated successfully'
              : action === 'EXTENDED'
                ? 'Current plan extended successfully'
                : 'Gift saved to your inventory',
          planNameAr: targetPlan.nameAr,
          planNameEn: targetPlan.nameEn,
          durationDays: promo.durationDays,
        };
      }

      // 2. Check if code matches a user's referral code
      const [giverUser] = await tx
        .select()
        .from(users)
        .where(eq(users.referralCode, code))
        .limit(1);

      if (!giverUser) {
        throw new BadRequestException('Invalid or inactive promo or referral code');
      }

      // Giver must be a paid teacher (has at least one ADMIN_PAID subscription)
      const [giverPaidSub] = await tx
        .select({ id: teacherSubscriptions.id })
        .from(teacherSubscriptions)
        .where(
          and(
            eq(teacherSubscriptions.teacherId, giverUser.id),
            eq(teacherSubscriptions.source, 'ADMIN_PAID'),
          ),
        )
        .limit(1);

      if (!giverPaidSub) {
        throw new BadRequestException('The referring teacher must have a paid subscription');
      }

      // Taker cannot redeem their own referral code
      if (giverUser.id === teacherId) {
        throw new BadRequestException('You cannot redeem your own referral code');
      }

      // Taker can only redeem AT MOST ONE referral code in their lifetime
      const [alreadyReferred] = await tx
        .select({ id: teacherReferrals.id })
        .from(teacherReferrals)
        .where(eq(teacherReferrals.takerTeacherId, teacherId))
        .limit(1);

      if (alreadyReferred) {
        throw new BadRequestException('You can only redeem one referral code in your lifetime');
      }

      // Prevent reciprocal referrals (A -> B and B -> A)
      const [reciprocal] = await tx
        .select({ id: teacherReferrals.id })
        .from(teacherReferrals)
        .where(
          and(
            eq(teacherReferrals.giverTeacherId, teacherId),
            eq(teacherReferrals.takerTeacherId, giverUser.id),
          ),
        )
        .limit(1);

      if (reciprocal) {
        throw new BadRequestException('Reciprocal referrals are not allowed');
      }

      // Giver can refer at most 10 teachers total
      const [giverCountRes] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(teacherReferrals)
        .where(eq(teacherReferrals.giverTeacherId, giverUser.id));

      if (Number(giverCountRes?.count ?? 0) >= 10) {
        throw new BadRequestException('This referral code has reached its maximum limit of 10 referrals');
      }

      // Anti-stacking: Unpaid accounts limited to 1 promo or referral code total
      const [takerPaidSub] = await tx
        .select({ id: teacherSubscriptions.id })
        .from(teacherSubscriptions)
        .where(
          and(
            eq(teacherSubscriptions.teacherId, teacherId),
            eq(teacherSubscriptions.source, 'ADMIN_PAID'),
          ),
        )
        .limit(1);

      if (!takerPaidSub) {
        const [unpaidCountRes] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(teacherDiscounts)
          .where(
            and(
              eq(teacherDiscounts.teacherId, teacherId),
              inArray(teacherDiscounts.occasion, ['PROMO_CODE', 'REFERRAL_TAKER']),
            ),
          );
        if (Number(unpaidCountRes?.count ?? 0) >= 1) {
          throw new BadRequestException(
            'Unpaid accounts are limited to redeeming 1 promo or referral code total',
          );
        }
      }

      // Referral reward configuration
      const settings = await this.notificationSettings.get();
      const planSlug = settings.referralPlanSlug || 'early-bird';
      const durationDays = settings.referralGiftDays || 7;

      const [targetPlan] = await tx
        .select()
        .from(plans)
        .where(eq(plans.slug, planSlug))
        .limit(1);

      if (!targetPlan) {
        throw new BadRequestException('Referral gift plan not found');
      }

      // Teacher country & currency
      const [takerUser] = await tx
        .select({ country: users.country })
        .from(users)
        .where(eq(users.id, teacherId));
      const country: Country = (takerUser?.country as Country) ?? 'OM';
      const currency: Currency = country === 'EG' ? 'EGP' : 'OMR';

      // Active subscription resolution for taker
      const [activeSub] = await tx
        .select()
        .from(teacherSubscriptions)
        .where(
          and(
            eq(teacherSubscriptions.teacherId, teacherId),
            gt(teacherSubscriptions.endsAt, sql`now()`),
          ),
        )
        .orderBy(
          desc(teacherSubscriptions.endsAt),
          desc(teacherSubscriptions.tierRank),
        )
        .limit(1);

      let action: 'ACTIVATED' | 'EXTENDED' | 'SAVED';

      if (!activeSub) {
        // Teacher is on Free / expired -> activate immediately
        action = 'ACTIVATED';
        const now = new Date();
        const endsAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

        await tx.insert(teacherSubscriptions).values({
          teacherId,
          planId: targetPlan.id,
          planSlug: targetPlan.slug,
          tierRank: targetPlan.tierRank,
          planNameAr: targetPlan.nameAr,
          planNameEn: targetPlan.nameEn,
          pricePaid: 0,
          currency,
          billingCycle: 'GIFT',
          maxStudents: targetPlan.maxStudents,
          maxStorageBytes: targetPlan.maxStorageBytes,
          maxGroups: targetPlan.maxGroups,
          startsAt: now,
          endsAt,
          source: 'REFERRAL',
          giftsAppliedInCycle: 1,
        });
      } else if (activeSub.planSlug === targetPlan.slug) {
        // Teacher is on the SAME active plan -> extend endsAt
        if (activeSub.source === 'ADMIN_PAID' && activeSub.giftsAppliedInCycle >= 1) {
          throw new BadRequestException('You can only apply 1 gift per paid billing cycle');
        }

        action = 'EXTENDED';
        const baseEndsAt = activeSub.endsAt ? new Date(activeSub.endsAt).getTime() : Date.now();
        const newEndsAt = new Date(baseEndsAt + durationDays * 24 * 60 * 60 * 1000);

        await tx
          .update(teacherSubscriptions)
          .set({
            endsAt: newEndsAt,
            giftsAppliedInCycle: activeSub.giftsAppliedInCycle + 1,
          })
          .where(eq(teacherSubscriptions.id, activeSub.id));
      } else {
        // Teacher is on a DIFFERENT active plan -> store in teacher_gifts (max 3 slots)
        const [savedCountRes] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(teacherGifts)
          .where(eq(teacherGifts.teacherId, teacherId));
        const savedCount = Number(savedCountRes?.count ?? 0);

        if (savedCount >= 3) {
          throw new BadRequestException('Maximum of 3 saved gifts reached');
        }

        action = 'SAVED';
        await tx.insert(teacherGifts).values({
          teacherId,
          planId: targetPlan.id,
          planSlug: targetPlan.slug,
          tierRank: targetPlan.tierRank,
          planNameAr: targetPlan.nameAr,
          planNameEn: targetPlan.nameEn,
          durationDays,
          source: 'REFERRAL_TAKER',
        });
      }

      // Create teacher_referrals entry with status 'PENDING_GROUP'
      const [newReferral] = await tx
        .insert(teacherReferrals)
        .values({
          giverTeacherId: giverUser.id,
          takerTeacherId: teacherId,
          referralCode: code,
          status: 'PENDING_GROUP',
        })
        .returning();

      // Record in teacher_discounts
      await tx.insert(teacherDiscounts).values({
        teacherId,
        occasion: 'REFERRAL_TAKER',
        planSlug: targetPlan.slug,
        referenceId: newReferral.id,
        description: `Redeemed referral code ${code} from ${giverUser.name}`,
      });

      return {
        success: true,
        action,
        message:
          action === 'ACTIVATED'
            ? 'Referral code redeemed successfully'
            : action === 'EXTENDED'
              ? 'Current plan extended successfully'
              : 'Gift saved to your inventory',
        planNameAr: targetPlan.nameAr,
        planNameEn: targetPlan.nameEn,
        durationDays,
      };
    });
  }

  /**
   * Activates a saved gift from teacher_gifts inventory.
   */
  async activateSavedGift(teacherId: string, giftId: string): Promise<ActivateGiftResponse> {
    return await db.transaction(async (tx) => {
      const [gift] = await tx
        .select()
        .from(teacherGifts)
        .where(
          and(
            eq(teacherGifts.id, giftId),
            eq(teacherGifts.teacherId, teacherId),
          ),
        )
        .limit(1);

      if (!gift) {
        throw new NotFoundException('Saved gift not found');
      }

      const [activeSub] = await tx
        .select()
        .from(teacherSubscriptions)
        .where(
          and(
            eq(teacherSubscriptions.teacherId, teacherId),
            gt(teacherSubscriptions.endsAt, sql`now()`),
          ),
        )
        .orderBy(
          desc(teacherSubscriptions.endsAt),
          desc(teacherSubscriptions.tierRank),
        )
        .limit(1);

      if (activeSub) {
        // If teacher is already on a higher tier, block activation
        if (activeSub.tierRank > gift.tierRank) {
          throw new BadRequestException('You are already on a higher plan');
        }

        // If on paid plan, enforce 1 gift per cycle
        if (activeSub.source === 'ADMIN_PAID' && activeSub.giftsAppliedInCycle >= 1) {
          throw new BadRequestException('You can only apply 1 gift per paid billing cycle');
        }

        if (activeSub.planSlug === gift.planSlug) {
          // Same plan: extend
          const baseEndsAt = activeSub.endsAt ? new Date(activeSub.endsAt).getTime() : Date.now();
          const newEndsAt = new Date(baseEndsAt + gift.durationDays * 24 * 60 * 60 * 1000);

          await tx
            .update(teacherSubscriptions)
            .set({
              endsAt: newEndsAt,
              giftsAppliedInCycle: activeSub.giftsAppliedInCycle + 1,
            })
            .where(eq(teacherSubscriptions.id, activeSub.id));
        } else {
          // Switch to higher tier plan from lower tier
          const [targetPlan] = await tx
            .select()
            .from(plans)
            .where(eq(plans.id, gift.planId))
            .limit(1);

          if (!targetPlan) {
            throw new BadRequestException('Target plan not found');
          }

          const [teacherUser] = await tx
            .select({ country: users.country })
            .from(users)
            .where(eq(users.id, teacherId));
          const country: Country = (teacherUser?.country as Country) ?? 'OM';
          const currency: Currency = country === 'EG' ? 'EGP' : 'OMR';

          const now = new Date();
          const endsAt = new Date(now.getTime() + gift.durationDays * 24 * 60 * 60 * 1000);

          await tx.insert(teacherSubscriptions).values({
            teacherId,
            planId: targetPlan.id,
            planSlug: targetPlan.slug,
            tierRank: targetPlan.tierRank,
            planNameAr: targetPlan.nameAr,
            planNameEn: targetPlan.nameEn,
            pricePaid: 0,
            currency,
            billingCycle: 'GIFT',
            maxStudents: targetPlan.maxStudents,
            maxStorageBytes: targetPlan.maxStorageBytes,
            maxGroups: targetPlan.maxGroups,
            startsAt: now,
            endsAt,
            source: gift.source,
            giftsAppliedInCycle: 1,
          });
        }
      } else {
        // Teacher on Free / expired -> activate immediately
        const [targetPlan] = await tx
          .select()
          .from(plans)
          .where(eq(plans.id, gift.planId))
          .limit(1);

        if (!targetPlan) {
          throw new BadRequestException('Target plan not found');
        }

        const [teacherUser] = await tx
          .select({ country: users.country })
          .from(users)
          .where(eq(users.id, teacherId));
        const country: Country = (teacherUser?.country as Country) ?? 'OM';
        const currency: Currency = country === 'EG' ? 'EGP' : 'OMR';

        const now = new Date();
        const endsAt = new Date(now.getTime() + gift.durationDays * 24 * 60 * 60 * 1000);

        await tx.insert(teacherSubscriptions).values({
          teacherId,
          planId: targetPlan.id,
          planSlug: targetPlan.slug,
          tierRank: targetPlan.tierRank,
          planNameAr: targetPlan.nameAr,
          planNameEn: targetPlan.nameEn,
          pricePaid: 0,
          currency,
          billingCycle: 'GIFT',
          maxStudents: targetPlan.maxStudents,
          maxStorageBytes: targetPlan.maxStorageBytes,
          maxGroups: targetPlan.maxGroups,
          startsAt: now,
          endsAt,
          source: gift.source,
          giftsAppliedInCycle: 1,
        });
      }

      // Delete from teacher_gifts
      await tx.delete(teacherGifts).where(eq(teacherGifts.id, gift.id));

      return {
        success: true,
        message: 'Gift activated successfully',
        planNameAr: gift.planNameAr,
        planNameEn: gift.planNameEn,
      };
    });
  }

  /**
   * Deletes a saved gift from inventory to free a slot.
   */
  async deleteSavedGift(teacherId: string, giftId: string): Promise<DeleteGiftResponse> {
    const [gift] = await db
      .select({ id: teacherGifts.id })
      .from(teacherGifts)
      .where(
        and(
          eq(teacherGifts.id, giftId),
          eq(teacherGifts.teacherId, teacherId),
        ),
      )
      .limit(1);

    if (!gift) {
      throw new NotFoundException('Saved gift not found');
    }

    await db.delete(teacherGifts).where(eq(teacherGifts.id, gift.id));

    return { success: true };
  }

  /**
   * 4-Student Group Unlock Hook:
   * When a referred teacher (status == 'PENDING_GROUP') creates/has at least one
   * active group with >= 4 enrolled students, automatically unlock the giver's referral reward.
   */
  async checkAndUnlockReferralReward(takerTeacherId: string, txOrDb: any = db): Promise<void> {
    const [pendingReferral] = await txOrDb
      .select()
      .from(teacherReferrals)
      .where(
        and(
          eq(teacherReferrals.takerTeacherId, takerTeacherId),
          eq(teacherReferrals.status, 'PENDING_GROUP'),
        ),
      )
      .limit(1);

    if (!pendingReferral) return;

    // Check if the taker teacher now has at least one active group with >= 4 enrolled students
    const groupWith4Result = await (txOrDb as typeof db).execute<{ group_id: string }>(sql`
      SELECT g.id AS group_id
      FROM groups g
      JOIN courses c ON c.id = g.course_id
      JOIN group_students gs ON gs.group_id = g.id
      JOIN "user" u ON u.id = gs.student_id
      WHERE c.teacher_id = ${takerTeacherId}
        AND c.deleted_at IS NULL
        AND g.deleted_at IS NULL
        AND g.is_active = true
        AND u.deleted_at IS NULL
      GROUP BY g.id
      HAVING count(DISTINCT gs.student_id)::int >= 4
      LIMIT 1
    `);

    if (groupWith4Result.rows.length === 0) return;

    // Condition met! Unlock reward for giverTeacherId
    const giverId = pendingReferral.giverTeacherId;
    const settings = await this.notificationSettings.get();
    const planSlug = settings.referralPlanSlug || 'early-bird';
    const durationDays = settings.referralGiftDays || 7;

    const [targetPlan] = await txOrDb
      .select()
      .from(plans)
      .where(eq(plans.slug, planSlug))
      .limit(1);

    if (!targetPlan) return;

    const [giverUser] = await txOrDb
      .select({ country: users.country, name: users.name })
      .from(users)
      .where(eq(users.id, giverId));
    const country: Country = (giverUser?.country as Country) ?? 'OM';
    const currency: Currency = country === 'EG' ? 'EGP' : 'OMR';

    // Active subscription resolution for giver
    const [activeSub] = await txOrDb
      .select()
      .from(teacherSubscriptions)
      .where(
        and(
          eq(teacherSubscriptions.teacherId, giverId),
          gt(teacherSubscriptions.endsAt, sql`now()`),
        ),
      )
      .orderBy(
        desc(teacherSubscriptions.endsAt),
        desc(teacherSubscriptions.tierRank),
      )
      .limit(1);

    const now = new Date();

    if (!activeSub) {
      // Giver on Free or expired -> activate immediately
      const endsAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      await txOrDb.insert(teacherSubscriptions).values({
        teacherId: giverId,
        planId: targetPlan.id,
        planSlug: targetPlan.slug,
        tierRank: targetPlan.tierRank,
        planNameAr: targetPlan.nameAr,
        planNameEn: targetPlan.nameEn,
        pricePaid: 0,
        currency,
        billingCycle: 'GIFT',
        maxStudents: targetPlan.maxStudents,
        maxStorageBytes: targetPlan.maxStorageBytes,
        maxGroups: targetPlan.maxGroups,
        startsAt: now,
        endsAt,
        source: 'REFERRAL',
        giftsAppliedInCycle: 1,
      });

      await txOrDb.insert(teacherDiscounts).values({
        teacherId: giverId,
        occasion: 'REFERRAL_GIVER',
        planSlug: targetPlan.slug,
        referenceId: pendingReferral.id,
        description: 'Referral reward for referred teacher reaching 4 students in a group',
      });

      await txOrDb
        .update(teacherReferrals)
        .set({ status: 'REWARDED', rewardedAt: now })
        .where(eq(teacherReferrals.id, pendingReferral.id));
    } else if (
      activeSub.planSlug === targetPlan.slug &&
      (activeSub.source !== 'ADMIN_PAID' || activeSub.giftsAppliedInCycle < 1)
    ) {
      // Same plan and eligible to extend
      const baseEndsAt = activeSub.endsAt ? new Date(activeSub.endsAt).getTime() : now.getTime();
      const newEndsAt = new Date(baseEndsAt + durationDays * 24 * 60 * 60 * 1000);

      await txOrDb
        .update(teacherSubscriptions)
        .set({
          endsAt: newEndsAt,
          giftsAppliedInCycle: activeSub.giftsAppliedInCycle + 1,
        })
        .where(eq(teacherSubscriptions.id, activeSub.id));

      await txOrDb.insert(teacherDiscounts).values({
        teacherId: giverId,
        occasion: 'REFERRAL_GIVER',
        planSlug: targetPlan.slug,
        referenceId: pendingReferral.id,
        description: 'Referral reward extension for referred teacher reaching 4 students',
      });

      await txOrDb
        .update(teacherReferrals)
        .set({ status: 'REWARDED', rewardedAt: now })
        .where(eq(teacherReferrals.id, pendingReferral.id));
    } else {
      // Different plan or cycle limit reached: try to store in teacher_gifts
      const [savedCountRes] = await txOrDb
        .select({ count: sql<number>`count(*)::int` })
        .from(teacherGifts)
        .where(eq(teacherGifts.teacherId, giverId));
      const savedCount = Number(savedCountRes?.count ?? 0);

      if (savedCount < 3) {
        await txOrDb.insert(teacherGifts).values({
          teacherId: giverId,
          planId: targetPlan.id,
          planSlug: targetPlan.slug,
          tierRank: targetPlan.tierRank,
          planNameAr: targetPlan.nameAr,
          planNameEn: targetPlan.nameEn,
          durationDays,
          source: 'REFERRAL_GIVER',
          sourceRef: pendingReferral.id,
        });

        await txOrDb.insert(teacherDiscounts).values({
          teacherId: giverId,
          occasion: 'REFERRAL_GIVER',
          planSlug: targetPlan.slug,
          referenceId: pendingReferral.id,
          description: 'Referral reward saved gift for referred teacher reaching 4 students',
        });

        await txOrDb
          .update(teacherReferrals)
          .set({ status: 'REWARDED', rewardedAt: now })
          .where(eq(teacherReferrals.id, pendingReferral.id));
      } else {
        // Inventory full: mark DROPPED_FULL_INVENTORY
        await txOrDb
          .update(teacherReferrals)
          .set({ status: 'DROPPED_FULL_INVENTORY', rewardedAt: now })
          .where(eq(teacherReferrals.id, pendingReferral.id));
      }
    }
  }
}

export async function checkAndUnlockReferralReward(takerTeacherId: string, txOrDb: any = db): Promise<void> {
  const service = new TeacherEntitlementsService(new NotificationSettingsService());
  return service.checkAndUnlockReferralReward(takerTeacherId, txOrDb);
}
