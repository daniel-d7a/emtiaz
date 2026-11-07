import { useEffect, useState } from 'react';
import { View, Modal, Linking, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api, onPlanLimitReached, type PlanLimitReachedResponse } from '../api';
import { Btn, Card, Text, c } from '../ui';
import type { MeResponse } from '../../../shared/api';

export default function UpgradeModal() {
  const [data, setData] = useState<PlanLimitReachedResponse | null>(null);
  const [visible, setVisible] = useState(false);

  const { data: me } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: () => api('/api/me'),
  });

  const { data: entitlements } = useQuery({
    queryKey: ['teacher-entitlements'],
    queryFn: () => api('/api/teacher/entitlements'),
    enabled: me?.user?.role === 'TEACHER',
  });

  useEffect(() => {
    return onPlanLimitReached((limitData) => {
      setData(limitData);
      setVisible(true);
    });
  }, []);

  if (!visible || !data) return null;

  const close = () => setVisible(false);

  const supportWhatsapp = entitlements?.supportWhatsapp ?? '96890000000';
  const cleanPhone = (supportWhatsapp ?? '').replace(/\D/g, '');

  const formatStorage = (bytes: number | null) => {
    if (bytes == null) return 'غير محدود';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(0)} GB`;
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  const openWhatsapp = (opt: PlanLimitReachedResponse['upgradeOptions'][number]) => {
    const planName = opt.nameAr;
    const price =
      opt.firstMonthDiscountEligible && opt.firstMonthDiscountPrice != null
        ? `${opt.firstMonthDiscountPrice} ${opt.currency}`
        : `${opt.monthlyPrice} ${opt.currency}`;
    const discountNote = opt.firstMonthDiscountEligible ? ' (مع خصم الشهر الأول)' : '';

    const text = `مرحبًا امتياز، أود ترقية خطتي إلى (${planName}) بسعر ${price}${discountNote}.\nاسم المعلم: ${me?.user?.name ?? ''}\nرقم الهاتف: ${me?.user?.phoneNumber ?? me?.user?.email ?? ''}`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    Linking.openURL(url);
  };

  const openCustomPlanWhatsapp = () => {
    const text = `مرحبًا امتياز، أرغب في الاستفسار عن خطة مخصصة (Custom Plan).\nاسم المعلم: ${me?.user?.name ?? ''}\nرقم الهاتف: ${me?.user?.phoneNumber ?? me?.user?.email ?? ''}`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    Linking.openURL(url);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: c.card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: c.line,
            width: '100%',
            maxWidth: 440,
            maxHeight: '85%',
            padding: 20,
          }}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: c.ink, marginBottom: 8 }}>
              تم الوصول للحد الأقصى للخطة
            </Text>

            <Text style={{ fontSize: 13, color: c.inkSoft, lineHeight: 20, marginBottom: 16 }}>
              {data.limitType === 'STUDENTS'
                ? `لقد وصلت إلى الحد الأقصى لعدد الطلاب المتاح في خطتك (${data.currentUsage} / ${data.limit} طالب). يُرجى الترقية للسماح بالمزيد.`
                : `لقد استهلكت مساحة التخزين المتاحة لملفات الدروس (${formatStorage(data.currentUsage)} / ${formatStorage(data.limit)}). يُرجى الترقية لمتابعة الرفع.`}
            </Text>

            {data.upgradeOptions && data.upgradeOptions.length > 0 && (
              <View style={{ gap: 12, marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.ink }}>
                  خيارات الترقية المتاحة
                </Text>
                {data.upgradeOptions.map((opt) => {
                  const hasDiscount =
                    opt.firstMonthDiscountEligible && opt.firstMonthDiscountPrice != null;

                  return (
                    <View
                      key={opt.id}
                      style={{
                        backgroundColor: c.background,
                        borderWidth: 1,
                        borderColor: c.line,
                        borderRadius: 14,
                        padding: 14,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink }}>
                          {opt.nameAr}
                        </Text>
                        {hasDiscount && (
                          <View
                            style={{
                              backgroundColor: '#E8F5E9',
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 8,
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#2E7D32' }}>
                              خصم الشهر الأول
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={{ fontSize: 12, color: c.inkSoft, marginTop: 4 }}>
                        {opt.maxStudents ? `حتى ${opt.maxStudents} طالب` : 'غير محدود'} • {formatStorage(opt.maxStorageBytes)}
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 8, gap: 6 }}>
                        {hasDiscount ? (
                          <>
                            <Text style={{ fontSize: 18, fontWeight: '800', color: c.primary }}>
                              {opt.firstMonthDiscountPrice} {opt.currency}
                            </Text>
                            <Text style={{ fontSize: 12, color: c.inkSoft, textDecorationLine: 'line-through' }}>
                              {opt.monthlyPrice} {opt.currency}
                            </Text>
                            <Text style={{ fontSize: 11, color: c.inkSoft }}>شهريًا</Text>
                          </>
                        ) : (
                          <>
                            <Text style={{ fontSize: 18, fontWeight: '800', color: c.ink }}>
                              {opt.monthlyPrice} {opt.currency}
                            </Text>
                            <Text style={{ fontSize: 11, color: c.inkSoft }}>شهريًا</Text>
                          </>
                        )}
                      </View>

                      <View style={{ marginTop: 10 }}>
                        <Btn label="ترقية عبر واتساب" onPress={() => openWhatsapp(opt)} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {data.customPlanPrompt && (
              <View
                style={{
                  backgroundColor: c.background,
                  borderWidth: 1,
                  borderColor: c.line,
                  borderRadius: 14,
                  padding: 14,
                  alignItems: 'center',
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.ink, textAlign: 'center' }}>
                  تواصل مع الإدارة للحصول على خطة مخصصة
                </Text>
                <View style={{ marginTop: 10, width: '100%' }}>
                  <Btn label="تواصل معنا" onPress={openCustomPlanWhatsapp} />
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={close}
              style={{
                alignItems: 'center',
                paddingVertical: 10,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: c.inkSoft }}>إغلاق</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
