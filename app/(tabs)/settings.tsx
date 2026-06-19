import { router } from 'expo-router';
import { AppWindow, Camera, RotateCcw, ShieldCheck } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { SectionPanel } from '../../components/SectionPanel';
import { colors } from '../../constants/theme';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

export default function Settings() {
  const { screenTimeStatus, selectedAppsConfigured, selectedAppsLabel, resetLocalDemo } = useBootyblock();

  return (
    <Screen>
      <Header title="Settings" subtitle="MVP controls and native setup status." />

      <View className="gap-4">
        <SectionPanel title="Screen Time">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-petal">
              <ShieldCheck size={23} stroke={colors.raspberry} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-black text-cocoa">{screenTimeStatus}</Text>
              <Text className="text-sm font-semibold text-mink">Family Controls entitlement required for distribution.</Text>
            </View>
          </View>
        </SectionPanel>

        <SectionPanel title="Blocked apps" subtitle={selectedAppsLabel}>
          <Button label={selectedAppsConfigured ? 'Change selection' : 'Choose apps'} icon={AppWindow} variant="secondary" onPress={() => router.push('/onboarding/apps')} />
        </SectionPanel>

        <SectionPanel title="Camera calibration" subtitle="Re-run the setup tips if squat counting feels off.">
          <Button label="Open calibration" icon={Camera} variant="secondary" onPress={() => router.push('/onboarding/calibration')} />
        </SectionPanel>

        <SectionPanel title="Local reset" subtitle="Clears onboarding and demo state on this device only.">
          <Button label="Reset MVP state" icon={RotateCcw} variant="ghost" onPress={resetLocalDemo} />
        </SectionPanel>
      </View>
    </Screen>
  );
}
