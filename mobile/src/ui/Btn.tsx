import { Pressable, Text } from 'react-native';
import { s } from './theme';

export function Btn({
  label,
  onPress,
  variant,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={[s.btn, variant === 'ghost' ? s.btnGhost : s.btnPrimary, disabled && { opacity: 0.5 }]}
    >
      <Text style={variant === 'ghost' ? s.btnGhostText : s.btnText}>{label}</Text>
    </Pressable>
  );
}
