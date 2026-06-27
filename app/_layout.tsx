import '../global.css';

import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { Stack, usePathname } from 'expo-router';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

import {
  POSTHOG_API_KEY,
  POSTHOG_ENABLED,
  POSTHOG_HOST,
  screenAnalytics,
} from '../lib/analytics';
import { screenTimeService } from '../lib/services/screenTime';
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
      const openedFromShield = Boolean(
        url?.startsWith('device-activity://')
        || url?.startsWith('bootyblock://unlock')
        || screenTimeService.consumeShieldOpenRequest(),
      );
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

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && screenTimeService.consumeShieldOpenRequest()) {
        router.push(onboardingComplete ? '/(tabs)/plan' : '/onboarding');
      }
    });

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

function AnalyticsScreenTracker() {
  const pathname = usePathname();
  const posthog = usePostHog();

  useEffect(() => {
    if (!pathname) return;
    screenAnalytics(posthog, pathname);
  }, [pathname, posthog]);

  return null;
}

export default function RootLayout() {
  return (
    <PostHogProvider
      apiKey={POSTHOG_API_KEY ?? ''}
      options={{
        host: POSTHOG_HOST,
        captureAppLifecycleEvents: POSTHOG_ENABLED,
        enableSessionReplay: false,
      }}
      autocapture={{
        captureScreens: false,
        captureTouches: false,
      }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <BootyblockProvider>
            <AnalyticsScreenTracker />
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
    </PostHogProvider>
  );
}
