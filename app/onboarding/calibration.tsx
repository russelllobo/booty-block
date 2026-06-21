import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { ArrowDown, ArrowUp, Camera, CheckCircle2 } from 'lucide-react-native';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '../../components/Button';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { PoseOverlay } from '../../components/PoseOverlay';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import { colors } from '../../constants/theme';
import { usePoseSession } from '../../lib/services/pose';
import { useBootyblock } from '../../lib/store/BootyblockProvider';
import { BootyPoseCameraView } from '../../modules/booty-pose/src/BootyPoseCameraView';

export default function Calibration() {
  const { completeOnboarding } = useBootyblock();
  const [permission, requestPermission] = useCameraPermissions();
  const pose = usePoseSession({ target: 1, active: Boolean(permission?.granted) });
  const { width } = useWindowDimensions();
  const calibrationReady = pose.count >= 1;
  const instruction = !pose.visible
    ? 'STEP BACK'
    : pose.phase === 'calibrating'
      ? 'STAND TALL'
      : pose.phase === 'standing'
        ? 'DO ONE SQUAT'
        : pose.phase === 'descending'
          ? 'GO LOWER'
          : pose.phase === 'bottom'
            ? 'SQUAT DETECTED'
            : pose.phase === 'rising'
              ? 'STAND UP'
              : 'YOU’RE READY';
  const instructionColor =
    pose.phase === 'bottom' || pose.phase === 'complete' ? colors.lime : colors.white;
  const PhaseIcon =
    pose.phase === 'bottom' || pose.phase === 'rising'
      ? ArrowUp
      : pose.phase === 'complete'
        ? CheckCircle2
        : ArrowDown;

  async function finish() {
    await completeOnboarding();
    router.replace('/(tabs)');
  }

  return (
    <Screen scroll={false}>
      <OnboardingProgress step={11} onBack={() => router.back()} />

      <SlidePanel>
        <View className="flex-1 pt-3">
          <View className="mb-3">
            <Text className="text-center text-sm font-black uppercase tracking-[2px] text-raspberry">
              Camera setup
            </Text>
            <Text className="mt-1 text-center text-xl font-black text-cocoa">
              Step back so your whole body is visible
            </Text>
          </View>

          <View className="flex-1 overflow-hidden rounded-[30px] bg-cocoa">
            {permission?.granted ? (
              <>
                {Platform.OS === 'ios' ? (
                  <BootyPoseCameraView style={StyleSheet.absoluteFill} />
                ) : (
                  <CameraView
                    facing="front"
                    mirror
                    active
                    style={StyleSheet.absoluteFill}
                    onMountError={(error) => console.error('Calibration camera failed to mount:', error.message)}
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
                  className="absolute left-3 right-3 top-3 items-center rounded-[24px] border border-white/20 px-3 py-4"
                  pointerEvents="none"
                  style={{ backgroundColor: 'rgba(58, 31, 44, 0.82)' }}
                >
                  <Text
                    className="text-center font-black"
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    style={{
                      color: instructionColor,
                      fontSize: Math.min(52, Math.max(36, width * 0.105)),
                      lineHeight: Math.min(54, Math.max(38, width * 0.11)),
                      letterSpacing: -1.5,
                    }}
                  >
                    {instruction}
                  </Text>
                  <PhaseIcon
                    size={86}
                    strokeWidth={4}
                    stroke={instructionColor}
                    style={{ marginTop: 2 }}
                  />
                </View>

                {!pose.visible && (
                  <View
                    className="absolute bottom-6 left-6 right-6 top-32 rounded-[28px] border-4 border-dashed border-white/80"
                    pointerEvents="none"
                  />
                )}

                <View
                  className="absolute bottom-3 left-3 right-3 items-center rounded-[22px] border border-white/20 px-4 py-3"
                  pointerEvents="none"
                  style={{ backgroundColor: 'rgba(58, 31, 44, 0.82)' }}
                >
                  <Text className="text-center text-lg font-black text-white">
                    {calibrationReady
                      ? 'Skeleton green = squat found'
                      : 'Face the phone · keep your full body in frame'}
                  </Text>
                </View>
              </>
            ) : (
              <View className="flex-1 items-center justify-center gap-4 p-8">
                <Camera size={46} stroke={colors.petal} />
                <Text className="text-center text-2xl font-black text-white">Camera permission</Text>
                <Text className="text-center text-base font-semibold leading-6 text-petal">
                  The camera feed is for live squat detection only.
                </Text>
                <Button label="Allow camera" onPress={requestPermission} />
              </View>
            )}
          </View>

          <View className="pt-3">
            <Button
              label={calibrationReady ? 'Finish setup' : 'Complete one squat'}
              icon={CheckCircle2}
              disabled={!permission?.granted || !calibrationReady}
              onPress={finish}
            />
          </View>
        </View>
      </SlidePanel>
    </Screen>
  );
}
