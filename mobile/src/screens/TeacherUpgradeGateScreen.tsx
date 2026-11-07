import { useState } from 'react';
import { View, ScrollView, TextInput, Linking, Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, teacherApi } from '../api';
import { Btn, Card, Loading, Text, c } from '../ui';
import type { MeResponse } from '../../../shared/api';

export default function TeacherUpgradeGateScreen({ onLogout }: { onLogout: () => void }) {
  const qc = useQueryClient();
  const [code, setCode] = useState('');

  const { data: me } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: () => api('/api/me'),
  });

  const { data: entitlements, isLoading } = useQuery({
    queryKey: ['teacher-entitlements'],
    queryFn: () => teacherApi.getEntitlements(),
  });

  const redeemMutation = useMutation({
    mutationFn: (promoCode: string) => teacherApi.redeemCode(promoCode),
    onSuccess: (res) => {
      Alert.alert('نجاح', res.message);
      setCode('');
      qc.invalidateQueries({ queryKey: ['teacher-entitlements'] });
    },
    onError: (err: any) => {
      Alert.alert('خطأ', err.message || 'تعذر استرداد الكود');
    },
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, justifyContent: 'center', alignItems: 'center' }}>
        <Loading />
      </View>
    );
  }

  const {
    activePlan,
    usage = { activeStudentCount: 0, usedStorageBytes: 0 },
    supportWhatsapp = '96890000000',
    upgradeOptions = [],
    customPlanPrompt = null,
  } = entitlements ?? {};

  const cleanPhone = (supportWhatsapp ?? '').replace(/\D/g, '');

  const formatStorage = (bytes: number | null) => {
    if (bytes == null) return 'غير محدود';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  const studentLimit = activePlan?.maxStudents ?? 10;
  const storageLimit = activePlan?.maxStorageBytes ?? 1073741824;

  const openWhatsapp = (opt: any) => {
    const planName = opt.nameAr;
    const price =
      opt.firstMonthDiscountEligible && opt.firstMonthDiscountPrice != null
        ? `${opt.firstMonthDiscountPrice} ${opt.currency}`
        : `${opt.monthlyPrice} ${opt.currency}`;
    const discountNote = opt.firstMonthDiscountEligible ? ' (مع خصم الشهر الأول)' : '';

    const text = `مرحبًا امتياز، أود تجديد وترقية خطتي كمعلم إلى (${planName}) بسعر ${price}${discountNote}.\nاسم المعلم: ${me?.user?.name ?? ''}\nرقم الهاتف: ${me?.user?.phoneNumber ?? me?.user?.email ?? ''}`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    Linking.openURL(url);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
      {/* Lockout Banner */}
      <View
        style={{
          backgroundColor: '#FFEBEE',
          borderWidth: 1.5,
          borderColor: '#EF5350',
          borderRadius: 16,
          padding: 16,
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#C62828', marginBottom: 6 }}>
          بوابة الترقية — مساحة العمل معلقة
        </Text>
        <Text style={{ fontSize: 13, color: '#B71C1C', lineHeight: 20 }}>
          انتهت فترة اشتراكك الحالية وتتجاوز بياناتك حدود الخطة المجانية. للاستمرار في إدارة مساحة عملك، يُرجى تجديد أو ترقية خطتك.
        </Text>
      </View>

      {/* Usage meters */}
      <Card>
        <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink, marginBottom: 12 }}>
          الاستهلاك الحالي مقابل الحدود المجانية
        </Text>

        <View style={{ gap: 10 }}>
          <View style={{ backgroundColor: c.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: c.line }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 13, color: c.inkSoft, fontWeight: '600' }}>الطلاب النشطون</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#C62828' }}>
                {usage.activeStudentCount} / {studentLimit}
              </Text>
            </View>
          </View>

          <View style={{ backgroundColor: c.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: c.line }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 13, color: c.inkSoft, fontWeight: '600' }}>سعة التخزين</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#C62828' }}>
                {formatStorage(usage.usedStorageBytes)} / {formatStorage(storageLimit)}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Upgrade Options */}
      {upgradeOptions && upgradeOptions.length > 0 && (
        <Card>
          <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink, marginBottom: 12 }}>
            خيارات الترقية
          </Text>

          <View style={{ gap: 12 }}>
            {upgradeOptions.map((opt: any) => {
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
        </Card>
      )}

      {/* Code Redemption */}
      <Card>
        <Text style={{ fontSize: 15, fontWeight: '700', color: c.ink, marginBottom: 4 }}>
          استرداد كود الخصم أو الإحالة
        </Text>
        <Text style={{ fontSize: 12, color: c.inkSoft, marginBottom: 12 }}>
          أدخل الكود للحصول على أيام اشتراك إضافية
        </Text>

        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="PROMO30"
          placeholderTextColor={c.inkSoft}
          autoCapitalize="characters"
          style={{
            backgroundColor: c.background,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            fontSize: 15,
            color: c.ink,
            marginBottom: 10,
          }}
        />

        <Btn
          label={redeemMutation.isPending ? 'جاري الاسترداد...' : 'استرداد'}
          onPress={() => {
            if (code.trim()) redeemMutation.mutate(code.trim());
          }}
          disabled={!code.trim() || redeemMutation.isPending}
        />
      </Card>

      {/* Logout */}
      <View style={{ alignItems: 'center', marginTop: 10 }}>
        <Btn label="تسجيل الخروج" variant="ghost" onPress={onLogout} />
      </View>
    </ScrollView>
  );
}
