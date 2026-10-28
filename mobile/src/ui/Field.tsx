import { TextInput, View } from 'react-native';
import { Text } from './Text';
import { c, s } from './theme';

export function Field({
  label,
  value,
  onChange,
  secure,
  placeholder,
  dir,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  placeholder?: string;
  dir?: 'ltr';
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, dir === 'ltr' && { textAlign: 'left', writingDirection: 'ltr' }]}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor={c.inkSoft}
        keyboardType={keyboardType}
      />
    </View>
  );
}
