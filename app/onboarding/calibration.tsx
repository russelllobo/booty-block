import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Camera, CheckCircle2, Footprints, Ruler } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { useBootyblock } from '../../lib/store/BootyblockProvider';
import { colors } from '../../constants/theme';

const tips = [
  { icon: Ruler, label: 'Step back until your full body fits.' },
  { icon: Footprints, label: 'Face the phone and keep feet planted.' },
  { icon: CheckCircle2, label: 'Stand tall for calibration, then squat.' },
];

export default function Calibration() {
  const { completeOnboarding } = useBootyblock();
  const [permission, requestPermission] = useCameraPermissions();

  async function finish() {
    await completeOnboarding();
    router.replace('/(tabs)');
  }

  return (
    <Screen scroll={false}>
      <Header title="Camera setup" subtitle="Bootyblock watches posture on-device and counts clean reps." back={() => router.back()} />

      <View className="flex-1 overflow-hidden rounded-[34px] bg-cocoa">
        {permission?.granted ? (
          <CameraView
            facing="front"
            mirror
            active
            className="flex-1"
            style={{ flex: 1 }}
            onMountError={(error) => console.error('Calibration camera failed to mount:', error.message)}
          />
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

      <Button label="Finish setup" icon={CheckCircle2} disabled={!permission?.granted} onPress={finish} />
    </Screen>
  );
}
