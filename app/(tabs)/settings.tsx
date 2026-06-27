import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { AppWindow, BarChart3, Camera, FileText, LifeBuoy, RotateCcw, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { SectionPanel } from '../../components/SectionPanel';
import { StatisticsPanel } from '../../components/StatisticsPanel';
import { colors } from '../../constants/theme';
import { useBootyblock } from '../../lib/store/BootyblockProvider';

export default function Settings() {
  const { screenTimeStatus, selectedAppsConfigured, selectedAppsLabel, unlockHistory, resetAppData } = useBootyblock();
  const [statisticsVisible, setStatisticsVisible] = useState(false);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!statisticsVisible) return undefined;

    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [statisticsVisible]);

  const reset = () => {
    Alert.alert(
      'Reset Bootyblock?',
      'This clears your setup and immediately removes Bootyblock’s app restrictions on this iPhone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            void resetAppData().then(() => router.replace('/onboarding'));
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Header title="Settings" subtitle="Manage app blocking, calibration, privacy, and support." />

      <View className="gap-4">
        <SectionPanel title="Screen Time">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-petal">
              <ShieldCheck size={23} stroke={colors.raspberry} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-black text-cocoa">{screenTimeStatus}</Text>
              <Text className="text-sm font-semibold text-mink">Controls access to the apps you choose to block.</Text>
            </View>
          </View>
        </SectionPanel>

        <SectionPanel title="Blocked apps" subtitle={selectedAppsLabel}>
          <Button label={selectedAppsConfigured ? 'Change selection' : 'Choose apps'} icon={AppWindow} variant="secondary" onPress={() => router.push('/onboarding/apps')} />
        </SectionPanel>

        <SectionPanel title="Camera calibration" subtitle="Re-run the setup tips if squat counting feels off.">
          <Button label="Open calibration" icon={Camera} variant="secondary" onPress={() => router.push('/onboarding/setup')} />
        </SectionPanel>

        <SectionPanel title="Statistics" subtitle="Review your squat progress by day, week, or month.">
          <Button label="Statistics" icon={BarChart3} variant="secondary" onPress={() => setStatisticsVisible(true)} />
        </SectionPanel>

        <SectionPanel title="Privacy & support" subtitle="Learn how your data is handled or get help with Bootyblock.">
          <View className="gap-3">
            <Button
              label="Privacy Policy"
              icon={FileText}
              variant="secondary"
              onPress={() => void Linking.openURL('https://bootyblock.app/privacy')}
            />
            <Button
              label="Support"
              icon={LifeBuoy}
              variant="secondary"
              onPress={() => void Linking.openURL('https://bootyblock.app/support')}
            />
          </View>
        </SectionPanel>

        <SectionPanel title="Reset app data" subtitle="Clears onboarding, goals, and local session state on this device.">
          <Button label="Reset app data" icon={RotateCcw} variant="ghost" onPress={reset} />
        </SectionPanel>
      </View>

      <StatisticsPanel
        visible={statisticsVisible}
        history={unlockHistory}
        now={now}
        onClose={() => setStatisticsVisible(false)}
      />
    </Screen>
  );
}
