import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { ArrowDown, ArrowUp, Camera, CheckCircle2, X } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '../components/Button';
import { PoseOverlay } from '../components/PoseOverlay';
import { Screen } from '../components/Screen';
import { MINUTES_TO_SQUATS } from '../constants/bootyblock';
import { colors } from '../constants/theme';
import { usePoseSession } from '../lib/services/pose';
import { useBootyblock } from '../lib/store/BootyblockProvider';
import { BootyPoseCameraView } from '../modules/booty-pose/src/BootyPoseCameraView';

export default function Session() {
  const { requestedMinutes, grantUnlock } = useBootyblock();
  const target = requestedMinutes * MINUTES_TO_SQUATS;
  const [permission, requestPermission] = useCameraPermissions();
  const pose = usePoseSession({ target, active: Boolean(permission?.granted) });
  const progress = useMemo(() => Math.min(1, pose.count / target), [pose.count, target]);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const cameraFrame = useMemo(() => {
    const width = Math.min(screenWidth, Math.max(280, (screenHeight - 180) * 0.75));
    return { width, height: width * (4 / 3) };
  }, [screenHeight, screenWidth]);
  const instruction = !pose.visible
    ? 'STEP BACK'
    : pose.phase === 'calibrating'
      ? 'STAND TALL'
      : pose.phase === 'standing'
        ? 'SQUAT DOWN'
        : pose.phase === 'descending'
          ? 'GO LOWER'
          : pose.phase === 'bottom'
            ? 'SQUAT DETECTED'
            : pose.phase === 'rising'
              ? 'STAND UP'
              : 'COMPLETE';
  const instructionColor =
    pose.phase === 'bottom' || pose.phase === 'complete' ? colors.lime : colors.white;
  const PhaseIcon =
    pose.phase === 'bottom' || pose.phase === 'rising'
      ? ArrowUp
      : pose.phase === 'complete'
        ? CheckCircle2
        : ArrowDown;

  useEffect(() => {
    if (pose.count >= target) {
      void grantUnlock(requestedMinutes).then(() => router.replace('/success'));
    }
  }, [grantUnlock, pose.count, requestedMinutes, target]);

  return (
    <Screen scroll={false} flush>
      <View className="flex-1 bg-cocoa">
        {permission?.granted ? (
          <View className="flex-1 items-center justify-center">
            <View
              className="overflow-hidden bg-black"
              style={[cameraFrame, { borderRadius: 24 }]}
            >
              {Platform.OS === 'ios' ? (
                <BootyPoseCameraView style={StyleSheet.absoluteFill} />
              ) : (
                <CameraView
                  facing="front"
                  mirror
                  active
                  style={StyleSheet.absoluteFill}
                  onMountError={(error) => console.error('Session camera failed to mount:', error.message)}
                />
              )}
              <PoseOverlay
                landmarks={pose.landmarks}
                phase={pose.phase}
                visible={pose.visible}
                frameWidth={pose.frameWidth}
                frameHeight={pose.frameHeight}
              />
              <View
                className="absolute left-3 right-3 top-3 items-center rounded-[24px] border border-white/20 px-3 py-3"
                pointerEvents="none"
                style={{ backgroundColor: 'rgba(58, 31, 44, 0.82)' }}
              >
                <Text
                  className="text-center font-black"
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  style={{
                    color: instructionColor,
                    fontSize: Math.min(48, Math.max(34, screenWidth * 0.1)),
                    lineHeight: Math.min(50, Math.max(36, screenWidth * 0.105)),
                    letterSpacing: -1.5,
                  }}
                >
                  {instruction}
                </Text>
                <PhaseIcon
                  size={78}
                  strokeWidth={4}
                  stroke={instructionColor}
                  style={{ marginTop: 2 }}
                />
              </View>
              {!pose.visible && (
                <View
                  className="absolute bottom-7 left-5 right-5 top-32 rounded-[28px] border-4 border-dashed border-white/80"
                  pointerEvents="none"
                />
              )}
            </View>
          </View>
        ) : (
          <View className="absolute inset-0 items-center justify-center bg-cocoa px-8">
            <Camera size={48} stroke={colors.petal} />
            <Text className="mt-5 text-center text-2xl font-black text-white">Camera required</Text>
            <Text className="mt-2 text-center text-base font-semibold leading-6 text-petal">
              Bootyblock needs the camera to count reps on-device.
            </Text>
            <View className="mt-6 w-full">
              <Button label="Allow camera" icon={Camera} onPress={requestPermission} />
            </View>
          </View>
        )}

        <View className="absolute left-0 right-0 top-0 flex-row items-center justify-between px-4 pt-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close workout"
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full border border-white/20"
            style={{ backgroundColor: 'rgba(58, 31, 44, 0.48)' }}
          >
            <X size={19} stroke={colors.white} />
          </Pressable>
          <View
            className="rounded-full border border-white/20 px-4 py-2"
            style={{ backgroundColor: 'rgba(58, 31, 44, 0.48)' }}
          >
            <Text className="text-xs font-black text-white">{requestedMinutes} min unlock</Text>
          </View>
        </View>

        {permission?.granted && (
          <View
            className="absolute bottom-3 left-3 right-3 rounded-[26px] border border-white/20 px-4 pb-4 pt-3"
            style={{ backgroundColor: 'rgba(58, 31, 44, 0.7)' }}
          >
            <View className="mb-3 h-1 overflow-hidden rounded-full bg-white/20">
              <View className="h-full rounded-full bg-lime" style={{ width: `${progress * 100}%` }} />
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-baseline">
                <Text className="text-4xl font-black text-white">{pose.count}</Text>
                <Text className="ml-1 text-lg font-black text-petal">/{target} squats</Text>
              </View>
              <View
                className="rounded-2xl px-3 py-2"
                style={{
                  backgroundColor:
                    pose.phase === 'bottom' || pose.phase === 'complete'
                      ? colors.lime
                      : 'rgba(255,255,255,0.12)',
                }}
              >
                <Text
                  className="text-sm font-black"
                  style={{
                    color:
                      pose.phase === 'bottom' || pose.phase === 'complete'
                        ? colors.cocoa
                        : colors.white,
                  }}
                >
                  {pose.phase === 'bottom' ? 'SQUAT FOUND' : `${Math.round(pose.confidence * 100)}%`}
                </Text>
              </View>
            </View>

            <Text className="mt-1 text-base font-black text-white">{pose.hint}</Text>
          </View>
        )}
      </View>
    </Screen>
  );
}
