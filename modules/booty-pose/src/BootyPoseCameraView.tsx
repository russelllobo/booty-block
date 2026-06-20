import type { ViewProps } from 'react-native';
import { requireNativeViewManager } from 'expo-modules-core';

const NativeBootyPoseCameraView =
  requireNativeViewManager<ViewProps>('BootyPose', 'BootyPoseCameraView');

export function BootyPoseCameraView(props: ViewProps) {
  return <NativeBootyPoseCameraView {...props} />;
}
