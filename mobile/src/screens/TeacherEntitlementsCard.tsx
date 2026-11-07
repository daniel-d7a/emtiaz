import { useState } from 'react';
import { View, Linking, TextInput, Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { teacherApi } from '../api';
import { Btn, Card, Loading, MiniBtn, Text, c } from '../ui';
import { InfoHint } from '../components/InfoHint';
import type { MeResponse } from '../../../shared/api';

export default function TeacherEntitlementsCard({ me }: { me: MeResponse }) {
  const qc = useQueryClient();
  const [promoCode, setPromoCode] = useState('');
  const { data: entitlements, isLoading } = useQuery({
    queryKey: ['teacher-entitlements'],
    queryFn: () => teacherApi.getEntitlements(),
  });

  const redeemMutation = useMutation({
    mutationFn: (code: string) => teacherApi.redeemCode(code),
    onSuccess: (res) => {
      Alert.alert('نجاح', res.message);
      setPromoCode('');
      qc.invalidateQueries({ queryKey: ['teacher-entitlements'] });
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err.message || 'تعذر استرداد الكود');
    },
  });

  const activateMutation = useMutation({
    mutationFn: (giftId: string) => teacherApi.activateSavedGift(giftId),
    onSuccess: (res) => {
      Alert.alert('نجاح', res.message);
      qc.invalidateQueries({ queryKey: ['teacher-entitlements'] });
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err.message || 'تعذر تفعيل الهدية');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (giftId: string) => teacherApi.deleteSavedGift(giftId),
    onSuccess: () => {
      Alert.alert('نجاح', 'تم حذف الهدية المحفوظة');
      qc.invalidateQueries({ queryKey: ['teacher-entitlements'] });
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err.message || 'تعذر حذف الهدية');
    },
  });

  if (isLoading) return <Card><Loading /></Card>;
  if (!entitlements) return null;

  const { activePlan, usage, currency, supportWhatsapp, savedGifts = [], referral } = entitlements;
  const statusLabels: Record<string, string> = {
    ACTIVE: 'نشط',
    TRIAL: 'تجريبي',
    FREE: 'مجاني',
    EXPIRED: 'منتهي الصلاحية',
  };
  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    ACTIVE: { bg: c.primaryLight, text: c.primary, border: c.primary },
    TRIAL: { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' },
    FREE: { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' },
    EXPIRED: { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' },
  };
  const badgeStyle = statusColors[activePlan.status] ?? statusColors.FREE;

  const studentPct = activePlan.maxStudents
    ? Math.min(100, Math.round((usage.activeStudentCount / activePlan.maxStudents) * 100))
    : 0;

  const formatStorage = (bytes: number | null) => {
    if (bytes == null) return 'غير محدود';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const storagePct = activePlan.maxStorageBytes
    ? Math.min(100, Math.round((usage.usedStorageBytes / activePlan.maxStorageBytes) * 100))
    : 0;

  const cleanPhone = (supportWhatsapp ?? '').replace(/\D/g, '');
  const msg = `مرحبًا امتياز، أود ترقية خطتي كمعلم.\nالاسم: ${me.user.name}\nالهاتف: ${me.user.phoneNumber ?? me.user.email}\nالخطة الحالية: ${activePlan.nameAr}\nالعملة: ${currency}`;
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}` : null;

  const expiryText = activePlan.endsAt
    ? `ينتهي في: ${new Date(activePlan.endsAt).toLocaleDateString('ar-OM')}`
    : 'لا تنتهي';

  return (
    <Card>
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: c.ink }}>
            الاشتراك والخطط
          </Text>
          <InfoHint
            title="الخطط والسعة والهدايا المحفوظة"
            steps={[
              {
                title: '١. الطلاب النشطون وسعة التخزين',
                body: 'يُحتسب عدد الطلاب الفريدين المسجلين في مجموعاتك النشطة، بالإضافة إلى حجم الملفات والصور المرفوعة في دروسك.',
              },
              {
                title: '٢. مخزون الهدايا المحفوظة (٣ خانات)',
                body: 'عند كسب أيام مجانية من الإحالات أو أكواد الهدايا، يمكنك حفظ ما يصل إلى ٣ هدايا في مخزونك لتفعيلها في الوقت المناسب.',
              },
              {
                title: '٣. الترقية وتفعيل الهدايا',
                body: 'تفعيل هدية من نفس مستوى خطتك يمدد صلاحيتها، كما يمكنك الترقية في أي وقت عبر واتساب بضغطة واحدة.',
              },
            ]}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Text style={{ fontSize: 14, color: c.inkSoft }}>الخطة الحالية:</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.ink }}>{activePlan.nameAr}</Text>
          <View
            style={{
              backgroundColor: badgeStyle.bg,
              borderColor: badgeStyle.border,
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: badgeStyle.text }}>
              {statusLabels[activePlan.status] ?? activePlan.status}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 12, color: c.inkSoft, marginTop: 4 }}>{expiryText}</Text>
      </View>

      <View style={{ gap: 12, marginBottom: 16 }}>
        {/* Active Students Progress */}
        <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: c.line }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: c.inkSoft }}>الطلاب النشطون</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: c.ink }}>
              {usage.activeStudentCount} / {activePlan.maxStudents ?? 'غير محدود'}
            </Text>
          </View>
          <View style={{ height: 8, backgroundColor: c.line, borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ height: 8, backgroundColor: c.primary, width: `${studentPct}%`, borderRadius: 4 }} />
          </View>
        </View>

        {/* Lesson Storage Progress */}
        <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: c.line }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: c.inkSoft }}>سعة تخزين الدروس</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: c.ink }}>
              {formatStorage(usage.usedStorageBytes)} / {formatStorage(activePlan.maxStorageBytes)}
            </Text>
          </View>
          <View style={{ height: 8, backgroundColor: c.line, borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ height: 8, backgroundColor: c.primary, width: `${storagePct}%`, borderRadius: 4 }} />
          </View>
        </View>
      </View>

      {whatsappUrl && (
        <Btn
          label="ترقية الخطة عبر واتساب"
          onPress={() => Linking.openURL(whatsappUrl)}
        />
      )}

      {/* Redeem Promo or Referral Code */}
      <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.line }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: c.ink, marginBottom: 8 }}>
          استرداد كود الخصم أو الإحالة
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            style={{
              flex: 1,
              height: 40,
              borderWidth: 1,
              borderColor: c.line,
              borderRadius: 10,
              paddingHorizontal: 12,
              backgroundColor: '#FFFFFF',
              fontSize: 13,
              fontWeight: '600',
              textAlign: 'center',
            }}
            placeholder="أدخل الكود هنا"
            placeholderTextColor={c.inkSoft}
            value={promoCode}
            onChangeText={(t) => setPromoCode(t.toUpperCase())}
            autoCapitalize="characters"
            editable={!redeemMutation.isPending}
          />
          <MiniBtn
            label={redeemMutation.isPending ? '...' : 'استرداد'}
            tone="primary"
            disabled={!promoCode.trim() || redeemMutation.isPending}
            onPress={() => redeemMutation.mutate(promoCode.trim())}
          />
        </View>
      </View>

      {/* Saved Gifts Inventory (0-3 slots) */}
      <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.line }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.ink }}>
            الهدايا المحفوظة
          </Text>
          <Text style={{ fontSize: 12, color: c.inkSoft, fontWeight: '600' }}>
            {savedGifts.length} من 3 هدايا
          </Text>
        </View>

        {savedGifts.length === 0 ? (
          <Text style={{ fontSize: 12, color: c.inkSoft, marginVertical: 6 }}>
            لا توجد هدايا محفوظة
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {savedGifts.map((gift) => {
              const isLowerTier = activePlan.tierRank > gift.tierRank;
              return (
                <View
                  key={gift.id}
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: c.line,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View
                        style={{
                          backgroundColor: '#FEF3C7',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#D97706' }}>
                          +{gift.durationDays} يوم
                        </Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: c.ink }}>
                        {gift.planNameAr}
                      </Text>
                    </View>
                    {isLowerTier && (
                      <Text style={{ fontSize: 11, color: c.danger, marginTop: 4 }}>
                        أنت بالفعل على خطة أعلى
                      </Text>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <MiniBtn
                      label="تفعيل"
                      tone="primary"
                      disabled={isLowerTier || activateMutation.isPending}
                      onPress={() => activateMutation.mutate(gift.id)}
                    />
                    <MiniBtn
                      label="حذف"
                      tone="danger"
                      disabled={deleteMutation.isPending}
                      onPress={() => deleteMutation.mutate(gift.id)}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Teacher Referral Program Card */}
      <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.line }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.ink }}>
            برنامج إحالة المعلمين
          </Text>
          {referral?.referralCode && (
            <Text style={{ fontSize: 12, color: c.inkSoft, fontWeight: '600' }}>
              الإحالات: {referral.usedCount} / {referral.maxReferrals}
            </Text>
          )}
        </View>

        {referral?.referralCode ? (
          <View style={{ gap: 12 }}>
            <View
              style={{
                backgroundColor: c.primaryLight,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.primary,
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 12, color: c.inkSoft, fontWeight: '600' }}>
                كود الإحالة الخاص بك
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: c.primary, letterSpacing: 2 }}>
                {referral.referralCode}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <MiniBtn
                  label="نسخ الكود"
                  tone="ghost"
                  onPress={() => {
                    Alert.alert('تم النسخ', `تم نسخ الكود: ${referral.referralCode}`);
                  }}
                />
                <MiniBtn
                  label="مشاركة عبر واتساب"
                  tone="primary"
                  onPress={() => {
                    const shareMsg = `انضم إلى منصة امتياز للمعلمين واستخدم كود الإحالة الخاص بي للحصول على 7 أيام مجانية:\n${referral.referralCode}\nhttps://emtiaz.om`;
                    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(shareMsg)}`);
                  }}
                />
              </View>
            </View>

            {/* Progress Bar */}
            <View style={{ height: 8, backgroundColor: c.line, borderRadius: 4, overflow: 'hidden' }}>
              <View
                style={{
                  height: 8,
                  backgroundColor: c.primary,
                  width: `${Math.min(100, (referral.usedCount / referral.maxReferrals) * 100)}%`,
                  borderRadius: 4,
                }}
              />
            </View>

            {/* Referrals list */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.ink, marginBottom: 6 }}>
                سجل الإحالات
              </Text>
              {referral.referrals.length === 0 ? (
                <Text style={{ fontSize: 12, color: c.inkSoft }}>
                  لم تقم بإحالة أي معلم بعد. شارك كودك وابدأ في كسب الأيام المجانية!
                </Text>
              ) : (
                <View style={{ gap: 6 }}>
                  {referral.referrals.map((r, i) => {
                    const isRewarded = r.status === 'REWARDED';
                    const isDropped = r.status === 'DROPPED_FULL_INVENTORY';
                    const statusBg = isRewarded ? c.primaryLight : isDropped ? '#FEE2E2' : '#FEF3C7';
                    const statusColor = isRewarded ? c.primary : isDropped ? '#DC2626' : '#D97706';
                    const statusLabel = isRewarded
                      ? 'مكافأة (+7 أيام)'
                      : isDropped
                        ? 'مخزون ممتلئ'
                        : 'معلق (بانتظار 4 طلاب)';

                    return (
                      <View
                        key={i}
                        style={{
                          backgroundColor: '#F8FAFC',
                          padding: 10,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: c.line,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: c.ink }}>
                          {r.takerName}
                        </Text>
                        <View
                          style={{
                            backgroundColor: statusBg,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 8,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: statusColor }}>
                            {statusLabel}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: '#F8FAFC',
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.line,
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 12, color: c.inkSoft, textAlign: 'center' }}>
              قم بالترقية إلى خطة مدفوعة لفتح كود الإحالة الخاص بك وكسب أيام مجانية.
            </Text>
            {whatsappUrl && (
              <MiniBtn
                label="ترقية الخطة عبر واتساب"
                tone="primary"
                onPress={() => Linking.openURL(whatsappUrl)}
              />
            )}
          </View>
        )}
      </View>
    </Card>
  );
}
