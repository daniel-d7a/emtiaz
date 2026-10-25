import { Text, TextInput, View } from 'react-native';
import { c, s } from './theme';

export function Field({
  label,
  value,
  onChange,
  secure,
  placeholder,
  dir,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  placeholder?: string;
  dir?: 'ltr';
}) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, dir === 'ltr' && { textAlign: 'left', writingDirection: undefined as any }]}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        placeholder={placeholder}
        placeholderTextColor={c.inkSoft}
      />
    </View>
  );
}
