import { Pressable } from 'react-native';
import { Text } from './Text';
import { c } from './theme';

export function MiniBtn({
  label,
  accessibilityLabel,
  onPress,
  disabled,
  tone = 'ghost',
}: {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'ghost' | 'danger' | 'primary';
}) {
  const color = tone === 'danger' ? c.danger : tone === 'primary' ? c.onPrimary : c.primaryDark;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: 40,
        minHeight: 40,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: tone === 'primary' ? c.primary : c.line,
        backgroundColor:
          tone === 'primary' ? c.primary : tone === 'danger' ? c.dangerLight : c.card,
        opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color, fontWeight: '600', fontSize: 13, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}
