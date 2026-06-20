import * as Updates from 'expo-updates';
import { router } from 'expo-router';
import { AppWindow, Camera, Download, RotateCcw, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { SectionPanel } from '../../components/SectionPanel';
import { colors } from '../../constants/theme';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

export default function Settings() {
  const { screenTimeStatus, selectedAppsConfigured, selectedAppsLabel, resetLocalDemo } = useBootyblock();
  const [checkingForUpdate, setCheckingForUpdate] = useState(false);

  const checkForUpdate = async () => {
    if (!Updates.isEnabled) {
      Alert.alert(
        'Updates unavailable',
        'This development build uses Metro reloads. Install the preview build once to use one-tap updates.',
      );
      return;
    }

    setCheckingForUpdate(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        Alert.alert('Up to date', 'You already have the latest published version.');
        return;
      }

      await Updates.fetchUpdateAsync();
      Alert.alert('Update ready', 'Restart now to apply it?', [
        { text: 'Later', style: 'cancel' },
        { text: 'Restart', onPress: () => void Updates.reloadAsync() },
      ]);
    } catch {
      Alert.alert('Update failed', 'Could not check for an update. Check your connection and try again.');
    } finally {
      setCheckingForUpdate(false);
    }
  };

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

        <SectionPanel title="App updates" subtitle="Download UI and JavaScript fixes without reinstalling the app.">
          <Button
            label="Check for update"
            icon={Download}
            variant="secondary"
            loading={checkingForUpdate}
            onPress={() => void checkForUpdate()}
          />
        </SectionPanel>

        <SectionPanel title="Local reset" subtitle="Clears onboarding and demo state on this device only.">
          <Button label="Reset MVP state" icon={RotateCcw} variant="ghost" onPress={resetLocalDemo} />
        </SectionPanel>
      </View>
    </Screen>
  );
}
