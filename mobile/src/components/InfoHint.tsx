import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { MiniBtn, Text, c, s } from '../ui';

export type InfoHintStep = {
  title: string;
  body: string;
};

export type InfoHintProps = {
  title?: string;
  hint?: string;
  steps?: InfoHintStep[];
  accessibilityLabel?: string;
};

export function InfoHint({ title, hint, steps, accessibilityLabel }: InfoHintProps) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const isMultiStep = Array.isArray(steps) && steps.length > 0;
  if (!isMultiStep && !hint) return null;

  const label = accessibilityLabel ?? title ?? 'معلومات إضافية';
  const currentStep = isMultiStep ? (steps[stepIndex] ?? steps[0]) : null;
  const totalSteps = isMultiStep ? steps.length : 0;
  const isLastStep = isMultiStep ? stepIndex >= totalSteps - 1 : true;
  const modalTitle = isMultiStep
    ? (title ?? currentStep!.title)
    : (title ?? 'معلومة توضيحية');

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          setStepIndex(0);
          setOpen(true);
        }}
        style={({ pressed }) => ({
          width: 26,
          height: 26,
          borderRadius: 13,
          borderWidth: 1,
          borderColor: c.primary,
          backgroundColor: pressed ? c.primary : c.primaryLight,
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        <Text
          style={{
            color: c.primaryDark,
            fontSize: 13,
            fontWeight: '700',
            textAlign: 'center',
          }}
        >
          i
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(28, 25, 23, 0.45)',
            justifyContent: 'center',
            padding: 20,
            direction: 'rtl',
          }}
        >
          <View style={[s.card, { marginBottom: 0 }]}>
            <Text style={[s.h2, { color: c.primaryDark }]}>{modalTitle}</Text>
            {isMultiStep && currentStep ? (
              <View
                style={{
                  backgroundColor: c.background,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: c.line,
                  padding: 12,
                  marginTop: 4,
                  marginBottom: 14,
                }}
              >
                {title && title !== currentStep.title ? (
                  <Text style={{ fontWeight: '700', fontSize: 15, marginBottom: 4 }}>
                    {currentStep.title}
                  </Text>
                ) : null}
                <Text style={{ color: c.inkSoft, fontSize: 14, lineHeight: 22 }}>
                  {currentStep.body}
                </Text>
              </View>
            ) : (
              <Text style={{ color: c.inkSoft, fontSize: 14, lineHeight: 22, marginBottom: 14 }}>
                {hint}
              </Text>
            )}

            <View style={s.row}>
              {isMultiStep ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {steps.map((_, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => setStepIndex(idx)}
                      style={{
                        width: idx === stepIndex ? 18 : 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: idx === stepIndex ? c.primary : c.line,
                      }}
                    />
                  ))}
                  <Text style={{ color: c.inkSoft, fontSize: 12, fontWeight: '700' }}>
                    {stepIndex + 1} / {totalSteps}
                  </Text>
                </View>
              ) : (
                <View />
              )}

              <View style={{ flexDirection: 'row', gap: 8 }}>
                {isMultiStep && stepIndex > 0 ? (
                  <MiniBtn
                    label="السابق"
                    tone="ghost"
                    onPress={() => setStepIndex((i) => Math.max(0, i - 1))}
                  />
                ) : null}
                {isMultiStep && !isLastStep ? (
                  <MiniBtn
                    label="التالي"
                    tone="primary"
                    onPress={() => setStepIndex((i) => Math.min(totalSteps - 1, i + 1))}
                  />
                ) : (
                  <MiniBtn label="حسناً" tone="primary" onPress={() => setOpen(false)} />
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
