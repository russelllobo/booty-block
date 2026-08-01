import '../global.css';

import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionCallback } from 'expo-quick-actions/hooks';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, usePathname, useSegments } from 'expo-router';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

import { XpRewardToast } from '../components/XpRewardToast';
import {
  POSTHOG_API_KEY,
  POSTHOG_ENABLED,
  POSTHOG_HOST,
  screenAnalytics,
} from '../lib/analytics';
import { syncRoutineReminderNotification } from '../lib/services/routineReminder';
import { screenTimeService } from '../lib/services/screenTime';
import { tiktokService } from '../lib/services/tiktok';
import { BootyblockProvider, useBootyblock } from '../lib/store/BootyblockProvider';

const onboardingScreenOptions = {
  animation: 'none',
  freezeOnBlur: true,
  gestureEnabled: false,
} as const;

const FEEDBACK_DELETE_URL = 'mailto:r.lobo2003@gmail.com?subject=Deleting%20bootyblock%3F%20Tell%20us%20why';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

if (Platform.OS !== 'web') {
  void SplashScreen.preventAutoHideAsync();
}

function LaunchSplashController() {
  const { hydrated, subscriptionHydrated } = useBootyblock();
  const segments = useSegments();
  const destinationMounted = (segments as readonly string[]).length > 0;

  useEffect(() => {
    if (Platform.OS === 'web' || !hydrated || !subscriptionHydrated || !destinationMounted) return;

    void SplashScreen.hideAsync();
  }, [destinationMounted, hydrated, subscriptionHydrated]);

  return null;
}

function NotificationObserver() {
  const { hydrated, onboardingComplete, routineReminderTime } = useBootyblock();

  useEffect(() => {
    if (Platform.OS === 'web' || !hydrated) return;

    void syncRoutineReminderNotification(routineReminderTime).catch((error) => {
      if (__DEV__) {
        console.warn('Unable to sync the daily routine reminder', error);
      }
    });
  }, [hydrated, routineReminderTime]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    function openUnlockUrl(url: string | null) {
      const openedFromShield = Boolean(
        url?.startsWith('device-activity://')
        || url?.startsWith('bootyblock://unlock')
        || screenTimeService.consumeShieldOpenRequest(),
      );
      if (openedFromShield) {
        router.push(onboardingComplete
          ? { pathname: '/(tabs)', params: { openUnlock: '1' } }
          : '/onboarding');
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
        router.push(onboardingComplete
          ? { pathname: '/(tabs)', params: { openUnlock: '1' } }
          : '/onboarding');
      }
    });

    return () => subscription.remove();
  }, [onboardingComplete]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    function openNotification(notification: Notifications.Notification) {
      const url = notification.request.content.data?.url;
      if (url === '/plan' || url === '/(tabs)/plan') {
        router.push({ pathname: '/(tabs)', params: { openUnlock: '1' } });
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

function QuickActionObserver() {
  const { presentOneTimeOffer } = useBootyblock();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    void QuickActions.setItems([]).catch((error) => {
      if (__DEV__) {
        console.warn('Unable to clear dynamic quick actions', error);
      }
    });
  }, []);

  useQuickActionCallback((action) => {
    if (Platform.OS === 'web') return;

    if (action.id === 'deleting-feedback' || action.params?.action === 'deleting-feedback') {
      void Linking.openURL(FEEDBACK_DELETE_URL);
      return;
    }

    if (action.id === 'discount-offer' || action.params?.action === 'discount-offer') {
      void presentOneTimeOffer();
    }
  });

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

function TrackingAuthorizationRequester() {
  useEffect(() => {
    tiktokService.requestTrackingAuthorization();
  }, []);

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
            <LaunchSplashController />
            <TrackingAuthorizationRequester />
            <AnalyticsScreenTracker />
            <NotificationObserver />
            <QuickActionObserver />
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding/index" options={onboardingScreenOptions} />
              <Stack.Screen name="onboarding/welcome" options={onboardingScreenOptions} />
              <Stack.Screen name="onboarding/quiz" options={onboardingScreenOptions} />
              <Stack.Screen name="onboarding/usage" options={onboardingScreenOptions} />
              <Stack.Screen name="onboarding/insights" options={onboardingScreenOptions} />
              <Stack.Screen name="onboarding/setup" options={onboardingScreenOptions} />
              <Stack.Screen name="onboarding/calibration" options={onboardingScreenOptions} />
              <Stack.Screen name="onboarding/routine-reminder" options={onboardingScreenOptions} />
              <Stack.Screen name="onboarding/activity" options={onboardingScreenOptions} />
              <Stack.Screen name="onboarding/finish" options={onboardingScreenOptions} />
              <Stack.Screen name="onboarding/screentime" options={onboardingScreenOptions} />
              <Stack.Screen name="onboarding/notifications" options={onboardingScreenOptions} />
              <Stack.Screen name="onboarding/social-proof" options={onboardingScreenOptions} />
              <Stack.Screen name="onboarding/calculating" options={onboardingScreenOptions} />
              <Stack.Screen name="onboarding/wellbeing-plan" options={onboardingScreenOptions} />
              <Stack.Screen name="onboarding/apps" options={onboardingScreenOptions} />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="plan" />
              <Stack.Screen name="statistics" />
              <Stack.Screen name="session" />
              <Stack.Screen name="success" />
            </Stack>
            <XpRewardToast />
          </BootyblockProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </PostHogProvider>
  );
}
