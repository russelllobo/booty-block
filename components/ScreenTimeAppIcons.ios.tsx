import { requireNativeViewManager } from 'expo-modules-core';
import type { ComponentType } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

type ScreenTimeAppIconsProps = {
  familyActivitySelectionId: string;
  maximumIconCount?: number;
  style?: StyleProp<ViewStyle>;
};

const NativeScreenTimeAppIcons: ComponentType<ScreenTimeAppIconsProps> =
  requireNativeViewManager('ReactNativeDeviceActivityIconsModule');

export function ScreenTimeAppIcons(props: ScreenTimeAppIconsProps) {
  return <NativeScreenTimeAppIcons {...props} />;
}
