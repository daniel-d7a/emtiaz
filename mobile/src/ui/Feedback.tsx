import { ActivityIndicator, Text, View } from 'react-native';
import { c, s } from './theme';

export function Empty({ text }: { text: string }) {
  return <Text style={s.empty}>{text}</Text>;
}

export function Loading() {
  return <ActivityIndicator style={{ margin: 24 }} color={c.primary} />;
}

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <View accessibilityRole="alert" style={s.errBox}>
      <Text style={s.errText}>{String((error as Error)?.message ?? error)}</Text>
    </View>
  );
}
