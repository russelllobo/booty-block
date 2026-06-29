import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowUp, Bell } from 'lucide-react-native';
import { usePostHog } from 'posthog-react-native';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Button } from '../../components/Button';
import { OnboardingProgress } from '../../components/OnboardingProgress';
import { Screen } from '../../components/Screen';
import { SlidePanel } from '../../components/SlidePanel';
import { colors } from '../../constants/theme';
import { captureAnalytics, useOnboardingStepAnalytics } from '../../lib/analytics';

const notificationBackground = '#07070A';
const notificationGradient = ['#3A0F26', '#07070A'] as const;

export default function NotificationPermission() {
  const posthog = usePostHog();
  const [loading, setLoading] = useState(false);
  const { height } = useWindowDimensions();
  const promptHeight = Math.min(236, Math.max(178, height * 0.25));

  useOnboardingStepAnalytics(
    posthog,
    '/onboarding/notifications',
    'notification_permission',
    'Allow Bootyblock to send you notifications',
    29,
    30,
  );

  async function requestNotifications() {
    captureAnalytics(posthog, 'notification_permission_started');
    setLoading(true);
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Bootyblock notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: colors.bubble,
        });
      }

      if (Platform.OS !== 'web') {
        const result = await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: false, allowSound: true },
        });
        captureAnalytics(posthog, 'notification_permission_finished', {
          status: result.status,
          granted: result.granted,
        });
      } else {
        captureAnalytics(posthog, 'notification_permission_finished', {
          status: 'web_skipped',
          granted: false,
        });
      }
    } finally {
      setLoading(false);
      router.replace('/onboarding/apps');
    }
  }

  return (
    <Screen
      scroll={false}
      backgroundColor={notificationBackground}
      backgroundGradient={notificationGradient}
    >
      <StatusBar style="light" animated />
      <OnboardingProgress step={25} onBack={() => router.back()} showBar={false} dark />

      <SlidePanel>
        <View className="flex-1 justify-between">
          <View className="pt-8">
            <Text className="text-center text-sm font-bold leading-5 text-white/60">
              Let's set up Bootyblock!
            </Text>
            <Text className="mt-1 text-center text-[28px] font-bold leading-[33px] text-white">
              Allow Bootyblock to send you notifications
            </Text>
            <Text className="mt-2 text-center text-base font-semibold leading-6 text-white/55">
              We use this to let you unlock your apps when you want to use them.
            </Text>
          </View>

          <View className="items-center">
            <View
              className="w-full justify-center overflow-hidden rounded-[32px] border border-white/10 bg-black/45 px-5"
              style={[styles.placeholder, { height: promptHeight }]}
            >
              <View className="rounded-[24px] bg-white px-5 py-5">
                <View className="items-center">
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-raspberry">
                    <Bell size={25} stroke={colors.white} strokeWidth={2.5} />
                  </View>
                  <Text className="mt-4 text-center text-[17px] font-bold leading-6 text-cocoa">
                    "Bootyblock" Would Like to Send You Notifications
                  </Text>
                  <Text className="mt-2 text-center text-[13px] font-semibold leading-5 text-mink">
                    Notifications may include alerts, sounds, and icon badges.
                  </Text>
                </View>

                <View className="mt-5 flex-row overflow-hidden rounded-2xl border border-raspberry/15">
                  <View className="flex-1 items-center justify-center border-r border-raspberry/15 py-3">
                    <Text className="text-sm font-bold text-mink">Don't Allow</Text>
                  </View>
                  <View className="flex-1 items-center justify-center py-3">
                    <Text className="text-sm font-bold text-raspberry">Allow</Text>
                  </View>
                </View>
              </View>
            </View>
            <View className="mt-3 h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <ArrowUp size={25} stroke="#8CF6FF" strokeWidth={2.8} />
            </View>
          </View>

          <View>
            <Button
              label="Continue"
              icon={Bell}
              loading={loading}
              onPress={requestNotifications}
            />
          </View>
        </View>
      </SlidePanel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    shadowColor: '#8CF6FF',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 8,
  },
});
