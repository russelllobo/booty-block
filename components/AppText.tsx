import { forwardRef } from 'react';
import {
  Platform,
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  TextInputProps,
  TextProps,
  TextStyle,
} from 'react-native';

const iosFontFamily = 'ui-rounded';
const webFontFamily = 'ui-rounded, "SF Pro Rounded", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const appFontFamily = Platform.select({
  ios: iosFontFamily,
  web: webFontFamily,
  default: 'System',
});

export function appFontFamilyForWeight(fontWeight?: TextStyle['fontWeight']): string | undefined {
  if (Platform.OS === 'web') return webFontFamily;
  if (Platform.OS !== 'ios') return 'System';
  return iosFontFamily;
}

function roundedStyle(style: TextProps['style']): TextStyle {
  const fontWeight = StyleSheet.flatten(style)?.fontWeight;

  return {
    fontFamily: appFontFamilyForWeight(fontWeight),
    // The local SF Pro Rounded install resolves both 600 and 700 to its Bold
    // face. Match that preview on iOS so semibold headings do not get thinner.
    ...(Platform.OS === 'ios' && fontWeight === '600' ? { fontWeight: '700' } : null),
  };
}

export type AppTextInputRef = RNTextInput;

type AppTextProps = TextProps & {
  useAppFont?: boolean;
};

export const Text = forwardRef<RNText, AppTextProps>(function Text(
  { style, useAppFont = true, ...props },
  ref,
) {
  return <RNText ref={ref} style={[style, useAppFont ? roundedStyle(style) : null]} {...props} />;
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...props }, ref) {
  return <RNTextInput ref={ref} style={[style, roundedStyle(style)]} {...props} />;
});
