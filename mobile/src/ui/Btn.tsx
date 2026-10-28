import { ActivityIndicator, Pressable } from 'react-native';
import { c, s } from './theme';
import { Text } from './Text';

export function Btn({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
}) {
  const blocked = !!disabled || !!loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked, busy: !!loading }}
      onPress={onPress}
      disabled={blocked}
      style={({ pressed }) => [
        s.btn,
        variant === 'ghost' ? s.btnGhost : s.btnPrimary,
        blocked && { opacity: 0.5 },
        pressed && !blocked && { backgroundColor: variant === 'ghost' ? c.primaryLight : c.primaryDark },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? c.primary : c.onPrimary} />
      ) : (
        <Text style={variant === 'ghost' ? s.btnGhostText : s.btnText}>{label}</Text>
      )}
    </Pressable>
  );
}
