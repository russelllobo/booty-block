import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { ArrowDown, ArrowUp, Camera, CheckCircle2, ChevronLeft } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { ComponentType, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '../../components/Button';
import { PoseOverlay } from '../../components/PoseOverlay';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import { colors, shadow } from '../../constants/theme';
import { captureAnalytics, useOnboardingStepAnalytics } from '../../lib/analytics';
import { usePoseSession } from '../../lib/services/pose';
import { useBootyblock } from '../../lib/store/BootyblockProvider';
import { BootyPoseCameraView } from '../../modules/booty-pose/src/BootyPoseCameraView';
import type { PosePhase } from '../../modules/booty-pose/src/BootyPose.types';

type Phase = {
  instruction: string;
  icon: ComponentType<{ size?: number; stroke?: string; strokeWidth?: number; style?: { marginTop?: number } }>;
  accent: string;
};

function useCalibrationDisplayPhase(phase: PosePhase, visible: boolean) {
  const [displayPhase, setDisplayPhase] = useState(phase);
  const displayPhaseRef = useRef(phase);
  const standingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    displayPhaseRef.current = displayPhase;
  }, [displayPhase]);

  useEffect(() => {
    if (standingTimerRef.current) {
      clearTimeout(standingTimerRef.current);
      standingTimerRef.current = null;
    }

    if (!visible) {
      setDisplayPhase(phase);
      return;
    }

    if (displayPhaseRef.current === 'descending' && phase === 'standing') {
      standingTimerRef.current = setTimeout(() => {
        setDisplayPhase('standing');
        standingTimerRef.current = null;
      }, 500);
      return () => {
        if (standingTimerRef.current) {
          clearTimeout(standingTimerRef.current);
          standingTimerRef.current = null;
        }
      };
    }

    setDisplayPhase(phase);
  }, [phase, visible]);

  return displayPhase;
}

export default function Calibration() {
  const { completeOnboarding, onboardingComplete } = useBootyblock();
  const posthog = usePostHog();
  const [permission, requestPermission] = useCameraPermissions();
  const webPreview = Platform.OS === 'web';
  const pose = usePoseSession({ target: 1, active: !webPreview && Boolean(permission?.granted) });
  const { width } = useWindowDimensions();
  const calibrationReady = webPreview || pose.count >= 1;
  const displayPhase = useCalibrationDisplayPhase(pose.phase, pose.visible);

  const phase: Phase = !pose.visible
    ? { instruction: 'STEP BACK', icon: ArrowDown, accent: colors.white }
    : displayPhase === 'calibrating'
      ? { instruction: 'STAND TALL', icon: ArrowDown, accent: colors.white }
      : displayPhase === 'standing'
        ? { instruction: 'DO ONE SQUAT', icon: ArrowDown, accent: colors.white }
        : displayPhase === 'descending'
          ? { instruction: 'GO LOWER', icon: ArrowDown, accent: colors.white }
          : displayPhase === 'bottom'
            ? { instruction: 'SQUAT DETECTED', icon: ArrowUp, accent: colors.lime }
            : displayPhase === 'rising'
              ? { instruction: 'SQUAT DETECTED', icon: CheckCircle2, accent: colors.lime }
              : { instruction: 'YOU’RE READY', icon: CheckCircle2, accent: colors.lime };

  const PhaseIcon = phase.icon;
  const cameraGranted = webPreview || Boolean(permission?.granted);

  useOnboardingStepAnalytics(
    posthog,
    '/onboarding/calibration',
    'calibration_squat_check',
    'Do one squat',
    25,
    30,
  );

  async function finish() {
    if (!onboardingComplete) {
      captureAnalytics(posthog, 'calibration_finished', {
        calibrated: calibrationReady,
        squat_count: pose.count,
        camera_granted: cameraGranted,
      });
      router.push('/onboarding/activity');
      return;
    }

    await completeOnboarding();
    router.replace('/(tabs)');
  }

  return (
    <Screen scroll={false}>
      <SlidePanel>
        <View className="flex-1">
          <View
            className="mb-4 items-center rounded-[24px] border border-white/20 px-3 py-4"
            style={{ backgroundColor: 'rgba(58, 31, 44, 0.92)' }}
          >
            {permission?.granted && !webPreview ? (
              <>
                <Text
                  className="text-center font-black"
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  style={{
                    color: phase.accent,
                    fontSize: Math.min(48, Math.max(32, width * 0.095)),
                    lineHeight: Math.min(50, Math.max(34, width * 0.1)),
                    letterSpacing: -1.5,
                  }}
                >
                  {phase.instruction}
                </Text>
                <PhaseIcon
                  size={74}
                  strokeWidth={4}
                  stroke={phase.accent}
                  style={{ marginTop: 2 }}
                />
              </>
            ) : (
              <Text
                className="text-center text-[28px] font-bold leading-[33px] text-white"
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Calibration
              </Text>
            )}
          </View>

          <View
            className="flex-1 overflow-hidden rounded-[34px] border border-white/80 bg-black"
            style={shadow}
          >
            {webPreview ? (
              <View className="flex-1 items-center justify-center gap-5 p-8">
                <View className="h-24 w-24 items-center justify-center rounded-full bg-mint">
                  <CheckCircle2 size={48} stroke={colors.cocoa} strokeWidth={2.6} />
                </View>
                <Text className="text-center text-[24px] font-bold leading-[29px] text-white">
                  Browser preview ready
                </Text>
                <Text className="text-center text-base font-semibold leading-6 text-petal">
                  Live squat calibration runs on device. You can finish setup now.
                </Text>
              </View>
            ) : permission?.granted ? (
              <>
                {Platform.OS === 'ios' ? (
                  <BootyPoseCameraView style={styles.cameraFill} />
                ) : (
                  <CameraView
                    facing="front"
                    mirror
                    active
                    style={styles.cameraFill}
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
              </>
            ) : (
              <View className="flex-1 items-center justify-center gap-5 p-8">
                <View className="h-24 w-24 items-center justify-center rounded-full bg-petal">
                  <Camera size={44} stroke={colors.raspberry} strokeWidth={2.5} />
                </View>
                <Text className="text-center text-[24px] font-bold leading-[29px] text-white">
                  Camera access
                </Text>
                <Text className="text-center text-base font-semibold leading-6 text-petal">
                  The camera stays on your phone for live squat detection only.
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center gap-3 pt-5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => router.back()}
              className="h-14 w-14 items-center justify-center rounded-full bg-white/80"
            >
              <ChevronLeft size={26} stroke={colors.cocoa} strokeWidth={2.6} />
            </Pressable>

            <View className="flex-1">
              {!cameraGranted ? (
                <Button label="Allow camera" icon={Camera} onPress={requestPermission} />
              ) : (
                <Button
                  label={calibrationReady ? 'Continue' : 'Try later'}
                  variant={calibrationReady ? 'primary' : 'outline'}
                  foregroundColor={calibrationReady ? undefined : '#000000'}
                  onPress={finish}
                />
              )}
            </View>
          </View>
        </View>
      </SlidePanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    transform: [{ scale: 1.18 }],
  },
});
