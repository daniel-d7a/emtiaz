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
  multiline,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  placeholder?: string;
  dir?: 'ltr';
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
  multiline?: boolean;
  maxLength?: number;
}) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[
          s.input,
          multiline && { minHeight: 96, textAlignVertical: 'top' },
          dir === 'ltr' && { textAlign: 'left', writingDirection: 'ltr' },
        ]}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor={c.inkSoft}
        keyboardType={keyboardType}
        multiline={multiline}
        maxLength={maxLength}
      />
    </View>
  );
}
