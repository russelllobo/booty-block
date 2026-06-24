import '../global.css';

import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

import { BootyblockProvider, useBootyblock } from '../lib/store/BootyblockProvider';

const onboardingScreenOptions = {
  animation: 'slide_from_right',
  gestureEnabled: false,
} as const;

function NotificationObserver() {
  const { onboardingComplete } = useBootyblock();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    function openUnlockUrl(url: string | null) {
      if (!url) return;
      const openedFromShield = url.startsWith('device-activity://') || url.startsWith('bootyblock://unlock');
      if (openedFromShield) {
        router.push(onboardingComplete ? '/(tabs)/plan' : '/onboarding');
      }
    }

    void Linking.getInitialURL().then(openUnlockUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => openUnlockUrl(url));

    return () => subscription.remove();
  }, [onboardingComplete]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    function openNotification(notification: Notifications.Notification) {
      const url = notification.request.content.data?.url;
      if (url === '/(tabs)/plan') {
        router.push('/(tabs)/plan');
      }
    }

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) {
      openNotification(lastResponse.notification);
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotification(response.notification);
    });

    return () => subscription.remove();
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <BootyblockProvider>
          <NotificationObserver />
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding/index" options={onboardingScreenOptions} />
            <Stack.Screen name="onboarding/permissions" options={onboardingScreenOptions} />
            <Stack.Screen name="onboarding/quiz" options={onboardingScreenOptions} />
            <Stack.Screen name="onboarding/usage" options={onboardingScreenOptions} />
            <Stack.Screen name="onboarding/insights" options={onboardingScreenOptions} />
            <Stack.Screen name="onboarding/setup" options={onboardingScreenOptions} />
            <Stack.Screen name="onboarding/calibration" options={onboardingScreenOptions} />
            <Stack.Screen name="onboarding/activity" options={onboardingScreenOptions} />
            <Stack.Screen name="onboarding/finish" options={onboardingScreenOptions} />
            <Stack.Screen name="onboarding/screentime" options={onboardingScreenOptions} />
            <Stack.Screen name="onboarding/notifications" options={onboardingScreenOptions} />
            <Stack.Screen name="onboarding/apps" options={onboardingScreenOptions} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="session" />
            <Stack.Screen name="success" />
          </Stack>
        </BootyblockProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
