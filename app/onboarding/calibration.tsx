import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Camera, CheckCircle2, Footprints, Ruler } from 'lucide-react-native';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { PoseOverlay } from '../../components/PoseOverlay';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import { colors } from '../../constants/theme';
import { usePoseSession } from '../../lib/services/pose';
import { useBootyblock } from '../../lib/store/BootyblockProvider';
import { BootyPoseCameraView } from '../../modules/booty-pose/src/BootyPoseCameraView';

const tips = [
  { icon: Ruler, label: 'Step back until your full body fits.' },
  { icon: Footprints, label: 'Face the phone and keep feet planted.' },
  { icon: CheckCircle2, label: 'Stand tall for calibration, then squat.' },
];

export default function Calibration() {
  const { completeOnboarding } = useBootyblock();
  const [permission, requestPermission] = useCameraPermissions();
  const pose = usePoseSession({ target: 999, active: Boolean(permission?.granted) });
  const calibrationReady = pose.visible && pose.phase !== 'calibrating';

  async function finish() {
    await completeOnboarding();
    router.replace('/(tabs)');
  }

  return (
    <Screen scroll={false}>
      <OnboardingProgress step={11} onBack={() => router.back()} />

      <SlidePanel>
        <View className="flex-1">
          <Header title="Camera setup" subtitle="Bootyblock watches posture on-device and counts clean reps." />

          <View className="flex-1 overflow-hidden rounded-[34px] bg-cocoa">
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

                {!pose.visible && (
                  <View
                    className="absolute bottom-20 left-6 right-6 top-6 rounded-[28px] border-2 border-dashed border-white/70"
                    pointerEvents="none"
                  />
                )}

                <View
                  className="absolute bottom-4 left-4 right-4 rounded-[24px] border border-white/20 px-4 py-3"
                  pointerEvents="none"
                  style={{ backgroundColor: 'rgba(58, 31, 44, 0.82)' }}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-black uppercase tracking-wider text-petal">
                      {calibrationReady ? 'Calibration ready' : 'Calibrating'}
                    </Text>
                    <Text className="text-xs font-bold text-petal">
                      {Math.round(pose.confidence * 100)}%
                    </Text>
                  </View>
                  <Text className="mt-1 text-base font-black text-white">{pose.hint}</Text>
                  <Text className="mt-1 text-xs font-bold uppercase tracking-wider text-white/60">
                    {pose.phase}
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

          <View className="my-5 gap-3">
            {tips.map((tip) => (
              <View key={tip.label} className="flex-row items-center gap-3 rounded-3xl bg-white/70 px-4 py-3">
                <tip.icon size={20} stroke={colors.raspberry} />
                <Text className="flex-1 text-sm font-bold text-cocoa">{tip.label}</Text>
              </View>
            ))}
          </View>

          <Button
            label={calibrationReady ? 'Finish setup' : 'Stand tall to calibrate'}
            icon={CheckCircle2}
            disabled={!permission?.granted || !calibrationReady}
            onPress={finish}
          />
        </View>
      </SlidePanel>
    </Screen>
  );
}
