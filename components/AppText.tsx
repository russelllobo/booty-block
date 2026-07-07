import { forwardRef } from 'react';
import {
  Platform,
  Text as RNText,
  TextInput as RNTextInput,
  TextInputProps,
  TextProps,
  TextStyle,
} from 'react-native';

const webFontFamily = 'SF Pro Rounded, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const appFontFamily = Platform.select({
  ios: undefined,
  web: webFontFamily,
  default: 'System',
});

export function appFontFamilyForWeight(fontWeight?: TextStyle['fontWeight']): string | undefined {
  if (Platform.OS === 'web') return webFontFamily;
  if (Platform.OS !== 'ios') return 'System';
  return undefined;
}

function roundedStyle(style: TextProps['style']): TextStyle {
  return { fontFamily: appFontFamilyForWeight() };
}

export type AppTextInputRef = RNTextInput;

export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...props }, ref) {
  return <RNText ref={ref} style={[style, roundedStyle(style)]} {...props} />;
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...props }, ref) {
  return <RNTextInput ref={ref} style={[style, roundedStyle(style)]} {...props} />;
});
