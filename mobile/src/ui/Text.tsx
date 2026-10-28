import { StyleSheet, Text as RNText, type TextProps } from 'react-native';
import { f, s } from './theme';

export function Text({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  const { fontWeight, ...rest } = flat;
  const family =
    flat.fontFamily ??
    (fontWeight === '700' || fontWeight === 'bold'
      ? f.bold
      : fontWeight === '600'
        ? f.semiBold
        : f.regular);

  return <RNText {...props} style={[s.text, rest, { fontFamily: family }]} />;
}
