import { Pressable, View } from 'react-native';
import { Text } from './Text';
import { c } from './theme';

export function Choice<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <View>
      {label ? <Text style={{ color: c.inkSoft, marginBottom: 6, fontWeight: '600' }}>{label}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={{
                minHeight: 44,
                justifyContent: 'center',
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: selected ? c.primary : c.line,
                backgroundColor: selected ? c.primaryLight : c.card,
              }}
            >
              <Text style={{ color: selected ? c.primaryDark : c.ink, fontWeight: '600' }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
