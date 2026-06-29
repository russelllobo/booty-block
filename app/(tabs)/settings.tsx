import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { AppWindow, BarChart3, Camera, FileText, LifeBuoy, RefreshCcw, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react-native';
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
  const {
    screenTimeStatus,
    selectedAppsConfigured,
    selectedAppsLabel,
    unlockHistory,
    subscriptionConfigured,
    isSubscribed,
    subscriptionError,
    restorePurchases,
    presentSubscriptionPaywall,
    openSubscriptionManagement,
    resetAppData,
  } = useBootyblock();
  const [statisticsVisible, setStatisticsVisible] = useState(false);
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
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

  async function subscribeOrManage() {
    setSubscriptionBusy(true);
    try {
      if (isSubscribed) {
        await openSubscriptionManagement();
        return;
      }

      const subscribed = await presentSubscriptionPaywall();
      if (!subscribed && !subscriptionConfigured) {
        Alert.alert(
          'RevenueCat setup needed',
          subscriptionError ?? 'Add your RevenueCat API key before testing subscriptions on device.',
        );
      }
    } finally {
      setSubscriptionBusy(false);
    }
  }

  async function restore() {
    setSubscriptionBusy(true);
    try {
      const restored = await restorePurchases();
      Alert.alert(
        restored ? 'Subscription restored' : 'No active subscription found',
        restored
          ? 'Bootyblock Pro is active on this device.'
          : subscriptionError ?? 'No active Bootyblock Pro purchase was found for this App Store account.',
      );
    } finally {
      setSubscriptionBusy(false);
    }
  }

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

        <SectionPanel
          title="Subscription"
          subtitle={isSubscribed ? 'Bootyblock Pro is active.' : 'Subscribe to keep app blocking and squat-to-unlock sessions active.'}
        >
          <View className="gap-3">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-petal">
                <Sparkles size={23} stroke={colors.raspberry} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-black text-cocoa">
                  {isSubscribed ? 'Active' : subscriptionConfigured ? 'Not subscribed' : 'Setup needed'}
                </Text>
                <Text className="text-sm font-semibold text-mink">
                  {subscriptionConfigured
                    ? 'Managed by RevenueCat and the App Store.'
                    : 'Add a RevenueCat API key to enable purchases.'}
                </Text>
              </View>
            </View>
            <Button
              label={isSubscribed ? 'Manage subscription' : 'Subscribe'}
              icon={Sparkles}
              variant="secondary"
              loading={subscriptionBusy}
              onPress={subscribeOrManage}
            />
            <Button
              label="Restore purchases"
              icon={RefreshCcw}
              variant="ghost"
              loading={subscriptionBusy}
              onPress={restore}
            />
          </View>
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
